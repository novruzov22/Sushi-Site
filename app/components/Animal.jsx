"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { Pool, getSoftTex } from "./Pool";

/* =========================================================
 *  НАСТРОЙКИ
 * ========================================================= */

const MODEL_URL = "/models/dragon__thera.glb";
const MODEL_SIZE = 6;

// Поворот дракона: голова смотрит в сторону камеры и чуть вправо.
const DRAGON_YAW = 0.7;

// ---- Камера ----
const CAM_WIDE_POS = new THREE.Vector3(0.6, 3.1, 9.4);
const CAM_WIDE_TGT = new THREE.Vector3(0.1, -0.1, 0.2);
const FOV_WIDE = 34;
const FOV_CLOSE = 27;

const CLOSE_DIST = 2.9; // расстояние до головы (меньше = ближе)
const CLOSE_UP = 0.4; // камера выше головы
const CLOSE_SIDE = 0.8; // камера сбоку (минус = с другой стороны)
const LOOK_SHIFT = 0.8; // сдвиг кадра: голова уходит ВПРАВО, слева карточки
const SWING = 1.2; // дуга при наезде

const ENV_INTENSITY = 0.4; // яркость отражений (меньше = темнее)

// Челюсть
const JAW_OPEN = 0.8;
const JAW_DIR = 1; // если пасть открывается вверх — поставь -1

// Крылья
const WING_BEAT = 0.38; // размах взмахов при еде (больше = сильнее машет)
const WING_W = [0.5, 0.7, 0.6, 0.5]; // вклад каждой кости крыла (от плеча к кончику)

const FISH_COLORS = ["#ff6a3d", "#ff9fb5", "#7bbf4a"];

// Кости (точки в именах убираются Three.js)
const BONES = {
  neck: [
    ["Bone003_04", 0.1],
    ["Bone004_05", 0.2],
    ["Bone005_06", 0.25],
    ["Bone006_07", 0.25],
    ["Bone007_08", 0.2],
  ],
  jaw: "Bone008_09",
  upper: "Bone010_014",
  wingR: ["Bone028_027", "Bone030_028", "Bone032_029", "Bone033_030"],
  wingL: ["Bone029_032", "Bone031_033", "Bone034_034", "Bone035_035"],
  tail: [
    "Bone017_049",
    "Bone019_051",
    "Bone021_053",
    "Bone022_054",
    "Bone023_055",
    "Bone024_056",
  ],
};

// Точки на голове: [кость, позиция в исходной модели]
const ANCHORS = {
  eyeL: ["Bone010_014", [164, 100, 448]],
  eyeR: ["Bone010_014", [228, 100, 448]],
  nostL: ["Bone011_015", [187, 77, 519]],
  nostR: ["Bone011_015", [205, 77, 519]],
  mouth: ["Bone010_014", [197, 45, 505]],
  headC: ["Bone010_014", [197, 85, 450]],
};

/* =========================================================
 *  ВСПОМОГАТЕЛЬНОЕ
 * ========================================================= */

const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = THREE.MathUtils.lerp;
const ease = (e) => e * e * (3 - 2 * e);
const easeOutCubic = (e) => 1 - Math.pow(1 - e, 3);
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const rnd = (a, b) => a + Math.random() * (b - a);
const norm = (n) => n.replace(/[.\s]/g, "");

const _qp = new THREE.Quaternion();
const _qs = new THREE.Quaternion();
const _ax = new THREE.Vector3();
const _dq = new THREE.Quaternion();

// Поворот кости вокруг оси модели
function rotateBone(bone, sceneObj, axis, angle) {
  if (!bone || !bone.parent) return;
  bone.parent.getWorldQuaternion(_qp);
  sceneObj.getWorldQuaternion(_qs);
  _qp.premultiply(_qs.invert());
  _ax.copy(axis).applyQuaternion(_qp.invert());
  _dq.setFromAxisAngle(_ax, angle);
  bone.quaternion.premultiply(_dq);
}

// Временные векторы
const _fwd = new THREE.Vector3();
const _side = new THREE.Vector3();
const _closePos = new THREE.Vector3();
const _closeTgt = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();
const _lat = new THREE.Vector3();

/* =========================================================
 *  ДРАКОН
 * ========================================================= */

