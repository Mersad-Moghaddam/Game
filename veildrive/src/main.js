import { Game } from './core/Game.js';
import { Renderer } from './render/Renderer.js';

const canvas = document.getElementById('game');
const glCanvas = document.getElementById('gl');

let renderer = new Renderer(glCanvas);
if (renderer.available) {
  canvas.style.display = 'none';
  glCanvas.style.display = 'block';
} else {
  glCanvas.style.display = 'none';
  renderer = null;
}

const game = new Game(canvas, renderer);
game.start();
window.__VEILDRIVE__ = game;
