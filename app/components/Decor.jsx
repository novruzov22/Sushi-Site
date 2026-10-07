"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getSoftTex } from "./Pool";

/* Уровень земли. Если предметы висят или тонут — подправь это число. */
const G = -1.085;

/* =========================================================
 *  ШУМ И ПРОЦЕДУРНЫЕ ТЕКСТУРЫ
 * ========================================================= */

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash3 = (x, y, z, s) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.19) * 43758.5453;
  return h - Math.floor(h);
};
const sm = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;

function vnoise(x, y, z = 0, s = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = sm(x - xi);
  const yf = sm(y - yi);
  const zf = sm(z - zi);
  const h = (i, j, k) => hash3(xi + i, yi + j, zi + k, s);
  return mix(
    mix(mix(h(0, 0, 0), h(1, 0, 0), xf), mix(h(0, 1, 0), h(1, 1, 0), xf), yf),
    mix(mix(h(0, 0, 1), h(1, 0, 1), xf), mix(h(0, 1, 1), h(1, 1, 1), xf), yf),
    zf
  );
}

function fbm(x, y, z = 0, s = 0, oct = 4) {
  let a = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    a += amp * vnoise(x * f, y * f, z * f, s + i * 7);
    f *= 2;
    amp *= 0.5;
  }
  return a;
}

