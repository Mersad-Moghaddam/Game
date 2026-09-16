import * as THREE from 'three';
import { VIRTUAL_W, VIRTUAL_H } from '../data/config.js';

export class Renderer {
  constructor(glCanvas) {
    this.available = false;
    this.canvas = glCanvas;
    this.w = VIRTUAL_W;
    this.h = VIRTUAL_H;
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
    const glowMat = new THREE.MeshBasicMaterial({
      map: this.emissive.texture, transparent: true, blending: THREE.AdditiveBlending,
      depthTest: false, depthWrite: false
    });
    this.emissiveMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMat);
    this.emissiveMesh.position.z = 0.1;
    this.scene.add(this.emissiveMesh);

    this.available = true;
  }

  get albedoCtx() { return this.albedo.ctx; }
  get emissiveCtx() { return this.emissive.ctx; }

  render() {
    if (!this.available) return;
    this.albedo.texture.needsUpdate = true;
    this.emissive.texture.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  setSize() {
    if (this.available) this.renderer.setSize(this.w, this.h, false);
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
