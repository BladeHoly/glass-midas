import {
  announce,
  bind,
  busy,
  fieldError,
  isEmail,
  revealButton,
  server,
  stepper,
} from '../shared/auth.js';

// Sign in, email first: the email decides the way in (a password, a passkey, a link by email).

const card = document.querySelector('.auth-card');
const show = stepper(card);
const emailForm = card.querySelector('#step-email');
const passwordForm = card.querySelector('#step-password');
const email = card.querySelector('#email');
const password = card.querySelector('#password');
const alert = card.querySelector('#password-alert');

emailForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = email.value.trim();
  if (!isEmail(value)) {
    fieldError(email, value ? "That doesn't look like an email address." : 'Enter your email.');
    email.focus();
    return;
  }
  fieldError(email, '');
  bind(card, 'email', value);
  show('step-password');
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  alert.textContent = '';
  if (!password.value) {
    alert.textContent = 'Enter your password.';
    password.setAttribute('aria-invalid', 'true');
    password.focus();
    return;
  }
  try {
    await busy(e.submitter, () => server.signIn(email.value.trim(), password.value));
    show('step-done');
    // location.assign('/account');
  } catch (error) {
    alert.textContent = error.message;
    password.setAttribute('aria-invalid', 'true');
    password.select();
  }
});

password.addEventListener('input', () => {
  password.removeAttribute('aria-invalid');
  alert.textContent = '';
});
email.addEventListener('input', () => fieldError(email, ''));

revealButton(card.querySelector('[data-action="reveal"]'));

for (const el of card.querySelectorAll('[data-action="change"]')) {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    password.value = '';
    show('step-email');
  });
}

card.querySelector('[data-action="link"]').addEventListener('click', async (e) => {
  await busy(e.currentTarget, () => server.sendLink(email.value.trim()));
  show('step-link');
});

const resend = card.querySelector('[data-action="resend"]');
resend.addEventListener('click', async () => {
  await busy(resend, () => server.sendLink(email.value.trim()));
  announce('We sent the link again.');
  // A pause before the next one, so a slow inbox doesn't turn into five emails.
  resend.disabled = true;
  let left = 30;
  const label = resend.textContent;
  const tick = setInterval(() => {
    resend.textContent = `Send it again in ${left--}s`;
    if (left < 0) {
      clearInterval(tick);
      resend.disabled = false;
      resend.textContent = label;
    }
  }, 1000);
});

card.querySelector('[data-action="passkey"]').addEventListener('click', async (e) => {
  await busy(e.currentTarget, () => server.passkey());
  show('step-done');
});
