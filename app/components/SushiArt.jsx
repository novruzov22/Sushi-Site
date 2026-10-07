"use client";

import { useId } from "react";

function Nigiri({ x, y, fill, rice, stripe = false, band = false }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="34" cy="40" rx="37" ry="5" fill="#000" opacity=".35" />
      <rect x="2" y="14" width="64" height="26" rx="12" fill={rice} />
      <path
        d="M-3 18 Q 0 3 34 3 Q 68 3 71 18 Q 66 27 34 27 Q 4 27 -3 18 Z"
        fill={fill}
      />
      {stripe &&
        [0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M ${10 + i * 18} 5 Q ${18 + i * 18} 15 ${12 + i * 18} 25`}
            stroke="#fff"
            strokeOpacity=".5"
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      {band && <rect x="26" y="1" width="16" height="30" rx="3" fill="#16201a" />}
      <path
        d="M6 9 Q 34 1 62 9"
        stroke="#fff"
        strokeOpacity=".35"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

function Maki({ cx, cy, r, fill, rice, accent }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + r * 0.95} rx={r * 1.05} ry={r * 0.22} fill="#000" opacity=".35" />
      <circle cx={cx} cy={cy} r={r} fill="#141c17" />
      <circle cx={cx} cy={cy} r={r * 0.8} fill={rice} />
      <circle cx={cx} cy={cy} r={r * 0.36} fill={fill} />
      {accent && <circle cx={cx + r * 0.16} cy={cy - r * 0.12} r={r * 0.14} fill={accent} />}
      <circle cx={cx - r * 0.35} cy={cy - r * 0.4} r={r * 0.12} fill="#fff" opacity=".18" />
    </g>
  );
}

export default function SushiArt({ kind = 0 }) {
  const id = useId().replace(/:/g, "");
  const u = (n) => `url(#${n}-${id})`;
  const gid = (n) => `${n}-${id}`;

  return (
    <svg viewBox="0 0 240 150" className="sushi-art" aria-hidden="true">
      <defs>
        <linearGradient id={gid("rice")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf7ec" />
          <stop offset="1" stopColor="#d6cdb8" />
        </linearGradient>
        <linearGradient id={gid("salmon")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffa377" />
          <stop offset="1" stopColor="#e5603a" />
        </linearGradient>
        <linearGradient id={gid("tuna")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d3303c" />
          <stop offset="1" stopColor="#8a1320" />
        </linearGradient>
        <linearGradient id={gid("shrimp")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc9b4" />
          <stop offset="1" stopColor="#ec8c74" />
        </linearGradient>
        <linearGradient id={gid("eel")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#74401f" />
          <stop offset="1" stopColor="#2a1408" />
        </linearGradient>
        <linearGradient id={gid("egg")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe28e" />
          <stop offset="1" stopColor="#efb03a" />
        </linearGradient>
        <radialGradient id={gid("tray")} cx="50%" cy="40%" r="70%">
          <stop offset="0" stopColor="#2c1a12" />
          <stop offset="1" stopColor="#120a07" />
        </radialGradient>
      </defs>

      {/* чёрный лаковый поднос */}
      <ellipse cx="120" cy="108" rx="114" ry="34" fill="#000" opacity=".4" />
      <ellipse cx="120" cy="100" rx="112" ry="32" fill={u("tray")} stroke="#5a3523" strokeWidth="2" />
      <ellipse cx="120" cy="100" rx="98" ry="25" fill="none" stroke="#7a1d14" strokeOpacity=".55" strokeWidth="1.2" />

      {kind === 0 && (
        <>
          <Nigiri x={24} y={58} fill={u("salmon")} rice={u("rice")} stripe />
          <Nigiri x={96} y={74} fill={u("tuna")} rice={u("rice")} />
          <Maki cx={192} cy={84} r={22} fill="#ff9a6a" rice={u("rice")} accent="#7bbf4a" />
          <Maki cx={168} cy={62} r={17} fill="#7bbf4a" rice={u("rice")} />
        </>
      )}

      {kind === 1 && (
        <>
          <Nigiri x={24} y={58} fill={u("shrimp")} rice={u("rice")} stripe />
          <Nigiri x={96} y={74} fill={u("shrimp")} rice={u("rice")} stripe />
          <Maki cx={194} cy={84} r={23} fill="#ffb7c5" rice={u("rice")} accent="#ff6f91" />
          <Maki cx={168} cy={62} r={17} fill="#ffd7df" rice={u("rice")} />
          {/* лепестки сакуры */}
          {[
            [150, 38, 20],
            [212, 54, -30],
            [38, 38, 50],
          ].map(([px, py, rr], i) => (
            <ellipse
              key={i}
              cx={px}
              cy={py}
              rx="7"
              ry="4"
              fill="#ffb7c5"
              opacity=".9"
              transform={`rotate(${rr} ${px} ${py})`}
            />
          ))}
        </>
      )}

      {kind === 2 && (
        <>
          <Nigiri x={24} y={58} fill={u("eel")} rice={u("rice")} />
          <Nigiri x={96} y={74} fill={u("egg")} rice={u("rice")} band />
          <Maki cx={194} cy={84} r={22} fill="#7bbf4a" rice={u("rice")} />
          <Maki cx={168} cy={62} r={17} fill="#a8d86a" rice={u("rice")} />
        </>
      )}

      {/* палочки */}
      <g transform="rotate(-8 120 120)">
        <rect x="42" y="118" width="120" height="3.2" rx="1.6" fill="#1a0f09" />
        <rect x="42" y="124" width="120" height="3.2" rx="1.6" fill="#241409" />
      </g>
    </svg>
  );
}