function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function pixels(x, w, h, fn) {
  const img = x.createImageData(w, h);
  const d = img.data;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const [r, g, b] = fn(i, j);
      const k = (j * w + i) * 4;
      d[k] = r;
      d[k + 1] = g;
      d[k + 2] = b;
      d[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
}

const TEX = {};
const getTex = (key, make) => (TEX[key] ??= make());

// Дерево: волокна вдоль горизонтали
const woodTex = () =>
  getTex("wood", () =>
    canvasTex(256, 256, (x, w, h) =>
      pixels(x, w, h, (i, j) => {
        const t = (j / h) * 10 + fbm(i / 90, j / 12, 0, 3) * 3.2;
        const ring = Math.abs(Math.sin(t * Math.PI));
        const n = fbm(i / 6, j / 2, 0, 9, 2);
        const b = 0.4 + 0.35 * ring + 0.3 * (n - 0.3);
        return [46 + 62 * b, 30 + 42 * b, 18 + 26 * b];
      })
    )
  );

// Дерево: волокна вдоль вертикали (столбы)
const woodTexV = () =>
  getTex("woodV", () =>
    canvasTex(256, 256, (x, w, h) =>
      pixels(x, w, h, (i, j) => {
        const t = (i / w) * 10 + fbm(j / 12, i / 90, 0, 3) * 3.2;
        const ring = Math.abs(Math.sin(t * Math.PI));
        const n = fbm(j / 2, i / 6, 0, 9, 2);
        const b = 0.4 + 0.35 * ring + 0.3 * (n - 0.3);
        return [46 + 62 * b, 30 + 42 * b, 18 + 26 * b];
      })
    )
  );

// Рис: отдельные зёрна
const riceTex = () =>
  getTex("rice", () =>
    canvasTex(256, 256, (x, w, h) => {
      x.fillStyle = "#cfc8b6";
      x.fillRect(0, 0, w, h);
      const rnd = mulberry(7);
      for (let i = 0; i < 520; i++) {
        const px = rnd() * w;
        const py = rnd() * h;
        const a = rnd() * Math.PI;
        const l = 15 + rnd() * 8;
        const wd = 6 + rnd() * 2;
        x.save();
        x.translate(px, py);
        x.rotate(a);
        const g = x.createRadialGradient(0, -1, 0, 0, 0, l * 0.6);
        g.addColorStop(0, "rgba(255,252,243,0.97)");
        g.addColorStop(1, "rgba(226,218,198,0.95)");
        x.fillStyle = g;
        x.beginPath();
        x.ellipse(0, 0, l / 2, wd / 2, 0, 0, Math.PI * 2);
        x.fill();
        x.strokeStyle = "rgba(120,108,88,0.3)";
        x.lineWidth = 0.8;
        x.stroke();
        x.restore();
      }
    })
  );

// Лосось с жировыми прожилками
const salmonTex = () =>
  getTex("salmon", () =>
    canvasTex(256, 128, (x, w, h) => {
      pixels(x, w, h, (i, j) => {
        const n = fbm(i / 30, j / 14, 0, 5, 3);
        return [222 + 30 * n, 98 + 50 * n, 62 + 40 * n];
      });
      x.lineCap = "round";
      for (let k = 0; k < 7; k++) {
        x.strokeStyle = `rgba(255,228,208,${0.35 + (k % 3) * 0.12})`;
        x.lineWidth = 3 + (k % 3) * 1.5;
        x.beginPath();
        const y0 = (k + 0.5) * (h / 7);
        x.moveTo(-10, y0 + 14);
        x.bezierCurveTo(w * 0.3, y0 - 12, w * 0.65, y0 + 16, w + 10, y0 - 10);
        x.stroke();
      }
    })
  );

// Нори
const noriTex = () =>
  getTex("nori", () =>
    canvasTex(256, 128, (x, w, h) =>
      pixels(x, w, h, (i, j) => {
        const n = fbm(i / 40, j / 2.2, 0, 11, 3);
        return [14 + 24 * n, 22 + 30 * n, 17 + 20 * n];
      })
    )
  );

// Бумага фонаря: волокна и рёбра
const paperTex = () =>
  getTex("paper", () =>
    canvasTex(256, 128, (x, w, h) =>
      pixels(x, w, h, (i, j) => {
        const n = fbm(i / 3, j / 18, 0, 13, 3);
        const rib = Math.abs(Math.sin((j / h) * Math.PI * 9)) < 0.07 ? 0.55 : 1;
        const b = (0.82 + 0.3 * n) * rib;
        return [255 * b, 150 * b, 78 * b];
      })
    )
  );

// Ваши бумага (washi): длинные хаотичные волокна поверх кремового FBM-фона
const washiTex = () =>
  getTex("washi", () =>
    canvasTex(256, 256, (x, w, h) => {
      // базовый кремовый шум
      pixels(x, w, h, (i, j) => {
        const n = fbm(i / 8, j / 8, 0, 7, 3);
        const lum = 232 + Math.round(n * 18);
        return [lum, lum - 10, lum - 22];
      });
      // длинные полупрозрачные волокна
      const rnd = mulberry(31);
      x.lineCap = "round";
      for (let i = 0; i < 260; i++) {
        const px = rnd() * w;
        const py = rnd() * h;
        const a = rnd() * Math.PI;
        const len = 20 + rnd() * 68;
        const alpha = 0.05 + rnd() * 0.11;
        x.strokeStyle = `rgba(120,100,72,${alpha})`;
        x.lineWidth = 0.3 + rnd() * 1.0;
        x.beginPath();
        x.moveTo(px - Math.cos(a) * len, py - Math.sin(a) * len);
        x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
        x.stroke();
      }
    })
  );

// Камень: крупный шум + тёмные прожилки + светлые кварцевые прожилки
const stoneTex = () =>
  getTex("stone", () =>
    canvasTex(256, 256, (x, w, h) => {
      // 1) базовый серо-холодный шум
      pixels(x, w, h, (i, j) => {
        const coarse = fbm(i / 28, j / 28, 0, 1, 3);
        const fine   = fbm(i / 6,  j / 6,  0, 5, 3);
        const b = 0.28 + 0.38 * coarse + 0.14 * fine;
        return [
          Math.round(72  + 110 * b),
          Math.round(74  + 108 * b),
          Math.round(78  + 112 * b),
        ];
      });
      // 2) тёмные прожилки
      const rnd = mulberry(13);
      x.lineCap = "round";
      for (let k = 0; k < 14; k++) {
        const x0 = rnd() * w;
        const y0 = rnd() * h;
        const x1 = x0 + (rnd() - 0.5) * w * 0.8;
        const y1 = y0 + (rnd() - 0.5) * h * 0.8;
        const cx = (x0 + x1) / 2 + (rnd() - 0.5) * 60;
        const cy = (y0 + y1) / 2 + (rnd() - 0.5) * 60;
        x.strokeStyle = `rgba(28,26,34,${0.08 + rnd() * 0.14})`;
        x.lineWidth = 0.5 + rnd() * 2.0;
        x.beginPath();
        x.moveTo(x0, y0);
        x.quadraticCurveTo(cx, cy, x1, y1);
        x.stroke();
      }
      // 3) светлые кварцевые прожилки
      for (let k = 0; k < 8; k++) {
        const x0 = rnd() * w;
        const y0 = rnd() * h;
        const x1 = x0 + (rnd() - 0.5) * w * 0.5;
        const y1 = y0 + (rnd() - 0.5) * h * 0.5;
        x.strokeStyle = `rgba(225,222,238,${0.07 + rnd() * 0.10})`;
        x.lineWidth = 0.4 + rnd() * 1.2;
        x.beginPath();
        x.moveTo(x0, y0);
        x.lineTo(x1, y1);
        x.stroke();
      }
    })
  );

// Бамбук: полосы вокруг ствола
const bambooTex = () =>
  getTex("bamboo", () =>
    canvasTex(64, 128, (x, w, h) =>
      pixels(x, w, h, (i, j) => {
        const n = fbm(i / 40, j / 5, 0, 17, 3);
        return [58 + 48 * n, 88 + 52 * n, 34 + 26 * n];
      })
    )
  );

// Земля: граблёный гравий
const gravelTex = () =>
  getTex("gravel", () =>
    canvasTex(512, 512, (x, w, h) =>
      pixels(x, w, h, (i, j) => {
        const speck = fbm(i / 2.2, j / 2.2, 0, 21, 2);
        const wob = Math.sin(i * 0.012) * 4 + Math.sin(i * 0.031) * 1.5;
        const stripe = Math.sin(((j + wob) / 16) * Math.PI * 2);
        const b = 30 + speck * 46 + stripe * 12;
        return [b * 1.06, b * 0.98, b * 0.92];
      })
    )
  );

// Радиальное затухание земли
const fadeTex = () =>
  getTex("fade", () =>
    canvasTex(
      128,
      128,
      (x, w, h) => {
        const g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
        g.addColorStop(0, "#e6e6e6");
        g.addColorStop(0.55, "#8a8a8a");
        g.addColorStop(1, "#000000");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
      },
      { srgb: false }
    )
  );

/* =========================================================
 *  РАССТАНОВКА (без пересечений)
 * ========================================================= */

function buildLayout() {
  // Неподвижные предметы и их "радиус" на земле
  const fixed = [
    { id: "dragon", x: 0, z: 0, r: 3.5 }, // зона дракона
    { id: "torii", x: 3.1, z: -6.0, r: 1.7 },
    { id: "boardA", x: -4.6, z: -4.4, r: 2.15 },
    { id: "boardB", x: 6.3, z: -3.5, r: 1.8 },
    { id: "lanternL", x: -6.9, z: -2.8, r: 0.7 },
    { id: "lanternR", x: 7.4, z: -2.4, r: 0.7 },
  ];

  const stones = [
    { x: -2.0, z: -6.2, s: 0.9, seed: 1 },
    { x: 0.2, z: -6.6, s: 0.6, seed: 2 },
    { x: -6.8, z: -6.0, s: 1.0, seed: 3 },
    { x: -7.9, z: -4.0, s: 0.7, seed: 4 },
    { x: 1.4, z: -4.9, s: 0.5, seed: 5 },
    { x: 7.0, z: -5.6, s: 0.9, seed: 6 },
    { x: 8.2, z: -3.8, s: 0.6, seed: 7 },
    { x: 5.0, z: -6.4, s: 0.55, seed: 8 },
    { x: -3.4, z: -6.8, s: 0.5, seed: 9 },
    { x: -1.0, z: -5.0, s: 0.42, seed: 10 },
  ].map((s) => ({ ...s, r: s.s * 1.3 }));

  const pegs = [
    { x: -1.1, z: -7.1 },
    { x: -0.4, z: -7.5 },
    { x: -1.8, z: -7.7 },
    { x: 4.9, z: -7.2 },
  ].map((p, i) => ({ ...p, h: [0.9, 1.3, 0.6, 1.0][i], r: 0.32 }));

  const movable = [...stones, ...pegs];
  const all = [...fixed, ...movable];

  // Расталкиваем всё, что пересекается
  for (let it = 0; it < 80; it++) {
    for (const m of movable) {
      for (const o of all) {
        if (o === m) continue;
        const dx = m.x - o.x;
        const dz = m.z - o.z;
        const d = Math.hypot(dx, dz) || 0.001;
        const need = m.r + o.r + 0.12;
        if (d < need) {
          const push = (need - d) * (fixed.includes(o) ? 1 : 0.5);
          m.x += (dx / d) * push;
          m.z += (dz / d) * push;
        }
      }
    }
  }

  return { fixed, stones, pegs };
}

const LAYOUT = buildLayout();
const F = (id) => LAYOUT.fixed.find((f) => f.id === id);

/* =========================================================
 *  ТЕНИ-КОНТАКТЫ И ЗЕМЛЯ
 * ========================================================= */

/**
 * ContactBlob — трёхслойная мягкая контактная тень:
 *   1) halo   — большой прозрачный ореол
 *   2) core   — средний основной спад
 *   3) center — плотная центральная точка
 *
 * w / d  — ширина/глубина (в единицах сцены) базового слоя
 * opacity — прозрачность центрального слоя (halo и core масштабируются автоматически)
 */
function Blob({ x, z, w = 2, d = 2, opacity = 0.4 }) {
  const tex = useMemo(() => getSoftTex(), []);
  // Y-смещения для исключения z-fighting
  const y0 = G + 0.008;
  const y1 = G + 0.012;
  const y2 = G + 0.016;

  const mat = (op) => (
    <meshBasicMaterial
      map={tex}
      color="#000000"
      transparent
      opacity={op}
      depthWrite={false}
      toneMapped={false}
    />
  );

  return (
    <>
      {/* 1. halo — крупный, очень мягкий */}
      <mesh position={[x, y0, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w * 2.6, d * 2.6, 1]}>
        <planeGeometry args={[1, 1]} />
        {mat(opacity * 0.18)}
      </mesh>
      {/* 2. core — средний спад */}
      <mesh position={[x, y1, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w * 1.3, d * 1.3, 1]}>
        <planeGeometry args={[1, 1]} />
        {mat(opacity * 0.48)}
      </mesh>
      {/* 3. center — плотная точка контакта */}
      <mesh position={[x, y2, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w * 0.55, d * 0.55, 1]}>
        <planeGeometry args={[1, 1]} />
        {mat(opacity)}
      </mesh>
    </>
  );
}


function Ground() {
  const map = useMemo(() => {
    const t = gravelTex();
    t.repeat.set(7, 5);
    return t;
  }, []);
  const fade = useMemo(() => fadeTex(), []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, G - 0.004, -2]}
      receiveShadow
      renderOrder={-1}
    >
      <planeGeometry args={[46, 34]} />
      <meshStandardMaterial
        map={map}
        bumpMap={map}
        bumpScale={1.6}
        alphaMap={fade}
        transparent
        depthWrite={false}
        color="#9c918a"
        roughness={0.92}
        metalness={0}
      />
    </mesh>
  );
}

