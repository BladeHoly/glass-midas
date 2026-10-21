import {
  createGlass,
  lensProfile,
  type GlassHandle,
  type GlassOptions,
  type GlassTier,
} from '@glass-midas/core';
import { contentRect, sourceSize, toBackdrop, type BackdropInput } from './backdrop.js';
import { FRAGMENT, VERTEX } from './shader.js';

export {
  contentRect,
  toBackdrop,
  type Backdrop,
  type BackdropInput,
  type Fit,
  type Rect,
} from './backdrop.js';

export interface WebGLGlassOptions extends Omit<GlassOptions, 'blur' | 'tier'> {
  /** What's behind the glass: an image, video or canvas element, or a custom backdrop. */
  backdrop: BackdropInput;
  /** Frost radius in px, applied before the bend. Default 1. */
  blur?: number;
  /** Color fringing: red bends (1 − chroma)× as far as green, blue (1 + chroma)×. Default 0. */
  chroma?: number;
  /** Tint as [r, g, b, amount], each 0 to 1. */
  tint?: [number, number, number, number];
}

export interface WebGLGlassHandle {
  /** `webgl`, or the core tier it fell back to. */
  readonly tier: 'webgl' | GlassTier;
  /** Merges options; also re-reads a still backdrop, so call it after redrawing one. */
  update(options: Partial<WebGLGlassOptions>): void;
  destroy(): void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader failed to compile');
  }
  return shader;
}

function texture(gl: WebGLRenderingContext, unit: number, filter: number) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Clamped and without mipmaps, WebGL 1 accepts textures of any size.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  return tex;
}

/**
 * Renders glass with WebGL over an explicit backdrop: the core's optics in floating point,
 * plus dispersion. Works in every browser with WebGL, and falls back to the core's
 * `createGlass` without WebGL, with a cross-origin backdrop, or under reduced transparency.
 */
