import { GlassSurface } from '@glass-midas/react/surfaces';
import { useRef, useState, type FormEvent } from 'react';
import {
  Brand,
  Button,
  Field,
  PasswordField,
  isEmail,
  messageOf,
  server,
  useBusy,
} from '../shared/AuthKit';

// Split sign in: email and password together, the classic way, so autofill fills both at once.
// Load split-sign-in.css too.

export function SplitSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [alert, setAlert] = useState('');
  const [done, setDone] = useState(false);
  const [busy, run] = useBusy();
  const form = useRef<HTMLFormElement>(null);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setAlert('');
    const value = email.trim();
    const found = {
      email: isEmail(value)
        ? ''
        : value
          ? "That doesn't look like an email address."
          : 'Enter your email.',
      password: password ? '' : 'Enter your password.',
    };
    setErrors(found);
    const first = found.email ? 'email' : found.password ? 'password' : '';
    if (first)
      return form.current?.querySelector<HTMLInputElement>(`input[name="${first}"]`)?.focus();
    try {
      await run('sign-in', () => server.signIn(value, password));
      setDone(true);
      // location.assign('/account');
    } catch (error) {
      setAlert(messageOf(error));
      form.current?.querySelector<HTMLInputElement>('input[name="password"]')?.select();
    }
  };

  return (
    <>
      <div className="on-art on-art-resonance" aria-hidden="true" />
      <div className="split">
        <GlassSurface className="split-panel" material="frost" radius={32}>
          <Brand />
          <main className="split-main">
            {done ? (
              <section className="auth-done" aria-labelledby="done-title">
                <span className="on-sigil" aria-hidden="true" />
                <h1 id="done-title" tabIndex={-1} ref={(h) => h?.focus()}>
                  You're in
                </h1>
                <p>Taking you to your account…</p>
              </section>
            ) : (
              <form
                ref={form}
                className="auth-form"
                aria-labelledby="title"
                noValidate
                onSubmit={signIn}
              >
                <div>
                  <h1 id="title" className="on-display" tabIndex={-1}>
                    Welcome back
                  </h1>
                  <p className="auth-lede">Sign in to your Ondine account.</p>
                </div>
                <p className="auth-alert" role="alert">
                  {alert}
                </p>
                <Field
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="username webauthn"
                  inputMode="email"
                  required
                  value={email}
                  error={errors.email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors({ ...errors, email: '' });
                    setAlert('');
                  }}
                />
                <PasswordField
                  label="Password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  error={errors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors({ ...errors, password: '' });
                    setAlert('');
                  }}
                />
                <div className="auth-row">
                  <label className="gm-check-label">
                    <input type="checkbox" className="gm-check" name="remember" defaultChecked />
                    <span>Keep me signed in</span>
                  </label>
                  <a href="reset-password.html">Forgot it?</a>
                </div>
                <Button primary type="submit" busy={busy === 'sign-in'}>
                  Sign in
                </Button>
                <p className="auth-or">or</p>
                <Button
                  busy={busy === 'passkey'}
                  onClick={async () => {
                    await run('passkey', () => server.passkey());
                    setDone(true);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="4" />
                    <path d="M10.8 10.8 20 20M16 16l2-2M18.5 18.5l2-2" />
                  </svg>
                  Sign in with a passkey
                </Button>
                <p className="auth-switch">
                  New to Ondine? <a href="sign-up.html">Create an account</a>
                </p>
              </form>
            )}
          </main>
          <footer className="split-foot">
            <a href="#">Help</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </footer>
        </GlassSurface>

        <figure className="split-art">
          <figcaption>
            <span className="split-quote">Every piece carries its own resonance.</span>
            <span className="on-muted">Drawn from the frequencies each speaker was tuned to.</span>
          </figcaption>
        </figure>
      </div>
    </>
  );
}