export default function Dragon({ progressRef }) {
  const group = useRef();
  const rig = useRef(null);
  const anchors = useRef(null);
  const groundY = useRef(-1.085);
  const mainAction = useRef(null);

  const eyeRefs = useRef([]);
  const glowMats = useRef([]);
  const headLight = useRef();
  const sushiRef = useRef();
  const nigiriRef = useRef();
  const makiRef = useRef();
  const fishMat = useRef();

  const { gl, camera, scene: rootScene } = useThree();

  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);

  const glowTex = useMemo(() => getSoftTex(), []);
  const embers = useMemo(
    () => new Pool(1200, { additive: true, color: "#ff8a3a", drag: 0.15, flicker: true }),
    []
  );
  const smoke = useMemo(
    () => new Pool(900, { additive: false, color: "#a89a90", drag: 0.6 }),
    []
  );

  useEffect(
    () => () => {
      embers.dispose();
      smoke.dispose();
    },
    [embers, smoke]
  );

  const V = useMemo(
    () => ({
      eyeL: new THREE.Vector3(),
      eyeR: new THREE.Vector3(),
      nostL: new THREE.Vector3(),
      nostR: new THREE.Vector3(),
      mouth: new THREE.Vector3(),
      headC: new THREE.Vector3(),
      hf: new THREE.Vector3(0, 0, 1),
    }),
    []
  );

  const st = useRef({
    mode: "idle", // idle | feed | roar
    t: 0,
    queue: [],
    kind: 0,
    roarReq: false,
    roarCool: 0,
    look: { x: 0, y: 0 },
    pS: 0,
    hs: new THREE.Vector3(),
    hsInit: false,
    smokeAcc: 0,
    mouthSmokeAcc: 0,
    emberAcc: 0,
    fireAcc: 0,
    dustAcc: 0,
    wingPhase: 0,
    shake: 0,
    popFired: false,
    ateFired: false,
    sushiStart: new THREE.Vector3(),
  }).current;

  /* ===== Подготовка модели ===== */
  useEffect(() => {
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);
    scene.updateMatrixWorld(true);

    const meshes = [];
    const boneMap = {};
    scene.traverse((o) => {
      if (o.isBone) boneMap[norm(o.name)] = o;
      if (o.isMesh || o.isSkinnedMesh) {
        o.frustumCulled = false;
        o.castShadow = true; // дракон отбрасывает тень
        meshes.push(o);
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (!m) return;
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        });
      }
    });

    // "Чистые" позы костей (чтобы повороты не накапливались)
    const rec = {};
    Object.keys(boneMap).forEach((n) => {
      rec[n] = {
        base: boneMap[n].quaternion.clone(),
        out: boneMap[n].quaternion.clone(),
      };
    });
    rig.current = { bones: boneMap, rec };

    const getBox = (mesh) => {
      try {
        mesh.skeleton?.update();
        return new THREE.Box3().setFromObject(mesh, true);
      } catch (e) {
        return new THREE.Box3().setFromObject(mesh, false);
      }
    };

    const isBodyByMaterial = (m) => {
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      return mat && mat.name === "Material.001";
    };
    let body = meshes.filter(isBodyByMaterial);
    if (body.length === 0) {
      body = [...meshes]
        .sort(
          (a, b) =>
            (b.geometry.attributes.position?.count || 0) -
            (a.geometry.attributes.position?.count || 0)
        )
        .slice(0, 3);
    }

    const bodyBox = new THREE.Box3();
    body.forEach((m) => bodyBox.union(getBox(m)));
    const bodySize = bodyBox.getSize(new THREE.Vector3());
    const bodyCenter = bodyBox.getCenter(new THREE.Vector3());
    const bodyDiag = bodySize.length();

    // Скрываем кривые меши (сломанные глаза из оригинала)
    const safeZone = bodyBox.clone().expandByScalar(bodyDiag);
    meshes.forEach((m) => {
      if (body.includes(m)) return;
      const b = getBox(m);
      const size = b.getSize(new THREE.Vector3());
      const c = b.getCenter(new THREE.Vector3());
      if (size.length() > bodyDiag * 2 || !safeZone.containsPoint(c)) {
        m.visible = false;
        m.castShadow = false;
      }
    });

    const k = MODEL_SIZE / Math.max(bodySize.x, bodySize.y, bodySize.z);
    scene.scale.setScalar(k);
    scene.position.set(-bodyCenter.x * k, -bodyCenter.y * k, -bodyCenter.z * k);
    scene.updateMatrixWorld(true);

    groundY.current = (bodyBox.min.y - bodyCenter.y) * k;

    // Точки привязки (глаза, ноздри, пасть)
    const A = {};
    Object.entries(ANCHORS).forEach(([name, [boneName, restPos]]) => {
      const bone = boneMap[boneName];
      if (!bone) {
        console.log("НЕТ КОСТИ ДЛЯ ТОЧКИ:", name, boneName);
        return;
      }
      const w = scene.localToWorld(new THREE.Vector3(...restPos));
      A[name] = { bone, off: bone.worldToLocal(w.clone()) };
    });
    anchors.current = A;

    const needed = [
      ...BONES.neck.map((n) => n[0]),
      BONES.jaw,
      BONES.upper,
      ...BONES.wingR,
      ...BONES.wingL,
      ...BONES.tail,
    ];
    const missing = needed.filter((n) => !boneMap[n]);
    console.log(
      missing.length
        ? "НЕ НАЙДЕНЫ КОСТИ: " + missing.join(", ")
        : "RIG: все кости найдены"
    );

    camera.near = 0.05;
    camera.far = 500;
    camera.updateProjectionMatrix();
  }, [scene, camera]);

  /* ===== Встроенная анимация (дыхание) ===== */
  useEffect(() => {
    const names = Object.keys(actions);
    if (names.length > 0) {
      const action = actions[names[0]];
      if (action) {
        action.reset();
        action.setLoop(THREE.LoopRepeat);
        action.fadeIn(0.5).play();
        mainAction.current = action;
      }
    }
    return () => {
      Object.values(actions).forEach((a) => a?.fadeOut(0.3));
    };
  }, [actions]);

  /* ===== События: накормить / зарычать ===== */
  useEffect(() => {
    const onFeed = (e) => {
      if (st.queue.length < 4) st.queue.push(Number(e.detail?.kind) || 0);
    };
    const el = gl.domElement;
    const onDown = () => {
      if (st.mode === "idle" && st.roarCool <= 0) st.roarReq = true;
    };
    window.addEventListener("dragon:feed", onFeed);
    el.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("dragon:feed", onFeed);
      el.removeEventListener("pointerdown", onDown);
    };
  }, [gl, st]);

  /* ===== Каждый кадр ===== */
  useFrame((state, rawDelta) => {
    const g = group.current;
    const A = anchors.current;
    const R = rig.current;
    if (!g || !A || !R) return;

    const dt = Math.min(rawDelta, 0.05);
    const time = state.clock.elapsedTime;
    const gY = groundY.current;

    rootScene.environmentIntensity = ENV_INTENSITY;

    // Голова следит за курсором (плавно)
    st.look.x = damp(st.look.x, state.pointer.x, 3, dt);
    st.look.y = damp(st.look.y, state.pointer.y, 3, dt);

    /* ---------- помощники эффектов ---------- */
    const burstEmbers = (p, n, speed) => {
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(rnd(-1, 1));
        const sp = rnd(0.3, 1) * speed;
        embers.emit(
          p.x,
          p.y,
          p.z,
          Math.sin(ph) * Math.cos(th) * sp,
          Math.cos(ph) * sp + 0.3,
          Math.sin(ph) * Math.sin(th) * sp,
          rnd(0.8, 1.9),
          rnd(0.04, 0.09),
          0.012,
          1,
          -0.5
        );
      }
    };

    /* ---------- конечный автомат ---------- */
    let lunge = 0;
    let bodyPitch = 0;
    let neckPitch = 0;
    let jaw = 0;
    let flare = 0;
    let eyeBoost = 0;
    let beat = 0; // сила взмахов крыльев
    let snort = 0; // сила фырканья носом

    st.roarCool = Math.max(0, st.roarCool - dt);

    if (st.mode === "idle") {
      if (st.queue.length) {
        st.kind = st.queue.shift();
        st.mode = "feed";
        st.t = 0;
        st.popFired = false;
        st.ateFired = false;
        st.sushiStart.copy(V.mouth).addScaledVector(V.hf, 1.15);
        st.sushiStart.y += 0.08;

        if (nigiriRef.current) nigiriRef.current.visible = st.kind < 2;
        if (makiRef.current) makiRef.current.visible = st.kind === 2;
        if (fishMat.current) {
          const c = FISH_COLORS[st.kind] || FISH_COLORS[0];
          fishMat.current.color.set(c);
          fishMat.current.emissive.set(c);
        }
      } else if (st.roarReq) {
        st.mode = "roar";
        st.t = 0;
        st.roarCool = 1.8;
      }
    }
    st.roarReq = false;

    if (st.mode === "feed") {
      st.t += dt;
      const t = st.t;

      const e1 = ease(seg(t, 0.35, 0.9)); // замах
      const e2 = easeOutCubic(seg(t, 0.9, 1.12)); // бросок
      const e3 = ease(seg(t, 1.2, 1.9)); // возврат
      const snap = seg(t, 1.12, 1.22);

      lunge = (-0.15 * e1 + 0.7 * e2) * (1 - e3);
      neckPitch = (-0.12 * e1 + 0.47 * e2) * (1 - e3);
      bodyPitch = 0.08 * e2 * (1 - e3);
      flare = (0.5 * e1 + 0.5 * e2) * (1 - e3);
      eyeBoost = 0.5 * e2 * (1 - e3);

      // крылья машут во время еды
      beat = ease(seg(t, 0.25, 0.6)) * (1 - ease(seg(t, 1.3, 2.1)));
      // фыркает перед броском
      snort = e1 * (1 - seg(t, 1.1, 1.25));

      if (t < 1.12) {
        jaw = JAW_OPEN * e1;
      } else if (t < 1.22) {
        jaw = lerp(JAW_OPEN, -0.12, snap); // ЗАХЛОПЫВАЕМ
      } else {
        const c = seg(t, 1.22, 1.9);
        jaw =
          -0.12 * (1 - c) +
          0.16 * (1 - c) * Math.max(0, Math.sin((t - 1.22) * 15)); // жуёт
      }

      if (!st.popFired && t > 0.02) {
        st.popFired = true;
        burstEmbers(st.sushiStart, 28, 1.1);
      }

      const sushi = sushiRef.current;
      if (sushi) {
        sushi.visible = t < 1.18;
        const pop = easeOutBack(seg(t, 0, 0.35));
        const f = ease(seg(t, 0.98, 1.14));
        sushi.position.copy(st.sushiStart);
        sushi.position.y += Math.sin(t * 5) * 0.03;
        if (f > 0) sushi.position.lerp(V.mouth, f);
        sushi.scale.setScalar(Math.max(0.0001, pop * (1 - f * 0.92)));
        sushi.rotation.y = t * 2.2;
      }

      if (!st.ateFired && t >= 1.14) {
        st.ateFired = true;
        window.dispatchEvent(
          new CustomEvent("dragon:ate", { detail: { kind: st.kind } })
        );
        burstEmbers(V.mouth, 44, 2.0);
        for (let i = 0; i < 12; i++) {
          smoke.emit(
            V.mouth.x,
            V.mouth.y,
            V.mouth.z,
            V.hf.x * 0.8 + rnd(-0.25, 0.25),
            V.hf.y * 0.8 + rnd(0.1, 0.5),
            V.hf.z * 0.8 + rnd(-0.25, 0.25),
            rnd(1.8, 3),
            0.1,
            rnd(0.4, 0.7),
            0.28,
            0.1
          );
        }
        st.shake = Math.max(st.shake, 0.35);
      }

      if (t >= 2.2) st.mode = "idle";
    } else if (st.mode === "roar") {
      st.t += dt;
      const t = st.t;
      const open = ease(seg(t, 0, 0.3)) * (1 - ease(seg(t, 1.25, 1.6)));

      jaw = JAW_OPEN * 1.15 * open;
      neckPitch = -0.3 * open;
      bodyPitch = -0.07 * open;
      lunge = -0.12 * open;
      flare = open;
      eyeBoost = open * 1.2;
      beat = open * 0.5;
      snort = open * 0.6;
      st.shake = Math.max(st.shake, 0.5 * open);

      if (t > 0.25 && t < 1.3) {
        st.fireAcc += dt * 140;
        while (st.fireAcc >= 1) {
          st.fireAcc -= 1;
          const sp = rnd(1.6, 3.6);
          embers.emit(
            V.mouth.x,
            V.mouth.y,
            V.mouth.z,
            V.hf.x * sp + rnd(-0.5, 0.5),
            V.hf.y * sp + rnd(0, 0.7),
            V.hf.z * sp + rnd(-0.5, 0.5),
            rnd(0.7, 1.7),
            rnd(0.05, 0.09),
            0.015,
            1,
            -0.4
          );
        }
      }

      if (t >= 1.7) st.mode = "idle";
    }

    if (sushiRef.current && st.mode !== "feed") sushiRef.current.visible = false;

    /* ---------- тело дракона ---------- */
    st.wingPhase += dt * (1.1 + 14 * beat);
    const liftY = beat * 0.05 * (0.5 + 0.5 * Math.sin(st.wingPhase));

    const fx = Math.sin(DRAGON_YAW);
    const fz = Math.cos(DRAGON_YAW);
    g.rotation.order = "YXZ";
    g.position.set(fx * lunge, Math.sin(time * 1.2) * 0.012 + liftY, fz * lunge);
    g.rotation.set(bodyPitch, DRAGON_YAW, 0);

    if (mainAction.current) mainAction.current.timeScale = 1 + eyeBoost * 0.3;

    /* ---------- кости ---------- */
    const rot = (name, axis, ang) => {
      const b = R.bones[name];
      if (!b) return;
      const r = R.rec[name];
      if (b.quaternion.equals(r.out)) b.quaternion.copy(r.base);
      else r.base.copy(b.quaternion);
      if (ang) rotateBone(b, scene, axis, ang);
      r.out.copy(b.quaternion);
    };

    // Шея: следит за курсором + движение при укусе/рыке
    const lookYaw = st.look.x * 0.35;
    const lookPitch = -st.look.y * 0.18 + neckPitch;
    BONES.neck.forEach(([name, w]) => {
      rot(name, AY, lookYaw * w);
      rot(name, AX, lookPitch * w);
    });

    // Челюсть и верх головы
    const openK = clamp(jaw / JAW_OPEN, 0, 1);
    rot(BONES.jaw, AX, JAW_DIR * jaw);
    rot(BONES.upper, AX, -JAW_DIR * 0.25 * openK);

    // Крылья: волна от плеча к кончику
    const amp = 0.035 + WING_BEAT * beat;
    BONES.wingR.forEach((name, i) => {
      const a =
        amp * Math.sin(st.wingPhase - i * 0.55) * WING_W[i] +
        (i === 0 ? flare * 0.25 : 0);
      rot(name, AZ, a);
    });
    BONES.wingL.forEach((name, i) => {
      const a =
        amp * Math.sin(st.wingPhase - i * 0.55) * WING_W[i] +
        (i === 0 ? flare * 0.25 : 0);
      rot(name, AZ, -a);
    });

    // Хвост
    BONES.tail.forEach((name, i) => {
      rot(name, AY, Math.sin(time * 0.8 - i * 0.45) * 0.05);
    });

    /* ---------- точки на голове в мировых координатах ---------- */
    const place = (a, out) => {
      if (!a) return;
      out.copy(a.off);
      a.bone.localToWorld(out);
    };
    place(A.eyeL, V.eyeL);
    place(A.eyeR, V.eyeR);
    place(A.nostL, V.nostL);
    place(A.nostR, V.nostR);
    place(A.mouth, V.mouth);
    place(A.headC, V.headC);
    V.hf.copy(V.mouth).sub(V.headC).normalize();
    _lat.copy(V.nostR).sub(V.nostL).normalize();

    /* ---------- глаза ---------- */
    const pulse = 1 + 0.12 * Math.sin(time * 2.3) + eyeBoost * 0.9;
    [V.eyeL, V.eyeR].forEach((p, i) => {
      const e = eyeRefs.current[i];
      if (e) {
        e.position.copy(p);
        e.scale.setScalar(pulse);
      }
      const gm = glowMats.current[i];
      if (gm) {
        gm.opacity = clamp(0.7 + 0.12 * Math.sin(time * 2.3 + i) + eyeBoost * 0.3, 0, 1);
      }
    });

    if (headLight.current) {
      headLight.current.position.copy(V.headC).addScaledVector(V.hf, 0.6);
      headLight.current.position.y += 0.35;
      headLight.current.intensity = 5 + eyeBoost * 9 + Math.sin(time * 2) * 0.8;
    }

    /* ---------- дым из носа (сильнее) ---------- */
    const exhale = Math.max(0, Math.sin(time * 1.1));
    st.smokeAcc += dt * (16 + 70 * exhale * exhale + 130 * snort);
    const noseSpeed = 0.4 + 0.5 * exhale + 0.6 * snort;
    while (st.smokeAcc >= 1) {
      st.smokeAcc -= 1;
      const left = Math.random() < 0.5;
      const p = left ? V.nostL : V.nostR;
      const side = left ? -0.09 : 0.09;
      smoke.emit(
        p.x,
        p.y,
        p.z,
        V.hf.x * noseSpeed + _lat.x * side + rnd(-0.08, 0.08),
        V.hf.y * noseSpeed + 0.2 + rnd(-0.05, 0.1),
        V.hf.z * noseSpeed + _lat.z * side + rnd(-0.08, 0.08),
        rnd(2.6, 4.4),
        0.07,
        rnd(0.45, 0.8),
        0.24,
        0.1
      );
    }

    // дым изо рта при рыке
    const roaring = st.mode === "roar" && st.t > 0.25 && st.t < 1.35;
    st.mouthSmokeAcc += dt * (roaring ? 90 : 0);
    while (st.mouthSmokeAcc >= 1) {
      st.mouthSmokeAcc -= 1;
      smoke.emit(
        V.mouth.x,
        V.mouth.y,
        V.mouth.z,
        V.hf.x * 1.3 + rnd(-0.1, 0.1),
        V.hf.y * 1.3 + 0.22,
        V.hf.z * 1.3 + rnd(-0.1, 0.1),
        rnd(2.4, 3.8),
        0.08,
        rnd(0.4, 0.75),
        0.24,
        0.1
      );
    }

    /* ---------- пыль и искры от взмахов крыльев ---------- */
    if (beat > 0.05) {
      st.dustAcc += dt * 70 * beat * Math.max(0, -Math.cos(st.wingPhase));
      const sx = Math.cos(DRAGON_YAW);
      const sz = -Math.sin(DRAGON_YAW);
      while (st.dustAcc >= 1) {
        st.dustAcc -= 1;
        const side = Math.random() < 0.5 ? -1 : 1;
        const lat = rnd(0.9, 2.2) * side;
        const al = rnd(-0.6, 1.4);
        const px = sx * lat + fx * al;
        const pz = sz * lat + fz * al;
        smoke.emit(
          px,
          gY + 0.06,
          pz,
          sx * side * rnd(0.5, 1.3) + fx * rnd(-0.2, 0.2),
          rnd(0.1, 0.35),
          sz * side * rnd(0.5, 1.3) + fz * rnd(-0.2, 0.2),
          rnd(1.4, 2.4),
          0.12,
          rnd(0.5, 0.9),
          0.16,
          0.05
        );
        if (Math.random() < 0.35) {
          embers.emit(
            px,
            gY + 0.1,
            pz,
            rnd(-0.3, 0.3),
            rnd(0.5, 1.4),
            rnd(-0.3, 0.3),
            rnd(1, 2.2),
            0.05,
            0.012,
            1,
            0.2
          );
        }
      }
    }

    /* ---------- искры по сцене ---------- */
    st.emberAcc += dt * 30;
    while (st.emberAcc >= 1) {
      st.emberAcc -= 1;
      embers.emit(
        rnd(-9, 9),
        gY + rnd(0, 1.5),
        rnd(-6, 4),
        rnd(-0.1, 0.1),
        rnd(0.25, 0.55),
        rnd(-0.1, 0.1),
        rnd(5, 9),
        rnd(0.035, 0.07),
        0.015,
        0.95,
        0
      );
    }

    const scalePx =
      (state.size.height * state.gl.getPixelRatio()) /
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    embers.update(dt, time, scalePx);
    smoke.update(dt, time, scalePx);

    /* ---------- камера (зависит от скролла) ---------- */
    if (!st.hsInit) {
      st.hs.copy(V.headC);
      st.hsInit = true;
    }
    st.hs.lerp(V.headC, 1 - Math.exp(-3 * dt));

    const p = progressRef?.current ?? 0;
    st.pS = damp(st.pS, p, 2.5, dt);
    const t = ease(seg(st.pS, 0.08, 0.6));

    _fwd.set(Math.sin(DRAGON_YAW), 0, Math.cos(DRAGON_YAW));
    _side.set(Math.cos(DRAGON_YAW), 0, -Math.sin(DRAGON_YAW));

    _closePos
      .copy(st.hs)
      .addScaledVector(_fwd, CLOSE_DIST)
      .addScaledVector(_side, CLOSE_SIDE);
    _closePos.y += CLOSE_UP;

    _dir.copy(st.hs).sub(_closePos).normalize();
    _right.crossVectors(_dir, UP).normalize();
    _closeTgt.copy(st.hs).addScaledVector(_right, -LOOK_SHIFT);

    _pos
      .copy(CAM_WIDE_POS)
      .lerp(_closePos, t)
      .addScaledVector(_side, Math.sin(t * Math.PI) * SWING);
    _tgt.copy(CAM_WIDE_TGT).lerp(_closeTgt, t);

    _dir.copy(_tgt).sub(_pos).normalize();
    _right.crossVectors(_dir, UP).normalize();
    const par = 1 - 0.6 * t;
    _pos.addScaledVector(_right, state.pointer.x * 0.35 * par);
    _pos.y += state.pointer.y * 0.15 * par;

    st.shake = Math.max(0, st.shake * Math.exp(-6 * dt));
    if (st.shake > 0.001) {
      _pos.x += rnd(-1, 1) * st.shake * 0.06;
      _pos.y += rnd(-1, 1) * st.shake * 0.06;
    }

    camera.position.copy(_pos);
    camera.lookAt(_tgt);
    const fov = lerp(FOV_WIDE, FOV_CLOSE, t);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <group ref={group}>
        <primitive object={scene} />
      </group>

      {/* мягкий контактный полумрак под драконом */}
      <mesh
        position={[0, groundY.current + 0.012, 0]}
        rotation={[-Math.PI / 2, 0, DRAGON_YAW]}
        scale={[3.6, 7.2, 1]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTex}
          color="#000000"
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* горящие глаза */}
      {[0, 1].map((i) => (
        <group key={i} ref={(el) => (eyeRefs.current[i] = el)}>
          <mesh>
            <sphereGeometry args={[0.026, 16, 12]} />
            <meshBasicMaterial color="#ffb347" toneMapped={false} />
          </mesh>
          <sprite scale={[0.36, 0.36, 1]}>
            <spriteMaterial
              ref={(m) => (glowMats.current[i] = m)}
              map={glowTex}
              color="#ff7a1a"
              blending={THREE.AdditiveBlending}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        </group>
      ))}

      <pointLight
        ref={headLight}
        color="#ff5a24"
        intensity={5}
        distance={6}
        decay={2}
      />

      {/* суши для кормления */}
      <group ref={sushiRef} visible={false}>
        <sprite scale={[1.2, 1.2, 1]}>
          <spriteMaterial
            map={glowTex}
            color="#ffb060"
            blending={THREE.AdditiveBlending}
            transparent
            opacity={0.8}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>

        <group ref={nigiriRef} rotation={[0.35, 0, 0]}>
          <mesh position={[0, 0.09, 0]}>
            <boxGeometry args={[0.36, 0.18, 0.2]} />
            <meshStandardMaterial
              color="#f6f1e6"
              emissive="#f6f1e6"
              emissiveIntensity={0.35}
              roughness={0.9}
            />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.42, 0.07, 0.24]} />
            <meshStandardMaterial
              ref={fishMat}
              color="#ff6a3d"
              emissive="#ff6a3d"
              emissiveIntensity={0.35}
              roughness={0.4}
            />
          </mesh>
        </group>

        <group ref={makiRef} rotation={[0.5, 0, 0]} visible={false}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.2, 28]} />
            <meshStandardMaterial
              color="#151a15"
              emissive="#223022"
              emissiveIntensity={0.4}
              roughness={0.8}
            />
          </mesh>
          <mesh position={[0, 0.205, 0]}>
            <cylinderGeometry args={[0.105, 0.105, 0.012, 24]} />
            <meshStandardMaterial
              color="#f6f1e6"
              emissive="#f6f1e6"
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh position={[0, 0.213, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.012, 20]} />
            <meshStandardMaterial
              color="#7bbf4a"
              emissive="#7bbf4a"
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      </group>

      {/* искры и дым */}
      <primitive object={smoke.points} />
      <primitive object={embers.points} />
    </>
  );
}

useGLTF.preload(MODEL_URL);