// Мелкие камешки на земле
function Pebbles() {
  const ref = useRef();
  const N = 110;

  const geo = useMemo(() => {
    let g = new THREE.IcosahedronGeometry(1, 4);
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    g = mergeVertices(g, 1e-4);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = 0.75 + 0.5 * fbm(v.x * 1.6, v.y * 1.6, v.z * 1.6, 4, 3);
      v.multiplyScalar(d);
      v.y *= 0.55;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rnd = mulberry(5);
    const obstacles = [...LAYOUT.fixed, ...LAYOUT.stones, ...LAYOUT.pegs];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();

    let n = 0;
    for (let tries = 0; tries < 900 && n < N; tries++) {
      const x = (rnd() - 0.5) * 20;
      const z = 1.5 - rnd() * 9.5;
      if (obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.15)) continue;
      const sc = 0.035 + rnd() * 0.07;
      e.set(rnd() * 3, rnd() * 6, rnd() * 3);
      q.setFromEuler(e);
      p.set(x, G + sc * 0.2, z);
      s.set(sc * (0.8 + rnd() * 0.6), sc, sc * (0.8 + rnd() * 0.6));
      m.compose(p, q, s);
      mesh.setMatrixAt(n, m);
      const t = 0.06 + rnd() * 0.1;
      c.setRGB(t * 1.05, t, t * 0.92);
      mesh.setColorAt(n, c);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, N]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.95} />
    </instancedMesh>
  );
}

