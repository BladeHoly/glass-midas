import { GlassSurface } from '@glass-midas/react/surfaces';
import { ProductCard, ShopShell } from '../shared/ShopKit';
import { extra, image } from '../shared/cart.js';
import { collections, products } from '../shared/data.js';

// The store's home: a hero over the art with one frosted card on it, the collections, the most
// listened to, and the story of the figures. Load storefront.css too.

const COVER: Record<string, [string, string]> = {
  listen: ['tide', 'Moonstone'],
  room: ['choir', 'Walnut'],
  ritual: ['orbit', 'Walnut'],
};
const FEATURED = ['choir', 'lantern', 'ripple', 'ember'];

export function StoreHome() {
  return (
    <ShopShell>
      <main id="main" className="shop-main shop-wrap">
        <section className="home-hero" aria-labelledby="hero-title">
          <img
            className="home-hero-art"
            src="art/resonance-dark.webp"
            alt=""
            width={1000}
            height={1300}
          />
          <div className="home-hero-copy">
            <p className="home-eyebrow">New · Tide in Verdigris</p>
            <h1 id="hero-title" className="on-display">
              Sound you can see.
            </h1>
            <p>
              Every Ondine piece is tuned until its plate draws a figure. Headphones, speakers and
              the things around a record, made to be listened to for years.
            </p>
            <div className="home-actions">
              <a className="gm-chip gm-chip-primary" href="collection.html">
                Shop all pieces
              </a>
              <a className="gm-chip" href="#figures">
                How the figures work
              </a>
            </div>
          </div>
          <GlassSurface className="home-feature" material="frost" radius={28}>
            <img
              src={image('tide', 'Verdigris')}
              alt="Tide headphones in Verdigris"
              width={400}
              height={400}
            />
            <div>
              <p className="home-feature-name">Tide</p>
              <p className="home-feature-kind">Over-ear headphones · $449</p>
            </div>
            <a className="gm-chip gm-chip-primary" href="product.html?id=tide&finish=verdigris">
              See Tide
            </a>
          </GlassSurface>
        </section>

        <section className="shop-section" aria-labelledby="collections-title">
          <header>
            <h2 id="collections-title">Collections</h2>
          </header>
          <ul className="home-collections">
            {Object.entries(collections).map(([id, c]) => {
              const [piece, finish] = COVER[id]!;
              return (
                <li key={id} className="home-collection">
                  <img src={image(piece, finish)} alt="" width={800} height={800} loading="lazy" />
                  <div>
                    <h3>
                      <a href={`collection.html?c=${id}`}>{c.name}</a>
                    </h3>
                    <p>{c.blurb}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="shop-section" aria-labelledby="featured-title">
          <header>
            <h2 id="featured-title">Most listened to</h2>
            <a href="collection.html">All pieces</a>
          </header>
          <ul className="shop-grid">
            {FEATURED.map((id) => (
              <ProductCard key={id} p={products.find((p) => p.id === id)!} />
            ))}
          </ul>
        </section>

        <section className="shop-section home-figures" id="figures" aria-labelledby="figures-title">
          <img
            src={extra('choir', 'plate')}
            alt="Sand on a vibrating plate, gathered into Choir's figure"
            width={900}
            height={900}
            loading="lazy"
          />
          <div>
            <h2 id="figures-title">Every piece has a figure</h2>
            <p>
              Scatter sand on a metal plate and play a tone into it: the sand leaves where the plate
              moves and gathers where it stands still, drawing a figure only that tone can draw.
            </p>
            <p>
              We tune each piece until it draws its own, and print it on its box. Choir's is above.
            </p>
          </div>
        </section>
      </main>
    </ShopShell>
  );
}
