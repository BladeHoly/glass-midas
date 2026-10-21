// GLSL ES 1.0 (WebGL 1) for the widest support.

export const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5); // top-left origin, like the DOM
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// The same optics as the core's SVG map, evaluated per pixel in floating point: no 8-bit steps,
// so thick glass folds without banding. The Snell profile across the bezel comes from the core
// as a 16-bit lookup table. The rim light is the core's: a hairline 1.25 px in,
// as bright as (n·L)², showing a saturated copy of the backdrop plus a faint white line.
export const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_bg;
uniform sampler2D u_lut;  // 256 × 1: shift / u_unit, high byte in R, low byte in G
uniform vec2 u_size;      // element, CSS px
uniform vec4 u_content;   // backdrop pixels relative to the element: x, y, width, height
uniform float u_radius;   // true corner radius
uniform float u_round;    // corner radius for bend directions: max(radius, bezel)
uniform float u_bezel;
uniform float u_unit;     // px at the top of the lookup table
uniform float u_magnify;
uniform vec2 u_light;
uniform float u_specular;    // white hairline opacity
uniform float u_saturation;  // backdrop saturation through the hairline
uniform float u_blur;        // frost radius, px
uniform float u_chroma;      // dispersion: red bends (1 - chroma)x, blue (1 + chroma)x
uniform vec4 u_tint;         // rgb, alpha = mix amount

float lut(float i) {
  vec4 t = texture2D(u_lut, vec2((i + 0.5) / 256.0, 0.5));
  return (t.r * 255.0 * 256.0 + t.g * 255.0) / 65535.0;
}

float shiftAt(float inset) {
  float t = clamp(inset / u_bezel, 0.0, 1.0) * 255.0;
  float k = floor(t);
  return mix(lut(k), lut(min(k + 1.0, 255.0)), t - k) * u_unit;
}

vec3 backdrop(vec2 p) {
  return texture2D(u_bg, (p - u_content.xy) / u_content.zw).rgb;
}

// Frost: a 17-tap disc around the sample.
vec3 frost(vec2 p) {
  if (u_blur < 0.25) return backdrop(p);
  vec3 sum = backdrop(p);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    vec2 d = vec2(cos(a), sin(a)) * u_blur;
    sum += backdrop(p + d * 0.5) + backdrop(p + d);
  }
  return sum / 17.0;
}

vec3 vivid(vec3 c, float s) {
  return mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, s);
}

void main() {
  vec2 local = v_uv * u_size;
  vec2 p = local - u_size * 0.5;
  vec2 a = abs(p);
  vec2 half_ = u_size * 0.5;

  vec2 q = a - (half_ - u_radius);
  float inset = u_radius - length(max(q, 0.0)) - min(max(q.x, q.y), 0.0);
  float mask = clamp(inset + 0.5, 0.0, 1.0);
  if (mask <= 0.0) discard;

  // Outward direction of the smoothed rectangle, as in the core.
  vec2 c = a - (half_ - u_round);
  vec2 n = (c.x > 0.0 && c.y > 0.0) ? normalize(c) : (c.x > c.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  n *= sign(p);

  float d = inset < u_bezel ? shiftAt(inset) : 0.0;
  vec2 shift = -n * d - u_magnify * p;

  vec3 col;
  if (u_chroma > 0.0) {
    col = vec3(
      frost(local + shift * (1.0 - u_chroma)).r,
      frost(local + shift).g,
      frost(local + shift * (1.0 + u_chroma)).b
    );
  } else {
    col = frost(local + shift);
  }
  col = mix(col, u_tint.rgb, u_tint.a);

  float line = max(0.0, 1.0 - (inset - 1.25) * (inset - 1.25));
  float facing = dot(n, u_light);
  float rim = line * facing * facing;
  col = mix(col, vivid(col, u_saturation), rim);
  col = mix(col, vec3(1.0), rim * u_specular);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * mask, mask);
}`;
