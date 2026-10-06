"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Environment } from "@react-three/drei";

import Dragon from "./components/Animal";
import Decor from "./components/Decor";

const SETS = [
  { id: "01", name: "DRAGON SET", price: "35 AZN", note: "8 pcs · salmon · tuna" },
  { id: "02", name: "SAKURA SET", price: "42 AZN", note: "12 pcs · shrimp · cream cheese" },
  { id: "03", name: "KYOTO SET", price: "48 AZN", note: "16 pcs · eel · avocado" },
];

export default function Home() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<number>(0);
  const stageRef = useRef<number>(0);

  const [stage, setStage] = useState(0); // 0 интро, 1 история, 2 меню
  const [cart, setCart] = useState(0);
  const [bump, setBump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Свечение фона следует за мышкой (дракон не двигается)
  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    const el = sectionRef.current;
    if (!el) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    el.style.setProperty("--mx", `${50 + x * 6}%`);
    el.style.setProperty("--my", `${55 + y * 6}%`);
  };

  // Прогресс скролла внутри героя -> камера и стадии
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;

      progressRef.current = p;
      el.style.setProperty("--p", p.toFixed(4));

      const next = p < 0.2 ? 0 : p < 0.5 ? 1 : 2;
      if (next !== stageRef.current) {
        stageRef.current = next;
        setStage(next);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Дракон съел суши -> корзина +1
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;

    const onAte = (e: Event) => {
      const kind = (e as CustomEvent).detail?.kind ?? 0;
      setCart((c) => c + 1);
      setBump(true);
      setToast(`${SETS[kind]?.name ?? "SET"} ADDED`);
      clearTimeout(t1);
      clearTimeout(t2);
      t1 = setTimeout(() => setBump(false), 450);
      t2 = setTimeout(() => setToast(null), 1900);
    };

    window.addEventListener("dragon:ate", onAte);
    return () => {
      window.removeEventListener("dragon:ate", onAte);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const feed = (kind: number) => {
    window.dispatchEvent(new CustomEvent("dragon:feed", { detail: { kind } }));
  };

  return (
    <main className="site">

      {/* HERO: сцена с драконом */}

      <section
        className="dragon-section"
        ref={sectionRef}
        onMouseMove={handleMouseMove}
      >
        <div className="dragon-sticky">

          {/* огромная надпись ЗА драконом */}
          <div className="hero-bg" aria-hidden="true">
            <span className="hero-kanji">龍</span>
            <span className="hero-word">DRAGON</span>
          </div>

          {/* туман позади */}
          <div className="fog fog-back">
            <span />
            <span />
            <span />
          </div>

          <Canvas
            className="dragon-canvas"
            style={{ position: "absolute", inset: 0, zIndex: 1 }}
            shadows
            camera={{ position: [0.6, 3.1, 9.4], fov: 34, near: 0.1, far: 200 }}
            dpr={[1, 2]}
          >
            <Suspense fallback={null}>
              {/* тёмный туман: дальние предметы уходят в сумрак */}
              <fog attach="fog" args={["#0c0605", 11, 26]} />

              <ambientLight intensity={0.35} />

              {/* тёплый основной свет спереди-слева (отбрасывает тени) */}
              <directionalLight
                position={[-5, 6, 4]}
                intensity={2.4}
                color="#ff9a6a"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-13}
                shadow-camera-right={13}
                shadow-camera-top={13}
                shadow-camera-bottom={-13}
                shadow-camera-near={0.5}
                shadow-camera-far={40}
                shadow-bias={-0.0004}
                shadow-normalBias={0.04}
              />
              {/* красный контровой свет сзади справа */}
              <directionalLight position={[5, 3, -6]} intensity={4.5} color="#ff3b1f" />
              {/* холодный контур слева сзади */}
              <directionalLight position={[-6, 3, -5]} intensity={1.6} color="#6a8cff" />

              <Decor />
              <Dragon progressRef={progressRef} />

              <Environment preset="city" />
            </Suspense>
          </Canvas>

          {/* туман перед драконом */}
          <div className="fog fog-front">
            <span />
            <span />
          </div>

          {/* тексты и меню */}
          <div className="hero-ui">

            <div className={`panel panel-intro ${stage === 0 ? "on" : ""}`}>
              <p className="eyebrow">JAPANESE SUSHI EXPERIENCE</p>
              <h1 className="hero-title">
                BORN IN <span>FIRE</span>
              </h1>
              <p className="panel-text">
                Click anywhere. Wake the dragon.
              </p>
            </div>

            <div className={`panel panel-story ${stage === 1 ? "on" : ""}`}>
              <p className="eyebrow">THE GUARDIAN</p>
              <h2 className="story-title">
                HE GUARDS
                <span>EVERY ROLL</span>
              </h2>
              <p className="panel-text">
                Every set is prepared under his watch. Scroll closer.
              </p>
            </div>

            <div className={`panel panel-menu ${stage === 2 ? "on" : ""}`}>
              <p className="eyebrow">FEED THE DRAGON</p>

              {SETS.map((s, i) => (
                <div className="set-row" key={s.id}>
                  <span className="set-num">{s.id}</span>
                  <div className="set-main">
                    <h3>{s.name}</h3>
                    <p>{s.note}</p>
                  </div>
                  <strong className="set-price">{s.price}</strong>
                  <button
                    className="feed-btn"
                    onClick={() => feed(i)}
                    aria-label={`Add ${s.name} to cart`}
                  >
                    FEED +
                  </button>
                </div>
              ))}
            </div>

            <div className={`scroll-hint ${stage === 0 ? "on" : ""}`}>
              <span>SCROLL</span>
              <i />
            </div>

            <div className={`toast ${toast ? "on" : ""}`}>{toast}</div>
          </div>

          {/* NAVBAR */}
          <nav className="navbar">
            <div className="logo">
              DRAGON<span>SUSHI</span>
            </div>

            <div className="nav-links">
              <a href="#home">HOME</a>
              <a href="#sets">SETS</a>
              <a href="#menu">MENU</a>
              <a href="#about">ABOUT</a>
            </div>

            <button className={`cart ${bump ? "bump" : ""}`}>
              CART <span>{cart}</span>
            </button>
          </nav>
        </div>
      </section>

      {/* INTRO */}

      <section className="intro" id="home">

        <p>JAPANESE SUSHI EXPERIENCE</p>

        <h1>
          TASTE THE
          <span>DRAGON</span>
        </h1>

        <div className="intro-line" />

        <p className="intro-description">
          Premium sushi sets inspired by Japanese tradition.
        </p>

      </section>

      {/* SUSHI */}

      <section className="sushi-section" id="sets">

        <div className="section-header">

          <div>
            <p>OUR COLLECTION</p>

            <h2>
              SUSHI
              <span>SETS</span>
            </h2>
          </div>

          <p className="section-description">
            Carefully crafted sushi sets made for every occasion.
          </p>

        </div>

        <div className="sushi-grid">

          <article className="sushi-card">
            <div className="sushi-image">
              <div className="sushi-placeholder">🍣</div>
            </div>
            <div className="sushi-info">
              <div>
                <p>01</p>
                <h3>DRAGON SET</h3>
              </div>
              <strong>35 AZN</strong>
            </div>
          </article>

          <article className="sushi-card">
            <div className="sushi-image">
              <div className="sushi-placeholder">🍱</div>
            </div>
            <div className="sushi-info">
              <div>
                <p>02</p>
                <h3>SAKURA SET</h3>
              </div>
              <strong>42 AZN</strong>
            </div>
          </article>

          <article className="sushi-card">
            <div className="sushi-image">
              <div className="sushi-placeholder">🍙</div>
            </div>
            <div className="sushi-info">
              <div>
                <p>03</p>
                <h3>KYOTO SET</h3>
              </div>
              <strong>48 AZN</strong>
            </div>
          </article>

        </div>

      </section>

      {/* ABOUT */}

      <section className="about-section" id="about">

        <p>OUR PHILOSOPHY</p>

        <h2>
          TRADITION
          <br />
          MEETS
          <span>MODERN</span>
        </h2>

      </section>

    </main>
  );
}