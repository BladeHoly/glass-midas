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
  messageOf,
  server,
  useBusy,
  useStepFocus,
} from '../shared/AuthKit';

// Create an account: name, email and a password, checked as you go; then a code by email.

type Step = 'account' | 'verify' | 'done';
type Fields = { name: string; email: string; password: string };

const checks: Record<keyof Fields, (value: string) => string> = {
  name: (v) => (v.trim() ? '' : 'Enter your name.'),
  email: (v) => (isEmail(v.trim()) ? '' : 'Enter an email address, like ada@example.com.'),
  password: checkNewPassword,
};

export function SignUp() {
  const [step, setStep] = useState<Step>('account');
  const [fields, setFields] = useState<Fields>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [alert, setAlert] = useState('');
  const [status, setStatus] = useState('');
  const [busy, run] = useBusy();
  const stepRef = useStepFocus<HTMLDivElement>(step);

  // Errors show once a field is left, and clear as soon as it's right.
  const field = (name: keyof Fields) => ({
    name,
    value: fields[name],
    error: errors[name],
    onChange: (e: { target: { value: string } }) => {
      setFields({ ...fields, [name]: e.target.value });
      if (errors[name] && !checks[name](e.target.value)) setErrors({ ...errors, [name]: '' });
    },
    onBlur: () => fields[name] && setErrors({ ...errors, [name]: checks[name](fields[name]) }),
  });

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setAlert('');
    const found = Object.fromEntries(
      (Object.keys(checks) as (keyof Fields)[]).map((k) => [k, checks[k](fields[k])]),
    ) as Fields;
    setErrors(found);
    const first = (Object.keys(found) as (keyof Fields)[]).find((k) => found[k]);
    if (first) {
      stepRef.current?.querySelector<HTMLInputElement>(`input[name="${first}"]`)?.focus();
      return;
    }
    try {
      await run('create', async () => {
        await server.createAccount({ ...fields, email: fields.email.trim() });
        await server.sendCode(fields.email.trim());
      });
      setStep('verify');
    } catch (error) {
      setAlert(messageOf(error));
    }
  };

  return (
    <AuthPage status={status}>
      <div ref={stepRef}>
        {step === 'account' && (
          <form className="auth-form" aria-labelledby="account-title" noValidate onSubmit={create}>
            <div>
              <h1 id="account-title" tabIndex={-1}>
                Create your account
              </h1>
              <p className="auth-lede">Track your orders and hear about new pressings first.</p>
            </div>
            <p className="auth-alert" role="alert">
              {alert}
            </p>
            <Field label="Name" autoComplete="name" required {...field('name')} />
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              {...field('email')}
            />
            <PasswordField
              label="Password"
              autoComplete="new-password"
              minLength={10}
              required
              describedBy="password-rules"
              after={<PasswordRules id="password-rules" value={fields.password} />}
              {...field('password')}
            />
            <label className="gm-check-label">
              <input type="checkbox" className="gm-check" name="news" />
              <span>Tell me about new pieces and pressings</span>
            </label>
            <Button primary type="submit" busy={busy === 'create'}>
              Create account
            </Button>
            <p className="auth-row on-muted">
              <span>
                By creating an account you agree to the <a href="#">Terms</a> and{' '}
                <a href="#">Privacy policy</a>.
              </span>
            </p>
          </form>
        )}

        {step === 'verify' && (
          <div className="auth-form" role="group" aria-labelledby="verify-title">
            <div>
              <h1 id="verify-title" tabIndex={-1}>
                Check your email
              </h1>
              <p className="auth-lede">
                Enter the 6-digit code we sent to <strong>{fields.email.trim()}</strong>.
              </p>
            </div>
            <CodeField
              verify={async (code) => {
                await server.verifyCode(fields.email.trim(), code);
                setStep('done');
              }}
            />
            <div className="auth-row">
              <Button
                className="gm-chip-plain"
                busy={busy === 'resend'}
                onClick={async () => {
                  await run('resend', () => server.sendCode(fields.email.trim()));
                  setStatus('We sent a new code.');
                }}
              >
                Send a new code
              </Button>
              <Button className="gm-chip-plain" onClick={() => setStep('account')}>
                Change email
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <section className="auth-done" aria-labelledby="done-title">
            <span className="on-sigil" aria-hidden="true" />
            <h1 id="done-title" tabIndex={-1}>
              Welcome, {fields.name.trim().split(' ')[0]}
            </h1>
            <p>Your account is ready.</p>
            <a className="gm-chip gm-chip-primary" href="#">
              Start listening
            </a>
          </section>
        )}
      </div>

      {step === 'account' && (
        <p className="auth-switch">
          Already have an account? <a href="sign-in.html">Sign in</a>
        </p>
      )}
    </AuthPage>
  );
}
