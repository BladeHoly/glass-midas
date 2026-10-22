import { GlassSelect } from '@glass-midas/react/forms';
import { toast } from '@glass-midas/react/overlays';
import { GlassTable } from '@glass-midas/react/data';
import { Fragment, useState } from 'react';
import { ShopShell } from '../shared/ShopKit';
import { addToCart, image } from '../shared/cart-store.js';
import { money, products, type Product } from '../shared/data.js';

// Compare: up to three pieces in columns, what they are in rows. Each column's head chooses its
// piece; "Only where they differ" hides the rows that say the same thing everywhere.
// Load compare.css too.

type Row = { group: string } | { label: string; values: (string | null)[] };

function rows(pieces: Product[]): Row[] {
  const specs = [...new Set(pieces.flatMap((p) => Object.keys(p.specs)))];
  return [
    { group: 'The basics' },
    { label: 'Price', values: pieces.map((p) => money(p.price)) },
    { label: 'Finishes', values: pieces.map((p) => p.finishes.map((f) => f.name).join(', ')) },
    { group: 'Inside' },
    ...specs.map((label) => ({ label, values: pieces.map((p) => p.specs[label] ?? null) })),
  ];
}

export function ComparePieces() {
  const [chosen, setChosen] = useState(() =>
    (new URLSearchParams(location.search).get('ids') ?? 'tide,ripple,ember')
      .split(',')
      .filter((id) => products.some((p) => p.id === id))
      .slice(0, 3),
  );
  const [only, setOnly] = useState(false);
  const pieces = chosen.map((id) => products.find((p) => p.id === id)!);

  const choose = (column: number, id: string) => {
    const next = chosen.map((c, i) => (i === column ? id : c));
    history.replaceState(null, '', `?ids=${next.join(',')}`);
    setChosen(next);
  };

  return (
    <ShopShell>
      <main id="main" className="shop-main shop-wrap">
        <header className="col-head">
          <h1 className="on-display">Compare pieces</h1>
          <p>Up to three, side by side. Choose what goes in each column.</p>
        </header>
        <div className="cmp-tools">
          <label className="gm-check-label">
            <input
              type="checkbox"
              className="gm-toggle"
              role="switch"
              checked={only}
              onChange={(e) => setOnly(e.target.checked)}
            />
            <span>Only where they differ</span>
          </label>
        </div>
        <GlassTable pin className="cmp">
          <table>
            <caption className="on-sr-only">The chosen pieces, compared</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="on-sr-only">Piece</span>
                </th>
                {pieces.map((p, i) => (
                  <th key={i} scope="col">
                    <div className="cmp-piece">
                      <img src={image(p.id, p.finishes[0]!.name)} alt="" width={176} height={176} />
                      <GlassSelect>
                        <select
                          aria-label={`Column ${i + 1}`}
                          value={p.id}
                          onChange={(e) => choose(i, e.target.value)}
                        >
                          {products.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </GlassSelect>
                      <span className="cmp-price">{money(p.price)}</span>
                      <button
                        className="gm-chip"
                        type="button"
                        onClick={() => {
                          addToCart(p.id, p.finishes[0]!.name);
                          toast(`${p.name} in ${p.finishes[0]!.name} is in your cart`, {
                            action: {
                              label: 'View cart',
                              onClick: () =>
                                document.querySelector<HTMLElement>('#mini-cart')?.showPopover(),
                            },
                          });
                        }}
                      >
                        Add to cart
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows(pieces)
                .filter((r) => 'group' in r || !only || new Set(r.values.map(String)).size > 1)
                .map((r, i) => (
                  <Fragment key={i}>
                    {'group' in r ? (
                      <tr className="cmp-group">
                        <th scope="rowgroup" colSpan={pieces.length + 1}>
                          {r.group}
                        </th>
                      </tr>
                    ) : (
                      <tr>
                        <th scope="row">{r.label}</th>
                        {r.values.map((v, k) => (
                          <td key={k}>
                            {v ?? (
                              <span className="cmp-dash" aria-label="Not applicable">
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )}
                  </Fragment>
                ))}
            </tbody>
          </table>
        </GlassTable>
      </main>
    </ShopShell>
  );
}
