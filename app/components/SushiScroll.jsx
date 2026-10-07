"use client";

import { useEffect, useState } from "react";
import SushiArt from "./SushiArt";

// Свиток с информацией о сете. item = null -> закрыт.
export default function SushiScroll({ item, onClose, onAdd }) {
  const [shown, setShown] = useState(null);
  const [on, setOn] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (item) {
      setShown(item);
      setAdded(false);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setOn(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setOn(false);
    const t = setTimeout(() => setShown(null), 900);
    return () => clearTimeout(t);
  }, [item]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [shown, onClose]);

  if (!shown) return null;

  const add = () => {
    onAdd(shown.kind);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div
      className={`scroll-layer ${on ? "is-open" : ""}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={shown.name}
    >
      <div className="scroll" onClick={(e) => e.stopPropagation()}>
        <div className="scroll-roller" />

        <div className="scroll-paper">
          <div className="scroll-inner">
            <button className="scroll-close" onClick={onClose} aria-label="Close scroll">
              ×
            </button>

            <div className="scroll-jp" aria-hidden="true">
              {shown.jp}
            </div>

            <p className="scroll-eyebrow">
              SET No. {shown.id} · {shown.tag}
            </p>
            <h3 className="scroll-title">{shown.name}</h3>
            <div className="scroll-blade" aria-hidden="true" />

            <div className="scroll-art">
              <SushiArt kind={shown.kind} />
            </div>

            <div className="scroll-stats">
              <div>
                <b>{shown.pcs}</b>
                <span>PIECES</span>
              </div>
              <div>
                <b>{shown.kcal}</b>
                <span>KCAL</span>
              </div>
              <div>
                <b className="spice">
                  {[0, 1, 2].map((i) => (
                    <i key={i} className={i < shown.spice ? "on" : ""} />
                  ))}
                </b>
                <span>HEAT</span>
              </div>
              <div>
                <b>{shown.price}</b>
                <span>AZN</span>
              </div>
            </div>

            <p className="scroll-desc">{shown.desc}</p>

            <h4 className="scroll-sub">WHAT&apos;S INSIDE</h4>
            <ul className="scroll-list">
              {shown.contents.map(([name, qty]) => (
                <li key={name}>
                  <span>{name}</span>
                  <i />
                  <b>×{qty}</b>
                </li>
              ))}
            </ul>

            <h4 className="scroll-sub">INGREDIENTS</h4>
            <div className="scroll-chips">
              {shown.ingredients.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>

            <p className="scroll-note">“{shown.note}”</p>

            <div className="scroll-actions">
              <button className={`scroll-add ${added ? "done" : ""}`} onClick={add}>
                {added ? "ADDED ✓" : `ADD TO CART — ${shown.price} AZN`}
              </button>
            </div>

            <div className="scroll-seal" aria-hidden="true">
              {shown.jp}
            </div>
          </div>
        </div>

        <div className="scroll-roller" />
      </div>
    </div>
  );
}