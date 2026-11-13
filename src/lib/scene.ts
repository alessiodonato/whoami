/**
 * Build-time generators for the scenery. Everything is seeded, so the Strait
 * looks the same on every build, and everything takes the number of stops,
 * so the scenery gets longer together with the path.
 */

import type { Stop } from '../data/journey.ts';

/** Small seeded random generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/**
 * A ridge of mountains as a faceted silhouette, in a 1000 x 100 box
 * that gets stretched to the width of its layer.
 */
export function ridgePath(
  seed: number,
  options: { peaks: number; low: number; high: number; massif?: number },
): string {
  const random = rng(seed);
  const { peaks, low, high, massif = 0 } = options;
  const steps = peaks * 2;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const edge = i === 0 || i === steps;
    const x = (i / steps) * 1000 + (edge ? 0 : (random() - 0.5) * (1000 / steps) * 0.7);
    // One broad hump under the peaks: the Aspromonte is a massif, not a saw.
    const hump = massif * Math.sin((x / 1000) * Math.PI * 1.15 + 0.5) ** 2;
    const peak = i % 2 === 1;
    const level = peak ? low + (high - low) * (0.4 + 0.6 * random()) : low * (0.55 + 0.6 * random());
    const y = 100 - Math.min(98, (level + hump) * 100);
    points.push(`L${f(x)} ${f(y)}`);
  }
  return `M0 100 ${points.join(' ')} L1000 100 Z`;
}

export interface Dot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lights of the towns across the water (Villa San Giovanni, then Reggio), in the same 1000 x 100 box. */
export function coastLights(seed: number, count: number): Dot[] {
  const random = rng(seed);
  const towns = [
    { at: 180, spread: 90, share: 0.3 },
    { at: 470, spread: 60, share: 0.15 },
    { at: 760, spread: 150, share: 0.55 },
  ];
  const dots: Dot[] = [];
  for (const town of towns) {
    const n = Math.round(count * town.share);
    for (let i = 0; i < n; i++) {
      const spread = (random() + random() + random()) / 3 - 0.5;
      dots.push({
        x: town.at + spread * 2 * town.spread,
        y: 97 - random() * random() * 26,
        w: 1.1 + random() * 0.9,
        h: 2.2,
      });
    }
  }
  return dots;
}

/** Short strokes on the water: smaller and closer together towards the horizon. */
export function seaStrokes(seed: number, count: number): Dot[] {
  const random = rng(seed);
  const strokes: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const depth = random() ** 1.7; // 0 = horizon, 1 = shore
    strokes.push({
      x: random() * 1000,
      y: 2 + depth * 92,
      w: 5 + depth * 16 + random() * 6,
      h: 0.7 + depth * 0.9,
    });
  }
  return strokes;
}

/** Stars as one box-shadow list: a single element instead of a hundred. */
export function starShadows(seed: number, count: number): string {
  const random = rng(seed);
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (random() * 100).toFixed(2);
    const y = (random() ** 1.3 * 82).toFixed(2);
    const size = random() > 0.85 ? 1 : 0;
    const alpha = (0.45 + random() * 0.55).toFixed(2);
    // cqw / cqh: measured against the sky itself, whatever its size in each layout
    shadows.push(`${x}cqw ${y}cqh 0 ${size}px rgb(245 241 232 / ${alpha})`);
  }
  return shadows.join(',');
}

/** What grows next to a stop. Picked from the id, so adding a stop never reshuffles the others. */
export type Greenery = 'palm' | 'palm-tall' | 'oleander' | 'none';

export function greeneryFor(stop: Stop): Greenery {
  let hash = 7;
  for (const char of stop.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const pick = hash % 5;
  if (pick === 0) return 'none';
  if (pick === 1) return 'oleander';
  if (pick === 2) return 'palm-tall';
  return 'palm';
}

/**
 * What the little man takes with him from a stop onwards: the baggage of the walk.
 * Keyed by stop id. Take a line out and he walks on without it; a stop that is not
 * listed here still makes him a little broader, like every other.
 */
export type Carry = 'dog' | 'orbit' | 'knot' | 'fork' | 'cross' | 'broom' | 'pump';

export const CARRY: Record<string, Carry> = {
  'it-consultant': 'dog', // the robot years: a four-legged robot trots behind him
  'automation-engineer': 'orbit', // automation: a cog keeps circling around him
  arricurdai: 'knot', // into the backpack: the knot, so as not to forget
  forchetta: 'fork', // a fork sticking out of it
  'pillole-di-llm': 'cross', // the pharmacy cross, sewn on as a patch
  'pulizia-mac': 'broom', // and a broom
  gym: 'pump', // the gym: one more size up
};

/** Which drawing a stop gets. A few stops have their own; every new one gets the default for its type. */
export type ArtKind =
  | 'sign'
  | 'lamp'
  | 'lamp-knot'
  | 'lamp-fork'
  | 'lamp-cross'
  | 'lamp-broom'
  | 'mirage'
  | 'mirage-wake'
  | 'mirage-barbell'
  | 'mirage-vinyl';

const OWN_ART: Record<string, ArtKind> = {
  arricurdai: 'lamp-knot', // a knot, so as not to forget ("arricurdari")
  forchetta: 'lamp-fork', // one handle, several tines
  'pillole-di-llm': 'lamp-cross', // pills: the pharmacy cross
  'pulizia-mac': 'lamp-broom',
  wakeboard: 'mirage-wake',
  gym: 'mirage-barbell',
  vinyl: 'mirage-vinyl',
};

const DEFAULT_ART: Record<Stop['type'], ArtKind> = {
  milestone: 'sign',
  project: 'lamp',
  secret: 'mirage',
};

export function artFor(stop: Stop): ArtKind {
  const own = OWN_ART[stop.id];
  if (own && own.startsWith(DEFAULT_ART[stop.type].split('-')[0])) return own;
  return DEFAULT_ART[stop.type];
}
