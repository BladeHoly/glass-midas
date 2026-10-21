// What every auth template shares: moving between steps, the password reveal, field errors, busy
// buttons, and `server`, a stand-in for your API that you replace.

/** Shows one step of the card and hides the rest; focus goes to its first field, or its heading. */
export function stepper(root) {
  return (id) => {
    for (const step of root.querySelectorAll('.auth-step')) step.hidden = step.id !== id;
    for (const el of root.querySelectorAll('[data-show]')) el.hidden = el.dataset.show !== id;
    const step = root.querySelector(`#${id}`);
    (step?.querySelector('input:not([hidden])') ?? step?.querySelector('h1'))?.focus();
  };
}

/** Writes a value into every `[data-bind="name"]`, and into inputs with `data-bind-value`. */
export function bind(root, name, value) {
  for (const el of root.querySelectorAll(`[data-bind="${name}"]`)) el.textContent = value;
  for (const el of root.querySelectorAll(`[data-bind-value="${name}"]`)) el.value = value;
}

/** Shows an error under a field (or clears it with ""), the way screen readers expect. */
export function fieldError(input, message) {
  const error = document.getElementById(input.getAttribute('aria-describedby')?.split(' ')[0]);
  if (error) error.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

/** The eye button next to a password: shows it as text and back. */
export function revealButton(button) {
  const input = button.parentElement.querySelector('input');
  button.addEventListener('click', () => {
    const shown = input.type === 'password';
    input.type = shown ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(shown));
    button.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
    input.focus();
  });
}

/** Runs `action` with the button busy (a spinner, no double submits). */
export async function busy(button, action) {
  button.setAttribute('aria-busy', 'true');
  try {
    return await action();
  } finally {
    button.removeAttribute('aria-busy');
  }
}

/** Says something to screen readers without showing it. */
export function announce(message) {
  const status = document.getElementById('status');
  if (status) status.textContent = message;
}

/**
 * A new password's rules, ticked off in its list as they're met. Returns the check: an error
 * message, or "" when the password will do.
 */
export function passwordRules(root, input) {
  const rules = {
    length: (v) => v.length >= 10,
    mixed: (v) => /[\d\W_]/.test(v),
  };
  input.addEventListener('input', () => {
    for (const li of root.querySelectorAll('[data-rule]')) {
      li.toggleAttribute('data-met', rules[li.dataset.rule](input.value));
    }
    if (input.hasAttribute('aria-invalid') && rules.length(input.value)) fieldError(input, '');
  });
  return (value) => (rules.length(value) ? '' : 'Use at least 10 characters.');
}

/**
 * A code step: `verify` runs once every box is filled, with no button to press. A wrong code
 * clears the boxes and says so; `resend` sends a new one.
 */
export function codeStep(root, { verify, resend, done }) {
  const otp = root.querySelector('gm-otp');
  const input = otp.querySelector('input');
  const error = document.getElementById(input.getAttribute('aria-describedby'));
  otp.addEventListener('gm-complete', async (e) => {
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    input.disabled = true;
    try {
      await verify(e.detail.value);
      done(e.detail.value);
    } catch (failure) {
      error.textContent = failure.message;
      input.setAttribute('aria-invalid', 'true');
      input.value = '';
      input.disabled = false;
      input.focus();
      otp.sync();
    } finally {
      input.disabled = false;
    }
  });
  root.querySelector('[data-action="resend"]').addEventListener('click', async (e) => {
    await busy(e.currentTarget, resend);
    announce('We sent a new code.');
    input.value = '';
    otp.sync();
    input.focus();
  });
}

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const wait = (ms = 700) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A stand-in for your server, so the template runs as is. Replace each method with a call to your
 * API. In this demo, a password shorter than 8 characters is wrong, and so is the code 000000.
 */
export const server = {
  async signIn(email, password) {
    await wait();
    if (password.length < 8)
      throw new Error("That password isn't right. Try again, or get a link.");
  },
  async sendLink(email) {
    await wait();
  },
  async passkey() {
    // With a server: get a challenge, then
    // await navigator.credentials.get({ publicKey: options, mediation: 'optional' })
    // and send the result back to verify it.
    await wait();
  },
  async createAccount({ name, email, password }) {
    await wait();
    if (email.endsWith('@taken.example'))
      throw new Error('There’s already an account with that email.');
  },
  async sendCode(email) {
    await wait(500);
  },
  async verifyCode(email, code) {
    await wait();
    if (code === '000000') throw new Error("That code isn't right. Check the email and try again.");
  },
  async setPassword(email, code, password) {
    await wait();
  },
};
