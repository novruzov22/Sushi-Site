"use client";

import { useEffect, useRef, useState } from "react";

// Срабатывает один раз, когда элемент попал в экран
export function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// Заголовок, который "рассекает" катана: половинки съезжаются по диагонали
export function SliceTitle({ children }) {
  const [ref, inView] = useInView(0.3);
  return (
    <div ref={ref} className={`slice ${inView ? "in" : ""}`}>
      <div className="slice-a">{children}</div>
      <div className="slice-b" aria-hidden="true">
        {children}
      </div>
      <svg
        className="slice-cut"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="-4"
          y1="84"
          x2="104"
          y2="18"
          pathLength="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

// Разделитель секций: катана выезжает из ножен, по клинку бежит блик
export function KatanaDivider() {
  const [ref, inView] = useInView(0.5);

  return (
    <div ref={ref} className={`katana-div ${inView ? "in" : ""}`} aria-hidden="true">
      <svg className="katana" viewBox="0 0 1200 50">
        <defs>
          <linearGradient id="bladeG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6f6f6" />
            <stop offset=".5" stopColor="#aab0b4" />
            <stop offset="1" stopColor="#5f656a" />
          </linearGradient>
          <linearGradient id="glintG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".95" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="bladeClip">
            <path d="M339 21 L1140 21 L1190 26 L1140 30 L339 30 Z" />
          </clipPath>
        </defs>

        {/* рукоять */}
        <rect x="40" y="19" width="16" height="12" rx="3" fill="#c9a24a" />
        <rect x="56" y="18" width="250" height="14" rx="4" fill="#1a1210" />
        {Array.from({ length: 14 }).map((_, i) => (
          <path
            key={i}
            d={`M${64 + i * 17} 25 l8 -7 l8 7 l-8 7 z`}
            fill="none"
            stroke="#7a1d14"
            strokeWidth="1.6"
          />
        ))}

        {/* цуба и хабаки */}
        <ellipse cx="316" cy="25" rx="9" ry="21" fill="#2a1c10" stroke="#c9a24a" strokeWidth="2" />
        <rect x="325" y="20" width="14" height="10" fill="#c9a24a" />

        {/* клинок */}
        <path d="M339 21 L1140 21 L1190 26 L1140 30 L339 30 Z" fill="url(#bladeG)" />
        <path
          d="M339 28.4 Q 420 26.4 500 28.2 T 660 28 T 820 28.3 T 980 27.8 T 1140 28.2 L 1182 26.6"
          fill="none"
          stroke="#fff"
          strokeOpacity=".55"
          strokeWidth="1.1"
        />

        {/* блик */}
        <g clipPath="url(#bladeClip)">
          <rect className="kat-glint" x="330" y="0" width="70" height="50" fill="url(#glintG)" />
        </g>
      </svg>
    </div>
  );
}