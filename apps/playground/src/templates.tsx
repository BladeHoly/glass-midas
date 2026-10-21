// The React templates, for review next to their HTML twins: ?t=sign-in, &theme=light.
import '@glass-midas/components/styles.css';
import { tokensToCss } from '@glass-midas/core';
import { createRoot } from 'react-dom/client';
import '../../../templates/dist/shared/ondine.css';
import '../../../templates/dist/shared/auth.css';
import '../../../templates/src/split-sign-in/split-sign-in.css';
import { ResetPassword } from '../../../templates/src/reset-password/ResetPassword';
import { SignIn } from '../../../templates/src/sign-in/SignIn';
import { SignUp } from '../../../templates/src/sign-up/SignUp';
import { SplitSignIn } from '../../../templates/src/split-sign-in/SplitSignIn';

document.head.prepend(
  Object.assign(document.createElement('style'), { textContent: tokensToCss() }),
);

const params = new URLSearchParams(location.search);
const theme = params.get('theme');
if (theme) document.documentElement.dataset.theme = theme;

const templates = {
  'sign-in': SignIn,
  'sign-up': SignUp,
  'reset-password': ResetPassword,
  'split-sign-in': SplitSignIn,
};
const Template = templates[(params.get('t') ?? 'sign-in') as keyof typeof templates] ?? SignIn;
createRoot(document.getElementById('root')!).render(<Template />);