/* =========================================================
 *  КАМНИ (с мхом)
 * ========================================================= */

function makeStoneGeo(seed) {
  let g = new THREE.IcosahedronGeometry(1, 22);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-4);

  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const sx = 1.1 + 0.3 * hash3(seed, 1, 2, 3);
  const sz = 0.85 + 0.3 * hash3(seed, 4, 5, 6);
  const flat = 0.55 + 0.2 * hash3(seed, 7, 8, 9);

  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const big = fbm(v.x * 1.1 + seed * 3.1, v.y * 1.1, v.z * 1.1, seed, 3);
    const ridge =
      1 - Math.abs(2 * fbm(v.x * 3 + seed, v.y * 3, v.z * 3, seed + 11, 3) - 1);
    const fine = fbm(v.x * 9, v.y * 9, v.z * 9 + seed, seed + 23, 2);
    const d = 0.78 + 0.55 * big + 0.14 * ridge * ridge + 0.05 * fine;
    v.multiplyScalar(d);
    v.x *= sx;
    v.z *= sz;
    v.y *= flat;
    if (v.y < -0.3) v.y = -0.3 + (v.y + 0.3) * 0.15; // плоское основание
    p.setXYZ(i, v.x, v.y, v.z);
  }

  g.computeVertexNormals();
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0);

  // Цвет вершин: серый камень + мох на верхних гранях
  const nrm = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const up = nrm.getY(i);
    const tone = 0.055 + 0.075 * fbm(v.x * 3.5, v.y * 3.5, v.z * 3.5, seed + 3, 3);
    const warm = fbm(v.x * 1.4, v.y * 1.4, v.z * 1.4, seed + 9, 2);
    let r = tone * (0.95 + 0.3 * warm);
    let gg = tone * 0.95;
    let b = tone * (0.9 - 0.15 * warm);
    const mask = fbm(v.x * 1.1 + 4, v.y * 1.1, v.z * 1.1, seed + 5, 3);
    const moss = THREE.MathUtils.smoothstep(up + (mask - 0.45) * 0.9, 0.55, 0.95);
    r = mix(r, 0.03, moss);
    gg = mix(gg, 0.065, moss);
    b = mix(b, 0.015, moss);
    col[i * 3] = r;
    col[i * 3 + 1] = gg;
    col[i * 3 + 2] = b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function Stone({ x, z, s = 1, seed = 1 }) {
  const geo = useMemo(() => makeStoneGeo(seed), [seed]);
  const stex = useMemo(() => {
    const t = stoneTex();
    t.repeat.set(1.8, 1.8);
    return t;
  }, []);
  return (
    <>
      <mesh
        geometry={geo}
        position={[x, G - 0.03 * s, z]}
        scale={s}
        rotation={[0, seed * 1.9, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={stex}
          bumpMap={stex}
          bumpScale={1.8}
          vertexColors
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>
      <Blob x={x} z={z} w={2.6 * s} d={2.2 * s} opacity={0.42} />
    </>
  );
}


/* =========================================================
 *  СУШИ
 * ========================================================= */

function FishMat({ kind }) {
  if (kind === "salmon") {
    return (
      <meshPhysicalMaterial
        map={salmonTex()}
        roughness={0.28}
        clearcoat={0.9}
        clearcoatRoughness={0.18}
      />
    );
  }
  const colors = { tuna: "#a01d26", white: "#e9cfb8", shrimp: "#ec9a82" };
  return (
    <meshPhysicalMaterial
      color={colors[kind] || "#ec9a82"}
      roughness={0.3}
      clearcoat={0.8}
      clearcoatRoughness={0.2}
    />
  );
}

function Nigiri({ x, z = 0, fish = "salmon", rot = 0 }) {
  const rice = riceTex();
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <RoundedBox
        args={[0.92, 0.4, 0.46]}
        radius={0.17}
        smoothness={5}
        position={[0, 0.2, 0]}
        castShadow
      >
        <meshStandardMaterial
          map={rice}
          bumpMap={rice}
          bumpScale={1.4}
          roughness={0.75}
          color="#f3eee2"
        />
      </RoundedBox>
      <RoundedBox
        args={[1.08, 0.15, 0.56]}
        radius={0.065}
        smoothness={4}
        position={[0, 0.465, 0]}
        castShadow
      >
        <FishMat kind={fish} />
      </RoundedBox>
    </group>
  );
}

function Maki({ x, z = 0, fill = "#ee7a4e" }) {
  const rice = riceTex();
  const nori = noriTex();
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.21, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.42, 36, 1, true]} />
        <meshStandardMaterial
          map={nori}
          bumpMap={nori}
          bumpScale={1}
          roughness={0.5}
          color="#d4dcd4"
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.385, 0.385, 0.4, 36]} />
        <meshStandardMaterial
          map={rice}
          bumpMap={rice}
          bumpScale={1.2}
          roughness={0.75}
          color="#f3eee2"
        />
      </mesh>
      <mesh position={[0, 0.412, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.014, 24]} />
        <meshPhysicalMaterial
          color={fill}
          roughness={0.3}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
        />
      </mesh>
    </group>
  );
}

