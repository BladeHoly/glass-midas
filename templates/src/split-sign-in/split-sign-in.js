import { busy, fieldError, isEmail, revealButton, server, stepper } from '../shared/auth.js';

// Split sign in: email and password together, the classic way, so autofill fills both at once.

const panel = document.querySelector('.split-panel');
const show = stepper(panel);
const form = panel.querySelector('#step-sign-in');
const email = panel.querySelector('#email');
const password = panel.querySelector('#password');
const alert = panel.querySelector('#alert');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alert.textContent = '';
  const value = email.value.trim();
  fieldError(
    email,
    isEmail(value) ? '' : value ? "That doesn't look like an email address." : 'Enter your email.',
  );
  fieldError(password, password.value ? '' : 'Enter your password.');
  const wrong = panel.querySelector('[aria-invalid="true"]');
  if (wrong) return wrong.focus();
  try {
    await busy(e.submitter, () => server.signIn(value, password.value));
    show('step-done');
    // location.assign('/account');
  } catch (error) {
    alert.textContent = error.message;
    password.select();
  }
});

for (const input of [email, password]) {
  input.addEventListener('input', () => {
    fieldError(input, '');
    alert.textContent = '';
  });
}

revealButton(panel.querySelector('[data-action="reveal"]'));

panel.querySelector('[data-action="passkey"]').addEventListener('click', async (e) => {
  await busy(e.currentTarget, () => server.passkey());
  show('step-done');
});
