import '@glass-midas/components';
import { image } from '../shared/cart.js';
import { collections, products } from '../shared/data.js';
import { cardSwatches, escape, productCard, shopShell } from '../shared/shop.js';

// The store's home: the collections, each shown by one of its pieces, and the most listened to.

const COVER = {
  listen: ['tide', 'Moonstone'],
  room: ['choir', 'Walnut'],
  ritual: ['orbit', 'Walnut'],
};
const FEATURED = ['choir', 'lantern', 'ripple', 'ember'];

document.querySelector('#collections').innerHTML = Object.entries(collections)
  .map(([id, c]) => {
    const [piece, finish] = COVER[id];
    return `<li class="home-collection">
      <img src="${image(piece, finish)}" alt="" width="800" height="800" loading="lazy">
      <div><h3><a href="collection.html?c=${id}">${escape(c.name)}</a></h3><p>${escape(c.blurb)}</p></div>
    </li>`;
  })
  .join('');

const featured = document.querySelector('#featured');
featured.innerHTML = FEATURED.map((id) => productCard(products.find((p) => p.id === id))).join('');
cardSwatches(featured);

shopShell();
