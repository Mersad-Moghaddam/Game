import * as THREE from 'three';

export const MAX_LIGHTS = 16;

export const LightingShader = {
  uniforms: {
    tDiffuse: { value: null },
    tEmissive: { value: null },
    uAmbient: { value: 0.34 },
    uPulse: { value: 0 },
    uResolution: { value: new THREE.Vector2(960, 540) },
    uLightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector2()) },
    uLightColor: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Color()) },
    uLightData: { value: new Float32Array(MAX_LIGHTS * 2) },
    uLightCount: { value: 0 },
    uFlashPos: { value: new THREE.Vector2() },
    uFlashArc: { value: 0.6 },
    uFlashOn: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    #define MAX_LIGHTS ${MAX_LIGHTS}
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tEmissive;
    uniform float uAmbient;
    uniform float uPulse;
    uniform vec2  uResolution;
    uniform vec2  uLightPos[MAX_LIGHTS];
    uniform vec3  uLightColor[MAX_LIGHTS];
    uniform float uLightData[MAX_LIGHTS * 2];
    uniform int   uLightCount;
    uniform vec2  uFlashPos;
    uniform float uFlashArc;
    uniform float uFlashOn;

    void main(){
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      vec3 glow = texture2D(tEmissive, vUv).rgb;
      vec2 px = vUv * uResolution;

      vec3 light = vec3(uAmbient);
      for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        float radius = uLightData[i * 2];
        float intensity = uLightData[i * 2 + 1] * (1.0 + 0.5 * uPulse);
        float d = distance(px, uLightPos[i]);
        float atten = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);
        light += uLightColor[i] * atten * intensity;
      }
      if (uFlashOn > 0.5) {
        vec2 dir = normalize(px - uFlashPos);
        float cone = smoothstep(uFlashArc, 0.0, abs(dir.y));
        light += vec3(1.0, 0.85, 0.6) * cone * 0.35;
      }
      vec3 lit = base * light;
      lit = lit / (lit + vec3(0.55));
      vec3 outCol = lit * 1.5 + glow;
      outCol = mix(outCol, smoothstep(vec3(0.0), vec3(1.0), outCol), 0.12);
      gl_FragColor = vec4(outCol, 1.0);
    }
  `
};

export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(960, 540) },
    uAberration: { value: 0.85 },
    uScanline: { value: 0.10 },
    uGrain: { value: 0.05 },
    uVignette: { value: 0.4 },
    uBarrel: { value: 0.04 },
    uSaturation: { value: 1.28 },
    uContrast: { value: 1.06 },
    uLevels: { value: 30 },
    uGlitch: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uScanline, uGrain, uVignette, uBarrel, uSaturation, uContrast, uLevels, uGlitch;
    uniform vec2 uResolution;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main(){
      vec2 uv = vUv * 2.0 - 1.0;
      uv *= 1.0 + uBarrel * dot(uv, uv);
      uv = uv * 0.5 + 0.5;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }
      float gl = uGlitch * (0.5 + 0.5 * sin(uTime * 40.0));
      uv.x += gl * 0.012 * sin(uv.y * 60.0 + uTime * 30.0);

      vec2 dir = uv - 0.5;
      float ab = (uAberration + gl * 3.0) / uResolution.x;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ab).b;

      float scan = 1.0 - uScanline * (0.5 + 0.5 * sin(uv.y * uResolution.y * 1.6 + uTime * 3.0));
      col *= scan;

      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;

      // Palette limiting with a 2x2 ordered dither: gives the limited-colour,
      // banded pixel-art look instead of smooth photographic gradients.
      if (uLevels > 1.0) {
        vec2 pp = floor(vUv * uResolution);
        float d = (mod(pp.x, 2.0) + mod(pp.y, 2.0) * 2.0) / 4.0 - 0.375;
        col += d / uLevels;
        col = floor(col * uLevels + 0.5) / uLevels;
      }

      float vig = smoothstep(1.25, 0.35, length(dir));
      col *= mix(1.0, vig, uVignette);

      col += (hash(uv * uResolution + uTime) - 0.5) * uGrain;

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
