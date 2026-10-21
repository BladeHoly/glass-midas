import type { GmOtp } from '@glass-midas/components';
import { GlassOtp } from '@glass-midas/react/forms';
import { GlassSurface } from '@glass-midas/react/surfaces';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

// What every auth template shares, for React: the page, fields wired for screen readers, the
// password reveal and rules, the code step, and `server`, a stand-in for your API that you replace.
// Load tokens.css, ondine.css and auth.css once in your app, and the glass-midas styles.

const wait = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A stand-in for your server, so the template runs as is. Replace each method with a call to your
 * API. In this demo, a password shorter than 8 characters is wrong, and so is the code 000000.
 */
export const server = {
  async signIn(email: string, password: string) {
    await wait();
    if (password.length < 8)
      throw new Error("That password isn't right. Try again, or get a link.");
  },
  async sendLink(email: string) {
    await wait();
  },
  async passkey() {
    // With a server: get a challenge, then
    // await navigator.credentials.get({ publicKey: options, mediation: 'optional' })
    // and send the result back to verify it.
    await wait();
  },
  async createAccount(account: { name: string; email: string; password: string }) {
    await wait();
    if (account.email.endsWith('@taken.example')) {
      throw new Error('There’s already an account with that email.');
    }
  },
  async sendCode(email: string) {
    await wait(500);
  },
  async verifyCode(email: string, code: string) {
    await wait();
    if (code === '000000') throw new Error("That code isn't right. Check the email and try again.");
  },
  async setPassword(email: string, code: string, password: string) {
    await wait();
  },
};

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.';

/** The brand: the sigil and the name. */
export function Brand() {
  return (
    <a className="on-brand" href="/">
      <span className="on-sigil" aria-hidden="true" />
      Ondine
    </a>
  );
}

/** The auth page: the tide behind, the brand on top, one frosted card, small links below. */
export function AuthPage({ children, status }: { children: ReactNode; status?: string }) {
  return (
    <>
      <div className="on-art on-art-tide" aria-hidden="true" />
      <div className="auth">
        <header className="auth-head">
          <Brand />
        </header>
        <main className="auth-main">
          <GlassSurface className="auth-card" material="frost" radius={28}>
            {children}
            <p className="on-sr-only" role="status">
              {status}
            </p>
          </GlassSurface>
        </main>
        <footer className="auth-foot">
          <a href="#">Help</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </footer>
      </div>
    </>
  );
}

/**
 * Moves focus into a step when it shows: its first field, or its heading. Put the ref on the
 * step's form or section, and pass the step as the key that changes.
 */
export function useStepFocus<T extends HTMLElement>(step: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    // Not on the first render: the page has only just opened.
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    (el?.querySelector<HTMLElement>('input:not([hidden])') ?? el?.querySelector('h1'))?.focus();
  }, [step]);
  return ref;
}

/** A primary or plain chip that shows a spinner while `busy`. */
export function Button({
  busy,
  primary,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`gm-chip${primary ? ' gm-chip-primary' : ''} ${className}`.trim()}
      aria-busy={busy || undefined}
    />
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Read after the error: rules, a hint. */
  describedBy?: string;
  end?: ReactNode;
  after?: ReactNode;
};

/** A labelled input with its error under it, tied together for screen readers. */
export function Field({ label, error, describedBy, end, after, id, ...input }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const errorId = `${inputId}-error`;
  const control = (
    <input
      id={inputId}
      className="gm-input"
      aria-invalid={error ? true : undefined}
      aria-describedby={[errorId, describedBy].filter(Boolean).join(' ')}
      {...input}
    />
  );
  return (
    <div className="gm-field">
      <label htmlFor={inputId}>{label}</label>
      {end ? (
        <div className="gm-input-group">
          {control}
          {end}
        </div>
      ) : (
        control
      )}
      <p className="gm-field-error" id={errorId}>
        {error}
      </p>
      {after}
    </div>
  );
}

/** A password field with the eye button that shows it as text. */
export function PasswordField(props: Omit<FieldProps, 'type' | 'end'>) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <Field
      {...props}
      type={shown ? 'text' : 'password'}
      end={
        <button
          ref={ref}
          className="gm-chip gm-chip-plain gm-chip-round"
          type="button"
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          onClick={() => {
            setShown(!shown);
            ref.current?.parentElement?.querySelector('input')?.focus();
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      }
    />
  );
}

const rules = {
  length: (v: string) => v.length >= 10,
  mixed: (v: string) => /[\d\W_]/.test(v),
};

/** A new password's error, or "" when it will do. */
export const checkNewPassword = (value: string) =>
  rules.length(value) ? '' : 'Use at least 10 characters.';

/** A new password's rules, ticked off as they're met. */
export function PasswordRules({ id, value }: { id: string; value: string }) {
  return (
    <ul className="auth-rules" id={id}>
      <li data-met={rules.length(value) || undefined}>At least 10 characters</li>
      <li data-met={rules.mixed(value) || undefined}>A number or a symbol helps</li>
    </ul>
  );
}

/**
 * The code we emailed, as boxes: `verify` runs once every box is filled, with no button to
 * press. A wrong code clears the boxes and says so.
 */
export function CodeField({ verify }: { verify: (code: string) => Promise<void> }) {
  const otp = useRef<GmOtp>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  // Back in the boxes once a check is over, to type the code again.
  useEffect(() => {
    if (!checking) otp.current?.querySelector('input')?.focus();
  }, [checking]);
  return (
    <div className="gm-field">
      <label htmlFor="code" className="on-sr-only">
        Code
      </label>
      <GlassOtp
        ref={otp}
        onComplete={async (e) => {
          setError('');
          setChecking(true);
          try {
            await verify(e.detail.value);
          } catch (failure) {
            setError(messageOf(failure));
            const input = otp.current?.querySelector('input');
            if (input) input.value = '';
          } finally {
            setChecking(false);
          }
        }}
      >
        <input
          id="code"
          name="code"
          maxLength={6}
          disabled={checking}
          aria-invalid={error ? true : undefined}
          aria-describedby="code-error"
        />
      </GlassOtp>
      <p className="gm-field-error" id="code-error" role="alert">
        {error}
      </p>
    </div>
  );
}

/** Runs an action with a flag set while it runs, for a busy button. */
export function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async <T,>(which: string, action: () => Promise<T>) => {
    setBusy(which);
    try {
      return await action();
    } finally {
      setBusy(null);
    }
  };
  return [busy, run] as const;
}