export function createWebGLGlass(el: HTMLElement, initial: WebGLGlassOptions): WebGLGlassHandle {
  let options = initial;
  let core: GlassHandle | undefined;
  const fallback = () => {
    const { backdrop, blur, chroma, tint, ...rest } = options;
    core = createGlass(el, { ...rest, blur: blur === undefined ? undefined : `${blur}px` });
  };

  const reduced =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-transparency: reduce)').matches;
  const canvas = document.createElement('canvas');
  const gl = reduced ? null : canvas.getContext('webgl', { premultipliedAlpha: true });
  let program: WebGLProgram | null = null;
  try {
    if (gl) {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) program = null;
    }
  } catch {
    program = null;
  }
  if (!gl || !program) {
    fallback();
    return {
      get tier() {
        return core!.tier;
      },
      update: (next) => {
        options = { ...options, ...next };
        const { blur } = next;
        core!.update({
          ...next,
          blur: blur === undefined ? undefined : `${blur}px`,
        } as GlassOptions);
      },
      destroy: () => core!.destroy(),
    };
  }

  gl.useProgram(program);
  const u = (name: string) => gl.getUniformLocation(program!, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const bgTex = texture(gl, 0, gl.LINEAR);
  // The lookup table is interpolated in the shader: linear filtering would mix the byte halves.
  const lutTex = texture(gl, 1, gl.NEAREST);
  gl.uniform1i(u('u_bg'), 0);
  gl.uniform1i(u('u_lut'), 1);

  // The canvas sits behind the element's own content, inside its stacking context.
  const restore = { position: el.style.position, isolation: el.style.isolation };
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.style.isolation = 'isolate';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;border-radius:inherit';
  el.prepend(canvas);
  el.dataset.glassTier = 'webgl';

  let opticsKey = '';
  let frameKey = '';
  let uploaded = false;
  let frame = 0;
  let stopped = false;

  const teardown = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    el.style.position = restore.position;
    el.style.isolation = restore.isolation;
    delete el.dataset.glassTier;
  };

  const draw = () => {
    const backdrop = toBackdrop(options.backdrop);
    const [sw, sh] = sourceSize(backdrop.source);
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (!width || !height || !sw || !sh) return;
    const box = el.getBoundingClientRect();
    // Transforms scale the box; the shader works in the element's own CSS px.
    const zoom = box.width / width || 1;
    const content = contentRect(backdrop.rect(), sw, sh, backdrop.fit);

    // Defaults match the core's: kube.io's search box.
    const radius = Math.min(options.radius ?? 18, width / 2, height / 2);
    const bezel = Math.max(1, Math.min(options.bezel ?? 20, width / 2, height / 2));
    const optics = [
      bezel,
      options.thickness ?? 40,
      options.ior ?? 1.5,
      options.curvature ?? 4,
      Math.min(Math.max(options.magnify ?? 0, 0), 0.5),
      options.caustics ?? true,
    ] as const;

    // The backdrop is a DOM node (not serializable); its position is already in content.
    const { backdrop: _, ...settings } = options;
    const key = JSON.stringify([box.x, box.y, box.width, content, settings, width, height]);
    if (key === frameKey && uploaded && !backdrop.live) return;
    frameKey = key;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const opticsNow = JSON.stringify([optics, width, height]);
    if (opticsNow !== opticsKey) {
      opticsKey = opticsNow;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const shift = lensProfile(...optics);
      let unit = 0;
      for (const v of shift) unit = Math.max(unit, v);
      unit ||= 1;
      // 256 entries at 16 bits: R high byte, G low byte.
      const table = new Uint8Array(256 * 4);
      for (let i = 0; i < 256; i++) {
        const v = Math.round((shift[Math.round((i / 255) * 256)]! / unit) * 65535);
        table[i * 4] = v >> 8;
        table[i * 4 + 1] = v & 255;
        table[i * 4 + 3] = 255;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, lutTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, table);
      gl.uniform1f(u('u_unit'), unit);
      gl.uniform2f(u('u_size'), width, height);
      gl.uniform1f(u('u_radius'), radius);
      gl.uniform1f(u('u_round'), Math.min(Math.max(radius, bezel), width / 2, height / 2));
      gl.uniform1f(u('u_bezel'), bezel);
      gl.uniform1f(u('u_magnify'), optics[4]);
    }

    if (!uploaded || backdrop.live) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdrop.source);
      } catch {
        // A cross-origin source taints WebGL; the SVG tiers still work with it.
        teardown();
        fallback();
        return;
      }
      uploaded = true;
    }

    const angle = ((options.lightAngle ?? -60) * Math.PI) / 180;
    gl.uniform2f(u('u_light'), Math.cos(angle), Math.sin(angle));
    gl.uniform4f(
      u('u_content'),
      (content.x - box.x) / zoom,
      (content.y - box.y) / zoom,
      content.width / zoom,
      content.height / zoom,
    );
    gl.uniform1f(u('u_specular'), options.specular ?? 0.2);
    gl.uniform1f(u('u_saturation'), options.specularSaturation ?? 4);
    gl.uniform1f(u('u_blur'), options.blur ?? 1);
    gl.uniform1f(u('u_chroma'), options.chroma ?? 0);
    gl.uniform4fv(u('u_tint'), options.tint ?? [1, 1, 1, 0.05]);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // Redraw every frame only when something changed: moving, resizing, new options or a live
  // backdrop. Reading the box each frame keeps dragged and scrolled glass in sync.
  const loop = () => {
    if (stopped) return;
    frame = requestAnimationFrame(loop);
    draw();
  };
  loop();

  return {
    get tier() {
      return core?.tier ?? 'webgl';
    },
    update(next) {
      options = { ...options, ...next };
      // A still backdrop (an image, a canvas drawn once) may have changed: upload it again
      // on the next frame instead of every frame.
      uploaded = false;
      frameKey = '';
      if (core) {
        const { blur } = next;
        core.update({
          ...next,
          blur: blur === undefined ? undefined : `${blur}px`,
        } as GlassOptions);
      }
    },
    destroy() {
      if (core) core.destroy();
      else teardown();
    },
  };
}
