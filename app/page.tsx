"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { Environment } from "@react-three/drei";

import "./components/site.css";
import Dragon from "./components/Animal";
import Decor from "./components/Decor";
import SushiArt from "./components/SushiArt";
import SushiScroll from "./components/SushiScroll";
import Cart from "./components/Cart";
import Footer from "./components/Footer";
import { KatanaDivider, SliceTitle } from "./components/Katana";
import { SETS } from "./components/sets";

type NavId = "home" | "sets" | "menu" | "about";

export default function Home() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<number>(0);
  const stageRef = useRef<number>(0);
  const navRef = useRef<NavId>("home");
  const slashCount = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage, setStage] = useState(0); // 0 интро, 1 история, 2 меню
  const [activeNav, setActiveNav] = useState<NavId>("home");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [slash, setSlash] = useState<{ k: number; a: number } | null>(null);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartItems = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([k, q]) => ({ kind: Number(k), qty: q }));

  /* ---------- удар катаны по экрану ---------- */
  const doSlash = useCallback(() => {
    slashCount.current += 1;
    const dir = Math.random() < 0.5 ? -1 : 1;
    setSlash({ k: slashCount.current, a: dir * (22 + Math.random() * 18) });
    setTimeout(() => setSlash(null), 750);
  }, []);

  /* ---------- уведомление ---------- */
  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }, []);

  /* ---------- корзина ---------- */
  const addToCart = useCallback(
    (kind: number) => {
      setCart((c) => ({ ...c, [kind]: (c[kind] || 0) + 1 }));
      setBump(true);
      if (bumpTimer.current) clearTimeout(bumpTimer.current);
      bumpTimer.current = setTimeout(() => setBump(false), 450);
      showToast(`${SETS[kind]?.name ?? "SET"} ADDED`);
    },
    [showToast]
  );

  const changeQty = useCallback((kind: number, delta: number) => {
    setCart((c) => {
      const q = Math.max(0, (c[kind] || 0) + delta);
      const next = { ...c, [kind]: q };
      if (q === 0) delete next[kind];
      return next;
    });
  }, []);

  const checkout = () => {
    setCart({});
    setCartOpen(false);
    showToast("DEMO: ORDER SENT");
  };

  // Дракон съел суши -> корзина +1
  useEffect(() => {
    const onAte = (e: Event) => {
      addToCart((e as CustomEvent).detail?.kind ?? 0);
    };
    window.addEventListener("dragon:ate", onAte);
    return () => window.removeEventListener("dragon:ate", onAte);
  }, [addToCart]);

  /* ---------- свиток ---------- */
  const openSet = (i: number) => {
    doSlash();
    setTimeout(() => setOpenId(i), 220);
  };
  const closeSet = useCallback(() => setOpenId(null), []);

  /* ---------- навигация ---------- */
  const goTo = (id: NavId) => {
    const hero = sectionRef.current;
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (id === "menu" && hero) {
      const total = hero.offsetHeight - window.innerHeight;
      window.scrollTo({ top: hero.offsetTop + total * 0.8, behavior: "smooth" });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navClick = (e: MouseEvent, id: NavId) => {
    e.preventDefault();
    goTo(id);
  };

  /* ---------- свечение фона за мышкой ---------- */
  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    const el = sectionRef.current;
    if (!el) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    el.style.setProperty("--mx", `${50 + x * 6}%`);
    el.style.setProperty("--my", `${55 + y * 6}%`);
  };

  /* ---------- скролл: камера, стадии, активный пункт меню ---------- */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();
      const total = rect.height - vh;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;

      progressRef.current = p;
      el.style.setProperty("--p", p.toFixed(4));

      const next = p < 0.2 ? 0 : p < 0.5 ? 1 : 2;
      if (next !== stageRef.current) {
        stageRef.current = next;
        setStage(next);
      }

      // какой пункт навбара активен
      const y = window.scrollY;
      const heroEnd = el.offsetTop + total;
      const setsEl = document.getElementById("sets");
      const aboutEl = document.getElementById("about");
      let nav: NavId = "home";
      if (y < heroEnd - 1) nav = p >= 0.5 ? "menu" : "home";
      else if (aboutEl && y + vh * 0.55 >= aboutEl.offsetTop) nav = "about";
      else if (setsEl && y + vh * 0.5 >= setsEl.offsetTop) nav = "sets";

      if (nav !== navRef.current) {
        navRef.current = nav;
        setActiveNav(nav);
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
              <directionalLight position={[5, 3, -6]} intensity={4.5} color="#ff3b1f" />
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
                  <button
                    className="set-main"
                    onClick={() => openSet(i)}
                    aria-label={`Open details of ${s.name}`}
                  >
                    <h3>{s.name}</h3>
                    <p>{s.contents.map((c) => c[0]).slice(0, 2).join(" · ")}</p>
                  </button>
                  <strong className="set-price">{s.price} AZN</strong>
                  <button
                    className="feed-btn"
                    onClick={() => feed(i)}
                    aria-label={`Feed the dragon ${s.name}`}
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
          </div>
        </div>
      </section>

      <KatanaDivider />

      {/* INTRO */}

      <section className="intro" id="intro">

        <p>JAPANESE SUSHI EXPERIENCE</p>

        <h1>
          <SliceTitle>
            TASTE THE
            <span>DRAGON</span>
          </SliceTitle>
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
              <SliceTitle>
                SUSHI
                <span>SETS</span>
              </SliceTitle>
            </h2>
          </div>

          <p className="section-description">
            Carefully crafted sushi sets made for every occasion. Tap a set to unroll its scroll.
          </p>

        </div>

        <div className="sushi-grid">
          {SETS.map((s, i) => (
            <button
              className="sushi-card"
              key={s.id}
              onClick={() => openSet(i)}
              aria-label={`Open the scroll of ${s.name}`}
            >
              <div className="sushi-image">
                <span className="card-kanji" aria-hidden="true">{s.jp}</span>
                <SushiArt kind={s.kind} />
                <span className="card-more">OPEN THE SCROLL</span>
              </div>

              <div className="sushi-info">
                <div>
                  <p>{s.id}</p>
                  <h3>{s.name}</h3>
                </div>
                <strong>{s.price} AZN</strong>
              </div>
            </button>
          ))}
        </div>

      </section>

      <KatanaDivider />

      {/* PHILOSOPHY */}

      <section className="about-section" id="philosophy">

        <p>OUR PHILOSOPHY</p>

        <h2>
          <SliceTitle>
            TRADITION
            <br />
            MEETS
            <span>MODERN</span>
          </SliceTitle>
        </h2>

      </section>

      <KatanaDivider />

      {/* FOOTER с лампочкой */}
      <Footer />

      {/* NAVBAR (закреплён внизу) */}
      <nav className="navbar navbar-fixed">
        <div className="logo">
          DRAGON<span>SUSHI</span>
        </div>

        <div className="nav-links">
          <a
            href="#home"
            className={activeNav === "home" ? "active" : ""}
            onClick={(e) => navClick(e, "home")}
          >
            HOME
          </a>
          <a
            href="#sets"
            className={activeNav === "sets" ? "active" : ""}
            onClick={(e) => navClick(e, "sets")}
          >
            SETS
          </a>
          <a
            href="#menu"
            className={activeNav === "menu" ? "active" : ""}
            onClick={(e) => navClick(e, "menu")}
          >
            MENU
          </a>
          <a
            href="#about"
            className={activeNav === "about" ? "active" : ""}
            onClick={(e) => navClick(e, "about")}
          >
            ABOUT
          </a>
        </div>

        <button
          className={`cart ${bump ? "bump" : ""}`}
          onClick={() => setCartOpen(true)}
          aria-label="Open cart"
        >
          CART <span>{cartCount}</span>
        </button>
      </nav>

      {/* КОРЗИНА */}
      <Cart
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onChange={changeQty}
        onClear={() => setCart({})}
        onCheckout={checkout}
      />

      {/* СВИТОК с информацией о суши */}
      <SushiScroll
        item={openId === null ? null : SETS[openId]}
        onClose={closeSet}
        onAdd={addToCart}
      />

      {/* удар катаны по экрану */}
      {slash && (
        <div
          key={slash.k}
          className="slash-fx"
          style={{ "--a": `${slash.a}deg` } as CSSProperties}
        >
          <div className="slash-flash" />
          <div className="slash-blade" />
          <div className="slash-blade ghost" />
        </div>
      )}

      {/* уведомления */}
      <div className={`toast toast-fixed ${toast ? "on" : ""}`}>{toast}</div>

    </main>
  );
}