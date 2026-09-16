export const MOODS = {
  sunset: { ground:'#2a0f44', ground2:'#5a1648', wall:'#6a1a4a', wallHi:'#ff5a3c', glow:'#ff7a1a', accent:'#ff2e88' },
  violet: { ground:'#2a1155', ground2:'#4a1a8a', wall:'#5a2290', wallHi:'#c07bff', glow:'#8b2bff', accent:'#12e0ff' },
  toxic:  { ground:'#16260f', ground2:'#2e4a12', wall:'#3a5a1a', wallHi:'#c6ff2e', glow:'#c6ff2e', accent:'#12e0ff' },
  blood:  { ground:'#2a0818', ground2:'#4a0f26', wall:'#6a1230', wallHi:'#ff5a6a', glow:'#ff7a1a', accent:'#ff0a3c' }
};

export const MOOD_IDS = ['sunset', 'violet', 'toxic', 'blood'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; };
const rgbToHex = c => { const v = x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0'); return `#${v(c.r)}${v(c.g)}${v(c.b)}`; };

export function moodColor(moodId, key, pulse = 0) {
  const base = (MOODS[moodId] || MOODS.violet)[key] || '#ffffff';
  const c = hexToRgb(base);
  const k = 1 + 0.45 * clamp(pulse, 0, 1);
  return rgbToHex({ r: c.r * k, g: c.g * k, b: c.b * k });
}
