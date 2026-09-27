const VERTEX_SHADER = `
attribute vec2 aPos;
void main() { 
  gl_Position = vec4(aPos, 0.0, 1.0); 
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 uSize;      
uniform float uCell;     
uniform float uTime;     
uniform vec3 uInkA;      
uniform vec3 uInkB;      
uniform vec4 uCalm;      
uniform vec3 uMouse;     
uniform float uBias;     
uniform float uScroll;   
uniform float uBottom;   
uniform float uDetail;   

float bayer2(vec2 a) { 
  a = floor(a); 
  return fract(a.x / 2.0 + a.y * a.y * 0.75); 
}

float bayer4(vec2 a) { 
  return bayer2(0.5 * a) * 0.25 + bayer2(a); 
}

float bayer8(vec2 a) { 
  return bayer4(0.5 * a) * 0.25 + bayer2(a); 
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 cellCoord = floor(gl_FragCoord.xy / uCell);
  vec2 uv = (cellCoord * uCell) / uSize;
  float aspect = uSize.x / uSize.y;

  vec2 p = vec2(uv.x * aspect, uv.y);

  float mouseAura = 0.0;
  if (uMouse.z > 0.001) {
    vec2 dm = p - vec2(uMouse.x * aspect, uMouse.y);
    float mouseDist2 = dot(dm, dm);
    
    p += dm * exp(-mouseDist2 * 7.0) * 0.28 * uMouse.z;
    
    mouseAura = exp(-mouseDist2 * 14.0) * 0.38 * uMouse.z;
  }

  float w1 = sin(dot(p, normalize(vec2(0.55, 1.0))) * 5.2 - uTime * 0.12);
  float w2 = sin(dot(p, normalize(vec2(1.0, 0.28))) * 8.4 + uTime * 0.08);
  float w3 = sin(p.y * 4.5 - uTime * 0.15);
  
  float wLeft1 = sin(p.y * 5.2 - uTime * 0.12);
  float wLeft2 = sin(p.y * 11.4 + uTime * 0.15 + p.x * 3.0);
  float wLeft3 = cos(p.y * 18.6 - uTime * 0.18);
  float wLeft4 = sin(p.y * 28.0 + uTime * 0.22);
  
  float wBottom1 = sin(p.x * 4.6 + uTime * 0.11);
  float wBottom2 = sin(p.x * 8.4 - uTime * 0.08);
  float wBottom3 = cos(p.x * 14.2 + uTime * 0.14);
  
  float waveHero = uBias + 0.22 * w1 + 0.14 * w2 + mouseAura;
  float waveLateral = (uBias * 0.90) + 0.10 * wLeft1 + 0.08 * wLeft2 + 0.05 * wLeft3 + 0.03 * wLeft4 + mouseAura;
  float waveBottom = uBias + 0.20 * wBottom1 + 0.12 * wBottom2 + 0.06 * wBottom3 + mouseAura;
  float waveDetail = 0.52 + 0.08 * wBottom1 + mouseAura;

  float heroBoundary = 0.52 + 0.045 * w1 + 0.025 * w3;
  float distHero = uv.x - heroBoundary;

  float leftBoundary = 0.055 + 0.016 * wLeft1 + 0.010 * wLeft2 + 0.005 * wLeft3;
  float distLeft = leftBoundary - uv.x;

  float distBody = mix(distHero, distLeft, uScroll);
  float waveBody = mix(waveHero, waveLateral, uScroll);

  float bottomBase = mix(mix(0.06, 0.40, uBottom), 0.070, uDetail);
  float bottomHarmonics = (0.030 * wBottom1 + 0.018 * wBottom2 + 0.008 * wBottom3) * mix(1.0, 0.40, uDetail);
  float bottomBoundary = bottomBase + bottomHarmonics;
  float distBottom = bottomBoundary - uv.y;

  float bottomFactor = clamp(max(uBottom, uDetail), 0.0, 1.0);

  float distEffective = mix(distBody, distBottom, bottomFactor);
  float waveEffective = mix(waveBody, mix(waveBottom, waveDetail, uDetail), bottomFactor);

  if (distEffective < -0.030) {
    gl_FragColor = vec4(uInkB, 1.0);
    return;
  }

  float borderFalloff = smoothstep(-0.030, 0.10, distEffective);

  float pixelGrain = (hash(cellCoord) - 0.5) * 0.38;
  float scatterZone = smoothstep(-0.030, 0.07, distEffective);
  
  float edgeBlend = clamp(borderFalloff + pixelGrain * scatterZone, 0.0, 1.0);
  float v = waveEffective * edgeBlend;

  float heroTextSafe = mix(smoothstep(0.40, 0.49, uv.x), 1.0, uScroll);
  v = v * heroTextSafe;

  float bodyTextSafe = mix(1.0, 1.0 - smoothstep(0.065, 0.10, uv.x), uScroll * (1.0 - bottomFactor));
  v = v * bodyTextSafe;

  float detailTextSafe = mix(1.0, 1.0 - smoothstep(0.065, 0.095, uv.y), uDetail);
  v = v * detailTextSafe;

  if (uCalm.z > 0.0) {
    vec2 d = vec2((uv.x - uCalm.x) / uCalm.z, (uv.y - uCalm.y) / uCalm.w);
    v += 2.0 * (1.0 - smoothstep(0.75, 1.0, length(d)));
  }

  float threshold = bayer8(cellCoord);
  vec3 ink = v > threshold ? uInkA : uInkB;
  gl_FragColor = vec4(ink, 1.0);
}
`;

