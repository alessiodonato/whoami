/**
 * The sky of the Strait, from dawn (0) to night (1).
 *
 * Six inks only, printed flat in bands like a screen print:
 * indigo #1b1f4b, azure #3d8bd4, coral #f0623f, peach #f8c9a4, violet #6b4c9a, moon #f5f1e8.
 * Every other colour here is one of them tinted with moon or printed over another.
 *
 * Used twice: at build time (page gradient for the static layout) and in the
 * browser (the scroll position picks the moment of the day).
 */

export interface SkyKey {
  /** Position along the walk, 0 to 1. */
  at: number;
  name: string;
  /** Five flat bands, from the top of the sky down to the horizon. */
  bands: [string, string, string, string, string];
  /** Calabria: the far ridge and the hills on the water. */
  coastFar: string;
  coastNear: string;
  sea: string;
  /** The short strokes on the water. */
  glint: string;
  /** The promenade and the face of the sea wall. */
  ground: string;
  wall: string;
  /** How much of the clouds is visible. */
  cloud: number;
}

export const SKY_KEYS: SkyKey[] = [
  {
    at: 0,
    name: 'dawn',
    bands: ['#8f94cc', '#bfa5d0', '#eba79c', '#f8c9a4', '#fce3c8'],
    coastFar: '#b49ac6',
    coastNear: '#7a5fa6',
    sea: '#8e9ad2',
    glint: '#f8c9a4',
    ground: '#f0dcd0',
    wall: '#d8bfc4',
    cloud: 0.55,
  },
  {
    at: 0.17,
    name: 'morning',
    bands: ['#5c9fdd', '#86b8e6', '#acd0ee', '#cfe3f4', '#eaf0f2'],
    coastFar: '#a3bfe3',
    coastNear: '#5e86c4',
    sea: '#4c95d8',
    glint: '#a9d0f0',
    ground: '#f2eadf',
    wall: '#d5d3d6',
    cloud: 0.95,
  },
  {
    at: 0.36,
    name: 'noon',
    bands: ['#3d8bd4', '#5a9ddb', '#7fb3e3', '#a6cbec', '#cfe3f4'],
    coastFar: '#8fb1dd',
    coastNear: '#4f7cc0',
    sea: '#2f7cc9',
    glint: '#86bae8',
    ground: '#f5f1e8',
    wall: '#d9d6d2',
    cloud: 1,
  },
  {
    at: 0.55,
    name: 'golden hour',
    bands: ['#4c84c8', '#8aa5d2', '#d2b8c8', '#f4c3a0', '#f8c9a4'],
    coastFar: '#d9a9a0',
    coastNear: '#c77b6b',
    sea: '#3f78bf',
    glint: '#f4c3a0',
    ground: '#f6dfc8',
    wall: '#e2bfa6',
    cloud: 0.9,
  },
  {
    at: 0.71,
    name: 'sunset',
    bands: ['#6b4c9a', '#9a5391', '#d45b6b', '#f0623f', '#f6965e'],
    coastFar: '#a0528f',
    coastNear: '#6b3a86',
    sea: '#4a3c8a',
    glint: '#f0623f',
    ground: '#d9a0a0',
    wall: '#a8698f',
    cloud: 0.5,
  },
  {
    at: 0.85,
    name: 'dusk',
    bands: ['#1b1f4b', '#2e2a66', '#4b3b84', '#6b4c9a', '#a9679b'],
    coastFar: '#3a2f70',
    coastNear: '#1b1f4b',
    sea: '#262a66',
    glint: '#6b4c9a',
    ground: '#4b4380',
    wall: '#352f6b',
    cloud: 0.12,
  },
  {
    at: 1,
    name: 'night',
    bands: ['#0d1030', '#111539', '#161b44', '#1b1f4b', '#252c62'],
    coastFar: '#1a1f4d',
    coastNear: '#0d1030',
    sea: '#121640',
    glint: '#3a4488',
    ground: '#20255a',
    wall: '#171b47',
    cloud: 0.05,
  },
];

export interface SkyState {
  bands: string[];
  coastFar: string;
  coastNear: string;
  sea: string;
  glint: string;
  ground: string;
  wall: string;
  cloud: number;
  /** 0 by day, 1 at night: stars, lights across the water. */
  night: number;
  /** Sun and moon: x in % of the width; lift 0 = sitting on the ridge of Calabria, 1 = top of the sky. */
  sunX: number;
  sunLift: number;
  moonX: number;
  moonLift: number;
}

type RGB = [number, number, number];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const cache = new Map<string, RGB>();
function rgb(hex: string): RGB {
  let value = cache.get(hex);
  if (!value) {
    const n = parseInt(hex.slice(1), 16);
    value = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(hex, value);
  }
  return value;
}

export function mix(from: string, to: string, t: number): string {
  const a = rgb(from);
  const b = rgb(to);
  return `rgb(${Math.round(lerp(a[0], b[0], t))} ${Math.round(lerp(a[1], b[1], t))} ${Math.round(lerp(a[2], b[2], t))})`;
}

/** The sky at a point of the walk. */
export function skyAt(progress: number): SkyState {
  const p = clamp01(progress);
  let i = 0;
  while (i < SKY_KEYS.length - 2 && p > SKY_KEYS[i + 1].at) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const t = clamp01((p - a.at) / (b.at - a.at));

  // The sun comes up from behind Calabria, climbs to the right (south) and leaves the frame:
  // from Messina it sets behind your back. The full moon rises where the sun did.
  const sun = clamp01(p / 0.44);
  const moon = clamp01((p - 0.76) / 0.24);

  return {
    bands: a.bands.map((color, k) => mix(color, b.bands[k], t)),
    coastFar: mix(a.coastFar, b.coastFar, t),
    coastNear: mix(a.coastNear, b.coastNear, t),
    sea: mix(a.sea, b.sea, t),
    glint: mix(a.glint, b.glint, t),
    ground: mix(a.ground, b.ground, t),
    wall: mix(a.wall, b.wall, t),
    cloud: lerp(a.cloud, b.cloud, t),
    night: smooth(0.76, 0.96, p),
    sunX: lerp(57, 86, sun),
    sunLift: lerp(0.02, 1.35, Math.sin((sun * Math.PI) / 2)),
    moonX: lerp(36, 42, moon),
    moonLift: lerp(-0.45, 0.78, Math.sin((moon * Math.PI) / 2)),
  };
}

/** The whole day as one tall gradient: the background of the static (no script, reduced motion) layout. */
export function pageGradient(): string {
  const stops = SKY_KEYS.map((key) => `${key.bands[2]} ${Math.round(key.at * 100)}%`);
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}
