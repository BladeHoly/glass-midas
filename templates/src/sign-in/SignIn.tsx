import { useEffect, useState, type FormEvent } from 'react';
import {
  AuthPage,
  Button,
  Field,
  PasswordField,
  isEmail,
  messageOf,
  server,
  useBusy,
  useStepFocus,
} from '../shared/AuthKit';

// Sign in, email first: the email decides the way in (a password, a passkey, a link by email).

type Step = 'email' | 'password' | 'link' | 'done';

export function SignIn() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [alert, setAlert] = useState('');
  const [status, setStatus] = useState('');
  const [busy, run] = useBusy();
  const [cooldown, setCooldown] = useState(0);
  const stepRef = useStepFocus<HTMLDivElement>(step);

  useEffect(() => {
    if (!cooldown) return;
    const tick = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(tick);
  }, [cooldown]);

  const toPassword = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!isEmail(value)) {
      setEmailError(value ? "That doesn't look like an email address." : 'Enter your email.');
      stepRef.current?.querySelector('input')?.focus();
      return;
    }
    setStep('password');
  };

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    const field = stepRef.current?.querySelector<HTMLInputElement>('input[name="password"]');
    if (!password) {
      setAlert('Enter your password.');
      return field?.focus();
    }
    try {
      await run('sign-in', () => server.signIn(email.trim(), password));
      setStep('done');
      // location.assign('/account');
    } catch (error) {
      setAlert(messageOf(error));
      field?.select();
    }
  };

  const sendLink = async () => {
    await run('link', () => server.sendLink(email.trim()));
    setStep('link');
  };

  const change = () => {
    setPassword('');
    setAlert('');
    setStep('email');
  };

  return (
    <AuthPage status={status}>
      <div ref={stepRef}>
        {step === 'email' && (
          <form
            className="auth-form"
            aria-labelledby="email-title"
            noValidate
            onSubmit={toPassword}
          >
            <div>
              <h1 id="email-title" tabIndex={-1}>
                Welcome back
              </h1>
              <p className="auth-lede">Sign in to your Ondine account.</p>
            </div>
            <Field
              label="Email"
              type="email"
              name="email"
              autoComplete="username webauthn"
              inputMode="email"
              required
              value={email}
              error={emailError}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
            />
            <Button primary type="submit">
              Continue
            </Button>
            <p className="auth-or">or</p>
            <Button
              busy={busy === 'passkey'}
              onClick={async () => {
                await run('passkey', () => server.passkey());
                setStep('done');
              }}
            >
              <KeyIcon />
              Sign in with a passkey
            </Button>
          </form>
        )}

        {step === 'password' && (
          <form className="auth-form" aria-labelledby="password-title" noValidate onSubmit={signIn}>
            <div>
              <h1 id="password-title" tabIndex={-1}>
                Enter your password
              </h1>
              <p className="auth-lede">Or get a link to sign in by email.</p>
            </div>
            {/* For password managers: which account this password belongs to. */}
            <input
              type="email"
              name="username"
              autoComplete="username"
              hidden
              readOnly
              value={email}
            />
            <div className="auth-who">
              <span>{email}</span>
              <Button onClick={change}>Change</Button>
            </div>
            <p className="auth-alert" id="password-alert" role="alert">
              {alert}
            </p>
            <PasswordField
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              describedBy="password-alert"
              aria-invalid={alert ? true : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                setAlert('');
              }}
            />
            <div className="auth-row">
              <a href="reset-password.html">Forgot your password?</a>
            </div>
            <Button primary type="submit" busy={busy === 'sign-in'}>
              Sign in
            </Button>
            <Button busy={busy === 'link'} onClick={sendLink}>
              Email me a sign-in link
            </Button>
          </form>
        )}

        {step === 'link' && (
          <section className="auth-done" aria-labelledby="link-title">
            <span className="on-sigil" aria-hidden="true" />
            <h1 id="link-title" tabIndex={-1}>
              Check your email
            </h1>
            <p>
              We sent a sign-in link to <strong>{email}</strong>. It works for 15 minutes. Not there
              in a minute? Look in spam.
            </p>
            <Button
              busy={busy === 'resend'}
              disabled={cooldown > 0}
              onClick={async () => {
                await run('resend', () => server.sendLink(email.trim()));
                setStatus('We sent the link again.');
                // A pause before the next one, so a slow inbox doesn't turn into five emails.
                setCooldown(30);
              }}
            >
              {cooldown ? `Send it again in ${cooldown}s` : 'Send it again'}
            </Button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                change();
              }}
            >
              Use a different email
            </a>
          </section>
        )}

        {step === 'done' && (
          <section className="auth-done" aria-labelledby="done-title">
            <span className="on-sigil" aria-hidden="true" />
            <h1 id="done-title" tabIndex={-1}>
              You're in
            </h1>
            <p>Taking you to your account…</p>
          </section>
        )}
      </div>

      {step === 'email' && (
        <p className="auth-switch">
          New to Ondine? <a href="sign-up.html">Create an account</a>
        </p>
      )}
    </AuthPage>
  );
}

function KeyIcon() {
  return (
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
  );
}
