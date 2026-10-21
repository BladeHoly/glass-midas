import {
  bind,
  busy,
  codeStep,
  fieldError,
  isEmail,
  passwordRules,
  revealButton,
  server,
  stepper,
} from '../shared/auth.js';

// Reset a password: the email, a code sent to it, then the new password.

const card = document.querySelector('.auth-card');
const show = stepper(card);
const email = card.querySelector('#email');
const password = card.querySelector('#password');
let verified = '';

card.querySelector('#step-email').addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = email.value.trim();
  if (!isEmail(value)) {
    fieldError(email, value ? "That doesn't look like an email address." : 'Enter your email.');
    return email.focus();
  }
  fieldError(email, '');
  // The same answer whether or not there's an account: no one learns who has one.
  await busy(e.submitter, () => server.sendCode(value));
  bind(card, 'email', value);
  show('step-code');
});
email.addEventListener('input', () => fieldError(email, ''));

codeStep(card, {
  verify: (value) => server.verifyCode(email.value.trim(), value),
  resend: () => server.sendCode(email.value.trim()),
  done: (value) => {
    verified = value;
    show('step-password');
  },
});
card.querySelector('[data-action="back"]').addEventListener('click', () => show('step-email'));

const checkPassword = passwordRules(card, password);
revealButton(card.querySelector('[data-action="reveal"]'));

card.querySelector('#step-password').addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = checkPassword(password.value);
  if (message) {
    fieldError(password, message);
    return password.focus();
  }
  await busy(e.submitter, () => server.setPassword(email.value.trim(), verified, password.value));
  show('step-done');
});
