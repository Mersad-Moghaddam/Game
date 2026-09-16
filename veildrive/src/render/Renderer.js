import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VIRTUAL_W, VIRTUAL_H, VIEW_W, VIEW_H } from '../data/config.js';
import { LightingShader, CRTShader, MAX_LIGHTS } from './shaders.js';

export class Renderer {
  constructor(glCanvas) {
    this.available = false;
    this.canvas = glCanvas;
    this.w = VIRTUAL_W;
    this.h = VIRTUAL_H;
    this.ow = VIEW_W;
    this.oh = VIEW_H;
    this.quality = 1;
    this.postEnabled = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
    } catch (err) {
      this.error = err;
      return;
    }
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.ow, this.oh, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.albedo = makeLayer('#0b0416');
    this.albedo.texture.colorSpace = THREE.SRGBColorSpace;
    this.albedoMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: this.albedo.texture, depthTest: false, depthWrite: false })
    );
    this.scene.add(this.albedoMesh);

    this.emissive = makeLayer('#000000');
    this.emissive.texture.colorSpace = THREE.SRGBColorSpace;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.lightPass = new ShaderPass(LightingShader);
    this.lightPass.uniforms.tEmissive.value = this.emissive.texture;
    this.lightPass.uniforms.uResolution.value.set(this.w, this.h);
    this.composer.addPass(this.lightPass);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.ow, this.oh), 0.9, 0.55, 0.62);
    this.composer.addPass(this.bloom);
    this.crt = new ShaderPass(CRTShader);
    this.crt.uniforms.uResolution.value.set(this.ow, this.oh);
    this.composer.addPass(this.crt);
    this.composer.addPass(new OutputPass());
    this.glitchT = 0;

    this.available = true;
  }

  get albedoCtx() { return this.albedo.ctx; }
  get emissiveCtx() { return this.emissive.ctx; }

  render() {
    if (!this.available) return;
    const t = performance.now() / 1000;
    this.crt.uniforms.uTime.value = t;
    this.glitchT = Math.max(0, (this.glitchT || 0) - 0.016);
    this.crt.uniforms.uGlitch.value = this.glitchT > 0 ? Math.min(1, this.glitchT * 6) : 0;
    this.albedo.texture.needsUpdate = true;
    this.emissive.texture.needsUpdate = true;
    this.composer.render();
  }

  glitch(strength = 1) { this.glitchT = Math.max(this.glitchT || 0, 0.16 * strength); }

  setLights({ lights = [], ambient = 0.34, pulse = 0, flashPos = null, flashArc = 0.6 }) {
    if (!this.available) return;
    const u = this.lightPass.uniforms;
    const n = Math.min(lights.length, MAX_LIGHTS);
    for (let i = 0; i < n; i++) {
      u.uLightPos.value[i].set(lights[i].sx, lights[i].sy);
      u.uLightColor.value[i].set(lights[i].color);
      u.uLightData.value[i * 2] = lights[i].radius;
      u.uLightData.value[i * 2 + 1] = lights[i].intensity;
    }
    u.uLightCount.value = n;
    u.uAmbient.value = ambient;
    u.uPulse.value = pulse;
    if (flashPos) {
      u.uFlashPos.value.set(flashPos.sx, flashPos.sy);
      u.uFlashArc.value = flashArc;
      u.uFlashOn.value = 1;
    } else {
      u.uFlashOn.value = 0;
    }
  }

  setPost(on) {
    this.postEnabled = !!on;
    if (this.bloom) this.bloom.enabled = this.postEnabled;
    if (this.crt) this.crt.enabled = this.postEnabled;
  }
  // Toggle the chunky low-resolution world on/off at runtime. Off renders the
  // classic crisp 960x540 vector design; on renders 480x270 nearest-upscaled.
  setPixelMode(on) {
    if (!this.available) return;
    const w = on ? VIEW_W : VIRTUAL_W;
    const h = on ? VIEW_H : VIRTUAL_H;
    if (this.ow === w && this.oh === h) return;
    this.ow = w; this.oh = h;
    for (const layer of [this.albedo, this.emissive]) {
      layer.canvas.width = w; layer.canvas.height = h;
      layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
      layer.ctx.imageSmoothingEnabled = false;
      layer.texture.needsUpdate = true;
    }
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.crt.uniforms.uResolution.value.set(w, h);
    this.glitchT = 0;
  }
  setQuality(q) {
    this.quality = q;
    if (this.bloom) this.bloom.strength = q < 0.5 ? 0.5 : 0.9;
    if (this.crt) {
      const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.crt.uniforms.uScanline.value = (q < 0.5 || reduced) ? 0 : 0.10;
      this.crt.uniforms.uGrain.value = reduced ? 0 : 0.055;
      this.crt.uniforms.uLevels.value = (q < 0.5) ? 0 : 30;
    }
  }

  setSize() {
    if (!this.available) return;
    this.renderer.setSize(this.ow, this.oh, false);
    this.composer.setSize(this.ow, this.oh);
  }

  dispose() {
    if (this.available) this.renderer.dispose();
  }
}

function makeLayer(background) {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return { canvas, ctx, texture };
}