function SoyDish({ x, z = 0 }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.3, 0.12, 28]} />
        <meshPhysicalMaterial
          color="#171412"
          roughness={0.2}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.112, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.01, 28]} />
        <meshPhysicalMaterial
          color="#2b1409"
          roughness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>
    </group>
  );
}

function Garnish({ x }) {
  return (
    <group position={[x, 0, 0]}>
      {/* васаби */}
      <mesh position={[0, 0.06, -0.3]} scale={[0.17, 0.11, 0.14]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color="#7f9c37" roughness={0.5} />
      </mesh>
      {/* имбирь */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[(i % 2) * 0.05 - 0.02, 0.03 + i * 0.022, 0.28 + i * 0.01]}
          rotation={[0, i * 0.8, 0]}
          scale={[0.22, 0.025, 0.15]}
          castShadow
        >
          <sphereGeometry args={[1, 18, 10]} />
          <meshStandardMaterial color="#e8a0a4" roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function Chopsticks() {
  return (
    <group position={[-0.4, 0.07, 0.6]}>
      {[0, 0.07].map((dz, i) => (
        <mesh
          key={i}
          position={[0, 0.02 + i * 0.01, dz]}
          rotation={[0, i * 0.04, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.022, 0.014, 1.7, 8]} />
          <meshPhysicalMaterial
            color="#150d09"
            roughness={0.25}
            clearcoat={0.8}
            clearcoatRoughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function SushiBoard({ x, z, s = 1, rot = 0, kind = "A" }) {
  const wood = woodTex();
  return (
    <>
      <group position={[x, G, z]} rotation={[0, rot, 0]} scale={s}>
        {/* ножки гэта */}
        {[-1.6, 1.6].map((px) => (
          <mesh key={px} position={[px, 0.07, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.14, 1.25]} />
            <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={1} roughness={0.8} color="#bdb0a4" />
          </mesh>
        ))}
        {/* доска */}
        <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.6, 0.1, 1.5]} />
          <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={1.2} roughness={0.78} color="#c4b6aa" />
        </mesh>

        <group position={[0, 0.22, 0]}>
          {kind === "A" ? (
            <>
              <Nigiri x={-1.65} fish="salmon" rot={0.05} />
              <Nigiri x={-0.6} fish="tuna" rot={-0.04} />
              <Maki x={0.5} fill="#ee7a4e" />
            </>
          ) : (
            <>
              <Maki x={-1.65} fill="#ee7a4e" />
              <Nigiri x={-0.6} fish="white" rot={0.06} />
              <Nigiri x={0.5} fish="shrimp" rot={-0.05} />
            </>
          )}
          <Garnish x={1.2} />
          <SoyDish x={1.9} z={0.05} />
          <Chopsticks />
        </group>
      </group>
      <Blob x={x} z={z} w={5.2 * s} d={2.6 * s} opacity={0.45} />
    </>
  );
}

/* =========================================================
 *  ВОРОТА ТОРИИ
 * ========================================================= */

function Lacquer({ tone = "red" }) {
  const wood = woodTexV();
  const p =
    tone === "black"
      ? { color: "#1a1412", roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.3 }
      : { color: "#a3281a", roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35 };
  return <meshPhysicalMaterial map={wood} bumpMap={wood} bumpScale={0.5} {...p} />;
}

function Torii({ x, z, s = 1, rot = 0 }) {
  return (
    <>
      <group position={[x, G, z]} rotation={[0, rot, 0]} scale={s}>
        {[-1.5, 1.5].map((px) => (
          <group key={px}>
            {/* каменное основание */}
            <mesh position={[px, 0.07, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.36, 0.4, 0.14, 20]} />
              <meshStandardMaterial color="#2a2623" roughness={0.95} />
            </mesh>
            <mesh position={[px, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.23, 0.25, 0.22, 20]} />
              <Lacquer tone="black" />
            </mesh>
            <mesh position={[px, 1.9, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.15, 0.19, 3.3, 20]} />
              <Lacquer />
            </mesh>
          </group>
        ))}

        {/* нижняя балка */}
        <mesh position={[0, 2.35, 0]} castShadow>
          <boxGeometry args={[3.8, 0.17, 0.2]} />
          <Lacquer />
        </mesh>
        {/* средняя стойка */}
        <mesh position={[0, 2.9, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, 0.16]} />
          <Lacquer />
        </mesh>
        {/* верхняя балка */}
        <mesh position={[0, 3.4, 0]} castShadow>
          <boxGeometry args={[4.3, 0.2, 0.34]} />
          <Lacquer />
        </mesh>
        {/* крыша-касаги */}
        <mesh position={[0, 3.62, 0]} castShadow>
          <boxGeometry args={[4.7, 0.18, 0.44]} />
          <Lacquer tone="black" />
        </mesh>
        {[-1, 1].map((d) => (
          <mesh
            key={d}
            position={[d * 2.5, 3.7, 0]}
            rotation={[0, 0, d * 0.17]}
            castShadow
          >
            <boxGeometry args={[0.9, 0.18, 0.44]} />
            <Lacquer tone="black" />
          </mesh>
        ))}
      </group>
      <Blob x={x} z={z} w={5.2 * s} d={1.8 * s} opacity={0.35} />
    </>
  );
}

/* =========================================================
 *  ФОНАРИ
 * ========================================================= */

const LANTERN_PROFILE = [
  [0.0, -0.42],
  [0.17, -0.4],
  [0.3, -0.28],
  [0.37, -0.1],
  [0.38, 0.05],
  [0.35, 0.22],
  [0.26, 0.36],
  [0.17, 0.42],
  [0.0, 0.42],
].map(([r, y]) => new THREE.Vector2(r, y));

function Lantern({ phase = 0 }) {
  const swing = useRef();
  const light = useRef();
  const paper = paperTex();
  const halo = useMemo(() => getSoftTex(), []);

  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (swing.current) swing.current.rotation.z = Math.sin(t * 0.9 + phase) * 0.06;
    if (light.current) {
      light.current.intensity =
        5 + Math.sin(t * 7 + phase) * 0.5 + Math.sin(t * 13.3 + phase) * 0.3;
    }
  });

  return (
    <group ref={swing}>
      <group position={[0, -0.75, 0]}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
          <meshStandardMaterial color="#1a1210" />
        </mesh>
        <mesh position={[0, 0.46, 0]}>
          <cylinderGeometry args={[0.17, 0.2, 0.06, 18]} />
          <meshStandardMaterial color="#1c1410" roughness={0.6} />
        </mesh>

        <mesh castShadow>
          <latheGeometry args={[LANTERN_PROFILE, 36]} />
          <meshStandardMaterial
            map={paper}
            emissiveMap={paper}
            color="#d9693a"
            emissive="#ff8a40"
            emissiveIntensity={1.3}
            roughness={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>

        {[-0.28, -0.1, 0.1, 0.28].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.37 - Math.abs(y) * 0.28, 0.008, 6, 36]} />
            <meshStandardMaterial color="#2a1a10" />
          </mesh>
        ))}

        <mesh position={[0, -0.46, 0]}>
          <cylinderGeometry args={[0.2, 0.17, 0.06, 18]} />
          <meshStandardMaterial color="#1c1410" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.68, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.34, 6]} />
          <meshStandardMaterial color="#8f2a1e" roughness={0.8} />
        </mesh>

        {/* ореол */}
        <sprite scale={[1.9, 1.9, 1]}>
          <spriteMaterial
            map={halo}
            color="#ff8a40"
            blending={THREE.AdditiveBlending}
            transparent
            opacity={0.32}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        <pointLight ref={light} color="#ff8a3d" intensity={5} distance={7} decay={2} />
      </group>
    </group>
  );
}

