// The React templates, for review next to their HTML twins: ?t=sign-in, &theme=light.
import '@glass-midas/components/styles.css';
import { tokensToCss } from '@glass-midas/core';
import { createRoot } from 'react-dom/client';
import '../../../templates/dist/shared/ondine.css';
import '../../../templates/dist/shared/auth.css';
import '../../../templates/dist/shared/app.css';
import '../../../templates/src/catalogue/catalogue.css';
import '../../../templates/dist/shared/charts.css';
import '../../../templates/dist/shared/dashboard.css';
import '../../../templates/src/status/status.css';
import '../../../templates/dist/shared/shop.css';
import '../../../templates/src/storefront/storefront.css';
import '../../../templates/src/collection/collection.css';
import '../../../templates/src/product/product.css';
import '../../../templates/src/cart/cart.css';
import '../../../templates/src/checkout/checkout.css';
import '../../../templates/src/confirmation/confirmation.css';
import '../../../templates/src/compare/compare.css';
import '../../../templates/src/split-sign-in/split-sign-in.css';
import { StoreAnalytics } from '../../../templates/src/analytics/StoreAnalytics';
import { StoreOverview } from '../../../templates/src/overview/StoreOverview';
import { ServiceStatus } from '../../../templates/src/status/ServiceStatus';
import { CartPage } from '../../../templates/src/cart/CartPage';
import { CheckoutPage } from '../../../templates/src/checkout/CheckoutPage';
import { OrderConfirmation } from '../../../templates/src/confirmation/OrderConfirmation';
import { ComparePieces } from '../../../templates/src/compare/ComparePieces';
import { SavedPieces } from '../../../templates/src/wishlist/SavedPieces';
import { AccountPage } from '../../../templates/src/account/AccountPage';
import { OrderDetail } from '../../../templates/src/order/OrderDetail';
import { ReturnRequest } from '../../../templates/src/returns/ReturnRequest';
import { OrderAdmin } from '../../../templates/src/manage-order/OrderAdmin';
import { CollectionGrid } from '../../../templates/src/collection/CollectionGrid';
import { ProductPage } from '../../../templates/src/product/ProductPage';
import { StoreHome } from '../../../templates/src/storefront/StoreHome';
import { ProductCatalogue } from '../../../templates/src/catalogue/ProductCatalogue';
import { OrdersTable } from '../../../templates/src/orders/OrdersTable';
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
  'manage-order': OrderAdmin,
};
const Template = templates[(params.get('t') ?? 'sign-in') as keyof typeof templates] ?? SignIn;
createRoot(document.getElementById('root')!).render(<Template />);
