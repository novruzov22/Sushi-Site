import * as THREE from "three";

let _soft = null;

// Мягкий круглый градиент (для искр, дыма, свечения)
export function getSoftTex() {
  if (!_soft) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    _soft = new THREE.CanvasTexture(c);
  }
  return _soft;
}

const VERT = `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  varying float vA;
  void main() {
    vA = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(aSize * uScale / max(-mv.z, 0.1), 0.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = `
  uniform sampler2D uTex;
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float t = texture2D(uTex, gl_PointCoord).a;
    gl_FragColor = vec4(uColor, t * vA);
    if (gl_FragColor.a < 0.003) discard;
    #include <colorspace_fragment>
  }
`;

// Пул частиц: искры и дым
export class Pool {
  constructor(max, opts = {}) {
    const {
      additive = true,
      color = "#ffffff",
      drag = 0.3,
      flicker = false,
    } = opts;

    this.max = max;
    this.cursor = 0;
    this.drag = drag;
    this.flicker = flicker;

    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.ph = new Float32Array(max);
    this.lf = new Float32Array(max);
    this.aSize = new Float32Array(max);
    this.aAlpha = new Float32Array(max);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(this.aSize, 1).setUsage(THREE.DynamicDrawUsage)
    );
    this.geometry.setAttribute(
      "aAlpha",
      new THREE.BufferAttribute(this.aAlpha, 1).setUsage(THREE.DynamicDrawUsage)
    );

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: getSoftTex() },
        uColor: { value: new THREE.Color(color) },
        uScale: { value: 1000 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
  }

  emit(x, y, z, vx, vy, vz, ttl, size0, size1, alpha, lift = 0) {
    const i = this.cursor;
    this.cursor = (i + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x;
    this.pos[i3 + 1] = y;
    this.pos[i3 + 2] = z;
    this.vel[i3] = vx;
    this.vel[i3 + 1] = vy;
    this.vel[i3 + 2] = vz;
    this.life[i] = 0;
    this.maxLife[i] = ttl;
    this.s0[i] = size0;
    this.s1[i] = size1;
    this.a0[i] = alpha;
    this.ph[i] = Math.random() * 6.283;
    this.lf[i] = lift;
  }

  update(dt, time, scalePx) {
    const { pos, vel, life, maxLife, s0, s1, a0, ph, lf, aSize, aAlpha } = this;

    for (let i = 0; i < this.max; i++) {
      const ml = maxLife[i];
      if (life[i] >= ml) {
        aAlpha[i] = 0;
        aSize[i] = 0;
        continue;
      }

      life[i] += dt;
      const t = life[i] / ml;
      if (t >= 1) {
        life[i] = ml;
        aAlpha[i] = 0;
        aSize[i] = 0;
        continue;
      }

      const i3 = i * 3;
      vel[i3 + 1] += lf[i] * dt;
      const d = Math.max(0, 1 - this.drag * dt);
      vel[i3] *= d;
      vel[i3 + 1] *= d;
      vel[i3 + 2] *= d;

      pos[i3] += vel[i3] * dt + Math.sin(time * 1.3 + ph[i]) * 0.12 * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt + Math.cos(time * 1.1 + ph[i]) * 0.12 * dt;

      aSize[i] = s0[i] + (s1[i] - s0[i]) * t;

      let a = a0[i] * Math.pow(1 - t, 1.4) * Math.min(1, t * 8);
      if (this.flicker) a *= 0.65 + 0.35 * Math.sin(time * 9 + ph[i] * 3);
      aAlpha[i] = a;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.material.uniforms.uScale.value = scalePx;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}