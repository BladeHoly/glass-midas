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

// Create an account: name, email and a password, checked as you go; then a code by email.

const card = document.querySelector('.auth-card');
const show = stepper(card);
const form = card.querySelector('#step-account');
const name = card.querySelector('#name');
const email = card.querySelector('#email');
const password = card.querySelector('#password');
const alert = card.querySelector('#account-alert');
const checkPassword = passwordRules(card, password);

const checks = [
  [name, (v) => (v.trim() ? '' : 'Enter your name.')],
  [email, (v) => (isEmail(v.trim()) ? '' : 'Enter an email address, like ada@example.com.')],
  [password, checkPassword],
];
for (const [input, check] of checks) {
  input.addEventListener('blur', () => input.value && fieldError(input, check(input.value)));
  input.addEventListener('input', () => {
    if (input.hasAttribute('aria-invalid') && !check(input.value)) fieldError(input, '');
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alert.textContent = '';
  let first;
  for (const [input, check] of checks) {
    const message = check(input.value);
    fieldError(input, message);
    if (message) first ??= input;
  }
  if (first) return first.focus();
  try {
    await busy(e.submitter, async () => {
      await server.createAccount({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
      });
      await server.sendCode(email.value.trim());
    });
    bind(card, 'email', email.value.trim());
    bind(card, 'name', name.value.trim().split(' ')[0]);
    show('step-verify');
  } catch (error) {
    alert.textContent = error.message;
    email.focus();
  }
});

revealButton(card.querySelector('[data-action="reveal"]'));

codeStep(card, {
  verify: (value) => server.verifyCode(email.value.trim(), value),
  resend: () => server.sendCode(email.value.trim()),
  done: () => show('step-done'),
});

card.querySelector('[data-action="back"]').addEventListener('click', () => show('step-account'));
