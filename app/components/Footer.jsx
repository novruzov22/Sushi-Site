"use client";

import { useRef, useState } from "react";
import { ABOUT, SETS } from "./sets";

// Футер: лампочка с верёвочкой. Дёрни — загорится и покажет "О нас".
export default function Footer() {
  const [lit, setLit] = useState(false);
  const [pull, setPull] = useState(0);
  const [drag, setDrag] = useState(false);
  const [swing, setSwing] = useState(false);
  const start = useRef({ y: 0, moved: 0 });

  const year = new Date().getFullYear();
  const years = year - ABOUT.since;

  const toggle = () => {
    setLit((v) => !v);
    setSwing(true);
    setTimeout(() => setSwing(false), 1700);
  };

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, moved: 0 };
    setDrag(true);
  };
  const onMove = (e) => {
    if (!drag) return;
    const dy = e.clientY - start.current.y;
    start.current.moved = Math.max(start.current.moved, Math.abs(dy));
    setPull(Math.max(0, Math.min(70, dy)));
  };
  const onUp = () => {
    if (!drag) return;
    setDrag(false);
    const p = pull;
    const moved = start.current.moved;
    setPull(0);
    if (p > 26 || moved < 6) toggle(); // дёрнули или просто кликнули
  };

  return (
    <footer className={`site-footer ${lit ? "lit" : ""}`} id="about">
      <div className="footer-glow" />

      <div className="lamp">
        <div className="lamp-wire" />

        <div
          className={`lamp-swing ${swing ? "swing" : ""} ${drag ? "dragging" : ""}`}
          style={{ "--pull": `${pull}px` }}
        >
          <svg className="lamp-shade" viewBox="0 0 260 170" aria-hidden="true">
            <defs>
              <linearGradient id="shadeG" x1="0" x2="1">
                <stop offset="0" stopColor="#0b0d0c" />
                <stop offset=".34" stopColor="#323a36" />
                <stop offset=".55" stopColor="#1a1f1d" />
                <stop offset="1" stopColor="#060707" />
              </linearGradient>
              <radialGradient id="bulbG">
                <stop offset="0" stopColor="#fff6dc" />
                <stop offset=".45" stopColor="#ffc46a" />
                <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect x="123" y="0" width="14" height="30" rx="2" fill="#15110f" />
            <path
              d="M28 152 C 28 62 88 30 130 30 C 172 30 232 62 232 152 Z"
              fill="url(#shadeG)"
            />
            <path
              d="M56 120 C 62 78 92 50 128 46"
              fill="none"
              stroke="#fff"
              strokeOpacity=".16"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <ellipse cx="130" cy="152" rx="102" ry="11" fill="#050606" />
            <ellipse cx="130" cy="152" rx="102" ry="11" fill="none" stroke="#3b423e" strokeWidth="1.5" />

            <circle cx="130" cy="152" r="52" fill="url(#bulbG)" className="bulb-glow" />
            <ellipse cx="130" cy="157" rx="17" ry="20" className="bulb-core" />
          </svg>

          {/* верёвочка с бусиной */}
          <div className="lamp-cord">
            <i className="cord-line" />
            <button
              className="cord-bead"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={(e) => {
                if (e.detail === 0) toggle(); // с клавиатуры
              }}
              aria-label={lit ? "Pull the cord to turn the light off" : "Pull the cord to turn the light on"}
            />
            <span className="cord-hint">PULL</span>
          </div>
        </div>

        <div className="lamp-cone" />
      </div>

      <div className="about-card">
        <p className="eyebrow">ABOUT US · 私たちについて</p>
        <h2 className="about-title">
          SINCE <em>{ABOUT.since}</em>
        </h2>

        <div className="about-stats">
          <div>
            <b>{years}</b>
            <span>YEARS ON THE FIRE</span>
          </div>
          <div>
            <b>{SETS.length}</b>
            <span>SIGNATURE SETS</span>
          </div>
          <div>
            <b>1</b>
            <span>DRAGON</span>
          </div>
        </div>

        {ABOUT.paragraphs.map((p, i) => (
          <p className="about-text" key={i}>
            {p}
          </p>
        ))}

        <div className="about-meta">
          <div>
            <span>FIND US</span>
            <p>
              {ABOUT.address}
              <br />
              {ABOUT.city}
            </p>
          </div>
          <div>
            <span>OPEN</span>
            <p>{ABOUT.hours}</p>
          </div>
          <div>
            <span>CALL</span>
            <p>
              {ABOUT.phone}
              <br />
              {ABOUT.email}
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bar">
        <span className="footer-logo">
          DRAGON<i>SUSHI</i>
        </span>
        <span>© {year} DRAGON SUSHI · ALL RIGHTS RESERVED</span>
      </div>
    </footer>
  );
}