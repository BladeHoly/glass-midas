import { useState, type FormEvent } from 'react';
import {
  AuthPage,
  Button,
  CodeField,
  Field,
  PasswordField,
  PasswordRules,
  checkNewPassword,
  isEmail,
  server,
  useBusy,
  useStepFocus,
} from '../shared/AuthKit';

// Reset a password: the email, a code sent to it, then the new password.

type Step = 'email' | 'code' | 'password' | 'done';

export function ResetPassword() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, run] = useBusy();
  const stepRef = useStepFocus<HTMLDivElement>(step);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!isEmail(value)) {
      setEmailError(value ? "That doesn't look like an email address." : 'Enter your email.');
      stepRef.current?.querySelector('input')?.focus();
      return;
    }
    // The same answer whether or not there's an account: no one learns who has one.
    await run('send', () => server.sendCode(value));
    setStep('code');
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const message = checkNewPassword(password);
    setPasswordError(message);
    if (message)
      return stepRef.current?.querySelector<HTMLInputElement>('input[name="password"]')?.focus();
    await run('save', () => server.setPassword(email.trim(), code, password));
    setStep('done');
  };

  return (
    <AuthPage status={status}>
      <div ref={stepRef}>
        {step === 'email' && (
          <form className="auth-form" aria-labelledby="email-title" noValidate onSubmit={sendCode}>
            <div>
              <h1 id="email-title" tabIndex={-1}>
                Reset your password
              </h1>
              <p className="auth-lede">We'll email you a code to set a new one.</p>
            </div>
            <Field
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              error={emailError}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
            />
            <Button primary type="submit" busy={busy === 'send'}>
              Send the code
            </Button>
          </form>
        )}

        {step === 'code' && (
          <div className="auth-form" role="group" aria-labelledby="code-title">
            <div>
              <h1 id="code-title" tabIndex={-1}>
                Enter the code
              </h1>
              <p className="auth-lede">
                If <strong>{email.trim()}</strong> has an account, a 6-digit code is on its way.
              </p>
            </div>
            <CodeField
              verify={async (value) => {
                await server.verifyCode(email.trim(), value);
                setCode(value);
                setStep('password');
              }}
            />
            <div className="auth-row">
              <Button
                className="gm-chip-plain"
                busy={busy === 'resend'}
                onClick={async () => {
                  await run('resend', () => server.sendCode(email.trim()));
                  setStatus('We sent a new code.');
                }}
              >
                Send a new code
              </Button>
              <Button className="gm-chip-plain" onClick={() => setStep('email')}>
                Change email
              </Button>
            </div>
          </div>
        )}

        {step === 'password' && (
          <form className="auth-form" aria-labelledby="password-title" noValidate onSubmit={save}>
            <div>
              <h1 id="password-title" tabIndex={-1}>
                Choose a new password
              </h1>
              <p className="auth-lede">You'll use it next time you sign in.</p>
            </div>
            <input
              type="email"
              name="username"
              autoComplete="username"
              hidden
              readOnly
              value={email}
            />
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={password}
              error={passwordError}
              describedBy="password-rules"
              after={<PasswordRules id="password-rules" value={password} />}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError && !checkNewPassword(e.target.value)) setPasswordError('');
              }}
            />
            <Button primary type="submit" busy={busy === 'save'}>
              Save password
            </Button>
          </form>
        )}

        {step === 'done' && (
          <section className="auth-done" aria-labelledby="done-title">
            <span className="on-sigil" aria-hidden="true" />
            <h1 id="done-title" tabIndex={-1}>
              Password saved
            </h1>
            <p>You're signed in. We emailed you to say the password changed.</p>
            <a className="gm-chip gm-chip-primary" href="#">
              Go to your account
            </a>
          </section>
        )}
      </div>

      {step === 'email' && (
        <p className="auth-switch">
          Remembered it? <a href="sign-in.html">Sign in</a>
        </p>
      )}
    </AuthPage>
  );
}