function LanternPost({ x, z, dir = 1, h = 2.3, phase = 0 }) {
  const wood = woodTexV();
  return (
    <>
      <group position={[x, G, z]}>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.13, h, 12]} />
          <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={1} roughness={0.85} color="#a89a8c" />
        </mesh>
        <mesh position={[dir * 0.55, h - 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.1, 10]} />
          <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={1} roughness={0.85} color="#a89a8c" />
        </mesh>
        <group position={[dir * 1.0, h - 0.12, 0]}>
          <Lantern phase={phase} />
        </group>
      </group>
      <Blob x={x} z={z} w={1.2} d={1.2} opacity={0.45} />
    </>
  );
}

/* =========================================================
 *  БАМБУК И ДЕРЕВЯННЫЕ СТОЛБЫ
 * ========================================================= */

function Bamboo({ x, z, h = 6, seed = 0 }) {
  const ref = useRef();
  const tex = bambooTex();

  const { geo, nodes } = useMemo(() => {
    const bend = (hash3(seed, 1, 2, 3) - 0.5) * 0.7;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(bend * 0.4, h * 0.33, 0),
      new THREE.Vector3(bend * 1.0, h * 0.66, 0),
      new THREE.Vector3(bend * 1.3, h, 0),
    ]);
    const g = new THREE.TubeGeometry(curve, 28, 0.11, 10, false);
    const count = Math.floor(h / 0.95);
    const pts = Array.from({ length: count }, (_, i) =>
      curve.getPoint(Math.min((i + 0.6) / (count + 0.4), 0.97))
    );
    return { geo: g, nodes: pts };
  }, [h, seed]);

  useFrame((st) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(st.clock.elapsedTime * 0.6 + seed) * 0.012;
    }
  });

  return (
    <>
      <group ref={ref} position={[x, G, z]}>
        <mesh geometry={geo} castShadow>
          <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={0.8} roughness={0.5} color="#d5e6b8" />
        </mesh>
        {nodes.map((p, i) => (
          <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.118, 0.022, 8, 16]} />
            <meshStandardMaterial color="#3f5a22" roughness={0.65} />
          </mesh>
        ))}
      </group>
      <Blob x={x} z={z} w={0.8} d={0.8} opacity={0.4} />
    </>
  );
}

