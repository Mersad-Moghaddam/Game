import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VIRTUAL_W, VIRTUAL_H } from '../data/config.js';
import { LightingShader, MAX_LIGHTS } from './shaders.js';

export class Renderer {
  constructor(glCanvas) {
    this.available = false;
    this.canvas = glCanvas;
    this.w = VIRTUAL_W;
    this.h = VIRTUAL_H;
    this.quality = 1;
    this.postEnabled = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
    } catch (err) {
      this.error = err;
      return;
    }
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.w, this.h, false);
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

    this.available = true;
  }

  get albedoCtx() { return this.albedo.ctx; }
  get emissiveCtx() { return this.emissive.ctx; }

  render() {
    if (!this.available) return;
    this.albedo.texture.needsUpdate = true;
    this.emissive.texture.needsUpdate = true;
    this.composer.render();
  }

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

  setPost(on) { this.postEnabled = !!on; }
  setQuality(q) { this.quality = q; }

  setSize() {
    if (!this.available) return;
    this.renderer.setSize(this.w, this.h, false);
    this.composer.setSize(this.w, this.h);
  }

  dispose() {
    if (this.available) this.renderer.dispose();
  }
}

function makeLayer(background) {
  const canvas = document.createElement('canvas');
  canvas.width = VIRTUAL_W;
  canvas.height = VIRTUAL_H;
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