export class DitherWaveBackground {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return;

    this.color = options.color || '#1f2de6';
    this.paperColor = options.paperColor || '#f4f5f8';
    this.pixelSize = options.pixelSize || 2.5;
    this.density = options.density !== undefined ? options.density : 0.74;
    this.speed = options.speed || 1.0;
    this.interactive = options.interactive !== false;

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.className = 'dither-wave-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.opacity = '0';
    this.canvas.style.transition = 'opacity 0.6s ease-out';

    this.container.appendChild(this.canvas);

    this.gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!this.gl) {
      console.warn('WebGL not supported');
      return;
    }

    this.mouse = { x: 0.5, y: 0.5, strength: 0 };
    this.targetMouse = { x: 0.5, y: 0.5, strength: 0 };
    this.scrollY = 0;
    this.targetScroll = 0;
    this.bottom = 0;
    this.targetBottom = 0;
    this.detail = 0;
    this.targetDetail = 0;
    this.elapsed = 0;
    this.lastTime = performance.now();
    this.running = false;
    this.visible = false;
    this.inside = false;

    this.initGL();
    this.initEvents();

    window.__ditherWave = this;
  }

  parseRgb(value, fallback = '#1f2de6') {
    const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  }

  initGL() {
    const gl = this.gl;
    const program = gl.createProgram();

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const frag = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vert || !frag) return;

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      uSize: gl.getUniformLocation(program, 'uSize'),
      uCell: gl.getUniformLocation(program, 'uCell'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uBias: gl.getUniformLocation(program, 'uBias'),
      uInkA: gl.getUniformLocation(program, 'uInkA'),
      uInkB: gl.getUniformLocation(program, 'uInkB'),
      uCalm: gl.getUniformLocation(program, 'uCalm'),
      uScroll: gl.getUniformLocation(program, 'uScroll'),
      uBottom: gl.getUniformLocation(program, 'uBottom'),
      uDetail: gl.getUniformLocation(program, 'uDetail'),
    };

    this.updateColors();
    gl.uniform4f(this.uniforms.uCalm, 0, 0, 0, 0);
    gl.uniform1f(this.uniforms.uBias, Math.max(0, Math.min(1, this.density)));
    gl.uniform1f(this.uniforms.uScroll, 0.0);
    gl.uniform1f(this.uniforms.uBottom, 0.0);
    gl.uniform1f(this.uniforms.uDetail, 0.0);

    this.resize();
    this.canvas.style.opacity = '1';
  }

  setDetailMode(isActive) {
    this.targetDetail = isActive ? 1.0 : 0.0;
  }

  updateColors(color, paperColor) {
    if (color) this.color = color;
    if (paperColor) this.paperColor = paperColor;

    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniform3fv(this.uniforms.uInkA, this.parseRgb(this.color, '#1f2de6'));
    gl.uniform3fv(this.uniforms.uInkB, this.parseRgb(this.paperColor, '#f4f5f8'));
    this.draw();
  }

  syncWithTheme(isDark) {
    if (isDark) {
      this.updateColors('#38bdf8', '#090b10');
    } else {
      this.updateColors('#1f2de6', '#f4f5f8');
    }
  }

  resize() {
    if (!this.container || !this.canvas || !this.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(this.container.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.container.clientHeight * dpr));

    this.canvas.width = width;
    this.canvas.height = height;

    this.gl.viewport(0, 0, width, height);
    this.gl.uniform2f(this.uniforms.uSize, width, height);
    this.gl.uniform1f(this.uniforms.uCell, Math.max(1, this.pixelSize) * dpr);
    this.draw();
  }

  draw() {
    if (!this.gl || !this.program) return;
    this.gl.uniform1f(this.uniforms.uTime, this.elapsed);
    this.gl.uniform3f(this.uniforms.uMouse, this.mouse.x, this.mouse.y, this.mouse.strength);
    if (this.uniforms.uScroll) {
      this.gl.uniform1f(this.uniforms.uScroll, this.scrollY);
    }
    if (this.uniforms.uBottom) {
      this.gl.uniform1f(this.uniforms.uBottom, this.bottom);
    }
    if (this.uniforms.uDetail) {
      this.gl.uniform1f(this.uniforms.uDetail, this.detail);
    }
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  tick(now) {
    if (!this.running) return;

    const delta = Math.min(50, now - this.lastTime);
    this.lastTime = now;
    this.elapsed += (delta / 1000) * this.speed;

    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.12;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.12;
    this.mouse.strength += (this.targetMouse.strength - this.mouse.strength) * 0.1;
    this.scrollY += (this.targetScroll - this.scrollY) * 0.10;
    this.bottom += (this.targetBottom - this.bottom) * 0.10;
    this.detail += (this.targetDetail - this.detail) * 0.10;

    this.draw();
    this.animationId = requestAnimationFrame((t) => this.tick(t));
  }

  setRunning(state) {
    if (state && !this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.animationId = requestAnimationFrame((t) => this.tick(t));
    } else if (!state && this.running) {
      this.running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  }

  initEvents() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.setRunning(this.visible && !document.hidden);
    });
    this.intersectionObserver.observe(this.container);

    this.onScroll = () => {
      const heroHeight = Math.max(1, window.innerHeight * 0.6);
      this.targetScroll = Math.max(0, Math.min(1, window.scrollY / heroHeight));

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 50) {
        const scrollPercent = window.scrollY / docHeight;
        this.targetBottom = Math.max(0, Math.min(1, (scrollPercent - 0.80) / 0.18));
      } else {
        this.targetBottom = 0;
      }
    };
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();

    this.onPointerMove = (e) => {
      if (!this.interactive || e.pointerType === 'touch') return;
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - (e.clientY / window.innerHeight);

      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        this.targetMouse.x = x;
        this.targetMouse.y = y;
        this.targetMouse.strength = 1.0;
        this.inside = true;
      } else if (this.inside) {
        this.inside = false;
        this.targetMouse.strength = 0;
      }
    };

    this.onPointerLeave = () => {
      this.inside = false;
      this.targetMouse.strength = 0;
    };

    this.onVisibilityChange = () => {
      if (document.hidden) {
        this.setRunning(false);
      } else if (this.visible) {
        this.setRunning(true);
      }
    };

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    document.addEventListener('mouseleave', this.onPointerLeave);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.setRunning(true);
  }

  destroy() {
    this.setRunning(false);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('scroll', this.onScroll);
    document.removeEventListener('mouseleave', this.onPointerLeave);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
