import fs from 'node:fs';
import { act, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { StoreAnalytics } from './analytics/StoreAnalytics';
import { CartPage } from './cart/CartPage';
import { CheckoutPage } from './checkout/CheckoutPage';
import { OrderConfirmation } from './confirmation/OrderConfirmation';
import { ComparePieces } from './compare/ComparePieces';
import { SavedPieces } from './wishlist/SavedPieces';
import { AccountPage } from './account/AccountPage';
import { OrderDetail } from './order/OrderDetail';
import { ReturnRequest } from './returns/ReturnRequest';
import { CollectionGrid } from './collection/CollectionGrid';
import { ProductPage } from './product/ProductPage';
import { StoreHome } from './storefront/StoreHome';
import { ProductCatalogue } from './catalogue/ProductCatalogue';
import { StoreOverview } from './overview/StoreOverview';
import { OrdersTable } from './orders/OrdersTable';
import { ResetPassword } from './reset-password/ResetPassword';
import { SignIn } from './sign-in/SignIn';
import { ServiceStatus } from './status/ServiceStatus';
import { SignUp } from './sign-up/SignUp';
import { SplitSignIn } from './split-sign-in/SplitSignIn';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Template {
  name: string;
  title: string;
  shared: string[];
  art: string[];
}
const templates: Template[] = JSON.parse(fs.readFileSync('src/templates.json', 'utf8'));
const read = (file: string) => fs.readFileSync(`src/${file}`, 'utf8');
const react: Record<string, ComponentType> = {
  'sign-in': SignIn,
  'sign-up': SignUp,
  'reset-password': ResetPassword,
  'split-sign-in': SplitSignIn,
  orders: OrdersTable,
  catalogue: ProductCatalogue,
  overview: StoreOverview,
  analytics: StoreAnalytics,
  status: ServiceStatus,
  storefront: StoreHome,
  collection: CollectionGrid,
  product: ProductPage,
  cart: CartPage,
  checkout: CheckoutPage,
  confirmation: OrderConfirmation,
  compare: ComparePieces,
  wishlist: SavedPieces,
  account: AccountPage,
  order: OrderDetail,
  returns: ReturnRequest,
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe.each(templates)('$name', (t) => {
  const dir = `src/${t.name}`;
  const own = fs.readdirSync(dir);
  const html = read(`${t.name}/${t.name}.html`);

  it('has its page, its script and its React twin, named after it', () => {
    expect(own).toContain(`${t.name}.html`);
    expect(own).toContain(`${t.name}.js`);
    expect(own.filter((f) => f.endsWith('.tsx'))).toHaveLength(1);
    expect(react[t.name]).toBeDefined();
    // Names that differ only in case collide on Windows and macOS once copied side by side.
    const lower = own.map((f) => f.replace(/\.\w+$/, '').toLowerCase());
    const tsx = own
      .find((f) => f.endsWith('.tsx'))!
      .replace('.tsx', '')
      .toLowerCase();
    expect(lower.filter((n) => n === tsx)).toHaveLength(1);
  });

  it('has no file named like a shared one, which a copy would overwrite', () => {
    for (const file of own) expect(t.shared, file).not.toContain(file);
  });

  it('links what it uses, and shares only files that exist', () => {
    expect(html).toContain(`src="${t.name}.js"`);
    for (const file of t.shared.filter((f) => f !== 'tokens.css')) {
      expect(fs.existsSync(`src/shared/${file}`), file).toBe(true);
    }
    for (const sheet of html.matchAll(/href="([\w-]+\.css)"/g)) {
      expect([...t.shared, ...own]).toContain(sheet[1]);
    }
  });

  it('is a whole page: language, title, viewport', () => {
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toMatch(/<title>[^<]+ · Ondine<\/title>/);
    expect(html).toContain('name="viewport"');
  });

  it('labels every field and points every description at something real', () => {
    // Its markup only: no stylesheets or scripts to fetch.
    document.documentElement.innerHTML = html
      .replace(/^<!doctype html>/i, '')
      .replace(/<(link|script)[^>]*>(<\/script>)?/g, '');
    for (const input of document.querySelectorAll('input:not([type="hidden"]):not([hidden])')) {
      const label =
        input.closest('label') ??
        (input.id ? document.querySelector(`label[for="${input.id}"]`) : null) ??
        input.getAttribute('aria-label');
      expect(label, input.outerHTML).toBeTruthy();
    }
    for (const el of document.querySelectorAll('[aria-describedby]')) {
      for (const id of el.getAttribute('aria-describedby')!.split(' ')) {
        expect(document.getElementById(id), `${id} in ${t.name}`).not.toBeNull();
      }
    }
  });

  it('renders in React, with a heading', () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    const Template = react[t.name]!;
    act(() => root.render(<Template />));
    expect(host.querySelector('h1')?.textContent).toBeTruthy();
    expect(host.querySelector('.on-art')).not.toBeNull();
    act(() => root.unmount());
  });
});

it('names no other project: credits live in the README', () => {
  const names = /kube|ybouane|astryx|baymard|quilez|hobbs/i;
  for (const dir of fs.readdirSync('src', { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of fs.readdirSync(`src/${dir.name}`)) {
      expect(read(`${dir.name}/${file}`), `${dir.name}/${file}`).not.toMatch(names);
    }
  }
});