function WoodPost({ x, z, h = 1 }) {
  const wood = woodTexV();

  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.16, 0.2, h, 16, 12);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm(v.x * 5 + h * 3, v.y * 4, v.z * 5, 8, 3) - 0.4;
      const r = Math.hypot(v.x, v.z);
      if (r > 0.01) {
        const k = 1 + n * 0.22;
        v.x *= k;
        v.z *= k;
      }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, [h]);

  return (
    <>
      <group position={[x, G, z]}>
        <mesh geometry={geo} position={[0, h / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={wood} bumpMap={wood} bumpScale={1.4} roughness={0.9} color="#a89a8c" />
        </mesh>
        <mesh position={[0, h + 0.003, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.012, 16]} />
          <meshStandardMaterial color="#6b5238" roughness={0.9} />
        </mesh>
        <mesh position={[0, h * 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.19, 0.03, 8, 22]} />
          <meshStandardMaterial color="#8c7a56" roughness={1} />
        </mesh>
      </group>
      <Blob x={x} z={z} w={0.9} d={0.9} opacity={0.4} />
    </>
  );
}

/* =========================================================
 *  СЦЕНА
 * ========================================================= */

export default function Decor() {
  const torii = F("torii");
  const boardA = F("boardA");
  const boardB = F("boardB");
  const lanternL = F("lanternL");
  const lanternR = F("lanternR");

  return (
    <group>
      <Ground />
      <Pebbles />

      {LAYOUT.stones.map((s) => (
        <Stone key={s.seed} x={s.x} z={s.z} s={s.s} seed={s.seed} />
      ))}

      <Torii x={torii.x} z={torii.z} s={0.62} rot={-0.1} />

      <SushiBoard x={boardA.x} z={boardA.z} s={0.85} rot={0.12} kind="A" />
      <SushiBoard x={boardB.x} z={boardB.z} s={0.72} rot={-0.2} kind="B" />

      <LanternPost x={lanternL.x} z={lanternL.z} dir={1} phase={0} />
      <LanternPost x={lanternR.x} z={lanternR.z} dir={-1} phase={1.7} />

      {/* бамбук по краям (уходит за верх кадра) */}
      <Bamboo x={-7.8} z={-3.4} h={6} seed={0} />
      <Bamboo x={-7.2} z={-4.7} h={5.2} seed={1} />
      <Bamboo x={-8.4} z={-2.6} h={6.5} seed={2} />
      <Bamboo x={8.8} z={-3.8} h={6} seed={3} />
      <Bamboo x={8.2} z={-5.0} h={5.4} seed={4} />
      <Bamboo x={9.2} z={-2.9} h={6.4} seed={5} />

      {/* деревянные столбы */}
      {LAYOUT.pegs.map((p, i) => (
        <WoodPost key={i} x={p.x} z={p.z} h={p.h} />
      ))}
    </group>
  );
}