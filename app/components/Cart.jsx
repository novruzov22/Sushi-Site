"use client";

import { useEffect } from "react";
import { SETS } from "./sets";

// Корзина-панель. items = [{ kind, qty }]
export default function Cart({ open, items, onClose, onChange, onClear, onCheckout }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const total = items.reduce((s, it) => s + SETS[it.kind].price * it.qty, 0);

  return (
    <div className={`cart-layer ${open ? "is-open" : ""}`} onClick={onClose}>
      <aside
        className="cart-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Your order"
        aria-hidden={!open}
      >
        <div className="cart-roller" />

        <header className="cart-head">
          <div>
            <p className="eyebrow">YOUR ORDER</p>
            <h3>注文</h3>
          </div>
          <button className="cart-x" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </header>

        <div className="cart-body">
          {items.length === 0 ? (
            <p className="cart-empty">
              The scroll is empty.
              <br />
              Feed the dragon something.
            </p>
          ) : (
            items.map((it) => {
              const s = SETS[it.kind];
              return (
                <div className="cart-item" key={it.kind}>
                  <span className="cart-jp">{s.jp}</span>
                  <div className="cart-info">
                    <h4>{s.name}</h4>
                    <p>
                      {s.pcs} pcs · {s.price} AZN
                    </p>
                  </div>
                  <div className="cart-qty">
                    <button onClick={() => onChange(it.kind, -1)} aria-label="Less">
                      −
                    </button>
                    <b>{it.qty}</b>
                    <button onClick={() => onChange(it.kind, 1)} aria-label="More">
                      +
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="cart-foot">
          <div className="cart-total">
            <span>TOTAL</span>
            <b>{total} AZN</b>
          </div>
          <button className="cart-go" disabled={items.length === 0} onClick={onCheckout}>
            CHECKOUT
          </button>
          {items.length > 0 && (
            <button className="cart-clear" onClick={onClear}>
              CLEAR
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}