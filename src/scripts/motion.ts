/**
 * The walk. Loaded only when motion is welcome (never with prefers-reduced-motion).
 *
 *   wide screens  the stage is pinned; vertical scroll moves the scene sideways
 *                 on four layers (sky fixed, Calabria slow, sea faster, path 1:1)
 *   phones        the page scrolls as usual over a fixed scene
 *
 * In both, how far you have walked picks the time of day (src/lib/sky.ts),
 * lights the lamps you have reached, and moves the little man.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { skyAt } from '../lib/sky.ts';
import { goTo, isUnlocked, root, setGoer } from './nav.ts';

gsap.registerPlugin(ScrollTrigger);

const WIDE = '(min-width: 768px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)';
// "Narrow or low", written as a comma list on purpose: Safari before 16.4 does not know
// the `or` keyword, throws the whole query away, and the walk would never start on those phones.
const NARROW =
  '(prefers-reduced-motion: no-preference) and (max-width: 767.98px), ' +
  '(prefers-reduced-motion: no-preference) and (max-height: 559.98px)';

const one = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

interface Scene {
  stage: HTMLElement;
  sky: HTMLElement;
  coast: HTMLElement;
  sea: HTMLElement;
  promenade: HTMLElement;
  track: HTMLElement;
  pier: HTMLElement;
  walker: HTMLElement;
  stops: HTMLElement[];
}

function scene(): Scene | null {
  const parts = {
    stage: one('#stage'),
    sky: one('#sky'),
    coast: one('#coast'),
    sea: one('#sea'),
    promenade: one('#promenade'),
    track: one('#track'),
    pier: one('#pier'),
    walker: one('#walker'),
  };
  if (Object.values(parts).some((part) => part === null)) return null;
  return { ...(parts as Omit<Scene, 'stops'>), stops: [...document.querySelectorAll<HTMLElement>('[data-stop]')] };
}

/** Sets the colours of the moment on the four pieces of scenery (and nowhere else: the path has too many nodes to restyle every frame). */
function paintSky(s: Scene, progress: number): void {
  const now = skyAt(progress);
  const sky = s.sky.style;
  now.bands.forEach((color, i) => sky.setProperty(`--sky-${i + 1}`, color));
  sky.setProperty('--cloud-o', now.cloud.toFixed(3));
  sky.setProperty('--night', now.night.toFixed(3));
  sky.setProperty('--sun-x', now.sunX.toFixed(2));
  sky.setProperty('--sun-lift', now.sunLift.toFixed(4));
  sky.setProperty('--moon-x', now.moonX.toFixed(2));
  sky.setProperty('--moon-lift', now.moonLift.toFixed(4));

  const coast = s.coast.style;
  coast.setProperty('--coast-far', now.coastFar);
  coast.setProperty('--coast-near', now.coastNear);
  coast.setProperty('--night', now.night.toFixed(3));

  const sea = s.sea.style;
  sea.setProperty('--sea', now.sea);
  sea.setProperty('--glint', now.glint);
  sea.setProperty('--night', now.night.toFixed(3));

  const promenade = s.promenade.style;
  promenade.setProperty('--ground', now.ground);
  promenade.setProperty('--wall', now.wall);

  s.stage.classList.toggle('is-night', now.night > 0.5);
}

const SKY_PROPS = ['--sky-1', '--sky-2', '--sky-3', '--sky-4', '--sky-5', '--cloud-o', '--night', '--sun-x', '--sun-lift', '--moon-x', '--moon-lift', '--sun-intro', '--coast-far', '--coast-near', '--sea', '--glint', '--ground', '--wall', '--px', '--prom-end'];

function unpaint(s: Scene): void {
  for (const el of [s.sky, s.coast, s.sea, s.promenade]) {
    for (const prop of SKY_PROPS) el.style.removeProperty(prop);
    el.style.removeProperty('transform');
  }
  s.track.style.removeProperty('transform');
  s.walker.style.removeProperty('transform');
  s.stage.classList.remove('is-night');
  s.stops.forEach((stop) => stop.classList.remove('is-lit'));
  s.walker.querySelectorAll('.is-here').forEach((item) => item.classList.remove('is-here'));
}

/**
 * The little man: legs and arms swing with the distance covered, and come to rest when it stops growing.
 * So does what he carries: the robot dog trots in step, the cog moves along its orbit only while he walks.
 * And he grows: `grow` takes how built he should be (0 as he sets off, 1 after the last stop, a little
 * more after the gym); he gets there over a few frames, with a small pump every time he goes up a size.
 */
function makeWalker(el: HTMLElement, stride: number) {
  const one = <T extends Element>(selector: string) => el.querySelector<T>(selector);
  const all = <T extends Element>(selector: string) => [...el.querySelectorAll<T>(selector)];
  const rig = one<HTMLElement>('.walker__rig');
  const fig = one<SVGElement>('.walker__fig');
  const legFront = one<SVGGElement>('[data-limb="leg-front"]');
  const legBack = one<SVGGElement>('[data-limb="leg-back"]');
  const armFront = one<SVGGElement>('[data-limb="arm-front"]');
  const armBack = one<SVGGElement>('[data-limb="arm-back"]');
  const torso = one<SVGPathElement>('[data-part="torso"]');
  const traps = one<SVGPathElement>('[data-part="traps"]');
  const pack = one<SVGGElement>('[data-part="pack"]');
  const suitcase = one<SVGElement>('.walker__case');
  const upperArms = all<SVGPathElement>('.w-upper');
  const foreArms = all<SVGPathElement>('.w-fore');
  const thighs = all<SVGPathElement>('.w-thigh');
  const shins = all<SVGPathElement>('.w-shin');
  const dogTrunk = one<SVGGElement>('.d-trunk');
  const dogLegs = all<SVGGElement>('[data-dog]').map((leg) => ({
    leg,
    side: leg.getAttribute('data-dog') === 'a' ? 1 : -1,
    hip: leg.getAttribute('data-hip') ?? '0 0',
  }));
  const cogs = all<SVGGElement>('[data-orbit]').map((cog) => ({ cog, near: cog.getAttribute('data-orbit') === 'front' }));

  let phase = 0;
  let swing = 0; // 0 standing, 1 full stride
  let facing = 1;
  let orbit = 0.7; // where the cog is on its ellipse, in radians
  let lastStep = -1000;
  let resting = true;

  let build = 0; // how built he is right now
  let goal = 0; // how built he is becoming
  let drawn = -1; // the build last drawn
  let pump = 0; // the short swell when he goes up a size
  let armsOut = 0; // how far from the middle the arms hang (they move to his sides as the shoulders widen)
  let legsOut = 0;

  /** Redraws his body for the current build: broad shoulders, narrow waist, thick arms and thighs. */
  const shape = () => {
    const b = Math.round(build * 100) / 100;
    if (b === drawn) return;
    drawn = b;
    const shoulder = 11 + 10 * b;
    const waist = 11 - 2 * b;
    torso?.setAttribute(
      'd',
      `M${32 - shoulder} 46 Q${32 - shoulder} 34 32 34 Q${32 + shoulder} 34 ${32 + shoulder} 46 L${32 + waist} 82 H${32 - waist} Z`,
    );
    // the neck: nothing at first, a proper pair of traps at the end
    traps?.setAttribute('d', b < 0.05 ? '' : `M${32 - 3 - 9 * b} 37 L${32 - 3 - b} 27 H${32 + 3 + b} L${32 + 3 + 9 * b} 37 Z`);
    for (const arm of upperArms) arm.style.strokeWidth = String(6 + 9 * b);
    for (const arm of foreArms) arm.style.strokeWidth = String(6 + 4 * b);
    for (const leg of thighs) leg.style.strokeWidth = String(7 + 5 * b);
    for (const leg of shins) leg.style.strokeWidth = String(7 + 2 * b);
    armsOut = Math.min(1, b * 1.5) * (shoulder - 4);
    legsOut = 5 * Math.min(1, b);
    // the suitcase he pulls: carry-on size at the first stop, a trunk by the last
    if (suitcase) suitcase.style.height = `${(22 + 50 * Math.min(1, b) + 40 * Math.max(0, b - 1)).toFixed(1)}%`;
    // the backpack stays on his back as the back gets wider
    pack?.setAttribute('transform', `translate(${(11 - shoulder - 0.35 * armsOut).toFixed(2)} 0)`);
  };

  const pose = () => {
    const leg = Math.sin(phase) * 27 * swing;
    const arm = Math.sin(phase) * 22 * swing;
    const flare = Math.min(1, build) * 7; // big arms do not hang straight
    legFront?.setAttribute('transform', `translate(${legsOut.toFixed(2)} 0) rotate(${leg.toFixed(2)} 32 78)`);
    legBack?.setAttribute('transform', `translate(${(-legsOut).toFixed(2)} 0) rotate(${(-leg).toFixed(2)} 32 78)`);
    armFront?.setAttribute('transform', `translate(${armsOut.toFixed(2)} 0) rotate(${(-arm - flare).toFixed(2)} 32 46)`);
    armBack?.setAttribute('transform', `translate(${(-armsOut).toFixed(2)} 0) rotate(${(arm + flare).toFixed(2)} 32 46)`);
    const bob = Math.abs(Math.cos(phase)) * 2.2 * swing;
    if (fig) fig.style.transform = `translateY(${(-bob).toFixed(2)}px) scale(${(1 + 0.07 * pump).toFixed(4)})`;
    // turning round turns everything he carries with him
    if (rig) rig.style.transform = `scaleX(${facing})`;

    // the dog trots: diagonal legs move together
    const trot = Math.sin(phase) * 18 * swing;
    for (const { leg: dogLeg, side, hip } of dogLegs) dogLeg.setAttribute('transform', `rotate(${(trot * side).toFixed(2)} ${hip})`);
    dogTrunk?.setAttribute('transform', `translate(0 ${(-Math.abs(Math.sin(phase)) * 1.6 * swing).toFixed(2)})`);

    // the cog: behind his back on the far half of the orbit, in front of him on the near half
    const x = 32 + 38 * Math.cos(orbit);
    const y = 56 + 11 * Math.sin(orbit);
    const isNear = Math.sin(orbit) > 0;
    const spin = ((orbit * 180) / Math.PI) * 3;
    for (const { cog, near } of cogs) {
      cog.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${spin.toFixed(1)})`);
      cog.setAttribute('visibility', near === isNear ? 'visible' : 'hidden');
    }
  };

  shape();
  pose();

  return {
    /** Tell him how many pixels the ground moved under his feet. */
    step(distance: number) {
      if (Math.abs(distance) < 0.15) return;
      const steps = Math.abs(distance) / stride;
      phase += steps * Math.PI;
      orbit += steps * 0.5;
      facing = distance > 0 ? 1 : -1;
      lastStep = performance.now();
      resting = false;
    },
    /** Tell him how built he should be. */
    grow(target: number) {
      if (Math.abs(target - goal) < 0.001) return;
      if (target > goal) pump = 1;
      goal = target;
      resting = false;
    },
    /** Once per frame. */
    tick() {
      if (resting) return;
      const moving = performance.now() - lastStep < 110;
      swing += ((moving ? 1 : 0) - swing) * 0.2;
      build = Math.abs(goal - build) < 0.004 ? goal : build + (goal - build) * 0.09;
      pump = pump < 0.01 ? 0 : pump * 0.92;
      if (!moving && swing < 0.01 && build === goal && pump === 0) {
        swing = 0;
        resting = true;
      }
      shape();
      pose();
    },
    rest() {
      swing = 0;
      build = 0;
      goal = 0;
      pump = 0;
      resting = true;
      shape();
      pose();
      fig?.style.removeProperty('transform');
      rig?.style.removeProperty('transform');
      for (const part of [legFront, legBack, armFront, armBack, pack]) part?.removeAttribute('transform');
      for (const part of [...upperArms, ...foreArms, ...thighs, ...shins]) part.style.removeProperty('stroke-width');
      suitcase?.style.removeProperty('height');
    },
  };
}

/** What he carries, grouped by the stop that brings it. */
function baggage(s: Scene) {
  const byStop = new Map<number, Element[]>();
  for (const item of s.walker.querySelectorAll('[data-carry]')) {
    const index = s.stops.findIndex((stop) => stop.id === item.getAttribute('data-from'));
    if (index >= 0) byStop.set(index, [...(byStop.get(index) ?? []), item]);
  }
  return [...byStop].map(([index, items]) => ({
    index,
    items,
    pump: items.some((item) => item.getAttribute('data-carry') === 'pump'),
    on: false,
  }));
}

/**
 * How built he is, given the stops he has got to: one size per stop of the walk
 * (the mirages do not count), and one more if the gym is among the mirages and he has found it.
 */
function buildFor(s: Scene, arrived: (index: number) => boolean, loads: ReturnType<typeof baggage>): number {
  let stops = 0;
  let reached = 0;
  s.stops.forEach((stop, index) => {
    if (stop.dataset.type === 'secret') return;
    stops++;
    if (arrived(index)) reached++;
  });
  const gym = isUnlocked() && loads.some((load) => load.pump && arrived(load.index));
  return (stops ? reached / stops : 0) + (gym ? 0.25 : 0);
}

/* ------------------------------------------------------------------ */
/* wide screens: pinned stage, sideways walk                           */
/* ------------------------------------------------------------------ */

function walkSideways(s: Scene): () => void {
  root.classList.remove('mode-v');
  root.classList.add('mode-h');

  const walker = makeWalker(s.walker, 46);
  const loads = baggage(s);
  const state = { p: 0 };
  let view = 0; // width of the stage
  let travel = 1; // how far the path moves from the first screen to the last
  let coastTravel = 0;
  let seaTravel = 0;
  let anchor = 0; // where the little man stands
  let deck = 0; // where the promenade ends and the pier begins
  let reach = 0; // how close you must be for a lamp to come on
  let centers: number[] = [];
  let lit: boolean[] = [];
  let lastX = 0;
  let introX = 0;

  const measure = () => {
    view = s.stage.clientWidth;
    const origin = s.track.getBoundingClientRect().left;
    travel = Math.max(1, s.track.offsetWidth - view);
    coastTravel = Math.max(0, s.coast.offsetWidth - view);
    seaTravel = Math.max(0, s.sea.offsetWidth - view);
    anchor = view * 0.3;
    deck = s.pier.getBoundingClientRect().left - origin + view * 0.09;
    centers = s.stops.map((stop) => {
      const box = stop.getBoundingClientRect();
      return box.left - origin + box.width / 2;
    });
    reach = (s.stops[0]?.offsetWidth ?? 500) * 0.3;
  };

  const render = () => {
    const p = state.p;
    const x = p * travel;
    s.track.style.transform = `translate3d(${(-x).toFixed(2)}px,0,0)`;
    s.coast.style.transform = `translate3d(${(-p * coastTravel).toFixed(2)}px,0,0)`;
    s.sea.style.transform = `translate3d(${(-p * seaTravel).toFixed(2)}px,0,0)`;
    s.promenade.style.setProperty('--px', `${(-x).toFixed(1)}px`);
    s.promenade.style.setProperty('--prom-end', `${(deck - x).toFixed(1)}px`);
    paintSky(s, p);

    const here = x + anchor;
    for (let i = 0; i < centers.length; i++) {
      const on = here > centers[i] - reach;
      if (on !== lit[i]) {
        lit[i] = on;
        s.stops[i].classList.toggle('is-lit', on);
      }
    }

    // what he carries joins him as he gets to the stop that brings it, and stays behind if he walks back
    const arrived = (index: number) => here > centers[index] - reach * 0.2;
    for (const load of loads) {
      const on = arrived(load.index);
      if (on !== load.on) {
        load.on = on;
        load.items.forEach((item) => item.classList.toggle('is-here', on));
      }
    }
    walker.grow(buildFor(s, arrived, loads));

    walker.step(x - lastX);
    lastX = x;
  };

  measure();
  const tween = gsap.to(state, { p: 1, ease: 'none', paused: true, onUpdate: render });
  const trigger = ScrollTrigger.create({
    trigger: s.stage,
    start: 'top top',
    end: () => `+=${travel}`,
    pin: true,
    scrub: 0.55,
    animation: tween,
    invalidateOnRefresh: true,
    onRefreshInit: measure,
    onRefresh: render,
  });

  // "Take me to that stop" becomes a scroll position.
  const xOf = (target: Element): number => {
    const block = target.closest<HTMLElement>('[data-stop], .clue, .glance, .pier, .intro');
    if (!block || block.classList.contains('intro')) return 0;
    if (block.classList.contains('pier')) return travel;
    const origin = s.track.getBoundingClientRect().left;
    const box = (block.classList.contains('clue') ? (block.querySelector('.clue__boat') ?? block) : block).getBoundingClientRect();
    return clamp(box.left - origin + box.width / 2 - anchor, 0, travel);
  };
  setGoer((target) => {
    const top = trigger.start + (xOf(target) / travel) * (trigger.end - trigger.start);
    window.scrollTo({ top, behavior: 'auto' }); // the scrub above turns the jump into a glide
  });

  // Tabbing to something off screen must walk there, not shove the stage sideways.
  const onFocus = (event: FocusEvent) => {
    s.stage.scrollLeft = 0;
    s.stage.scrollTop = 0;
    const target = event.target as HTMLElement;
    if (target.matches(':focus-visible')) goTo(target);
  };
  s.track.addEventListener('focusin', onFocus);

  // The mirages keep their place on the path whether they show or not, so nothing needs measuring again:
  // drawing the frame once more is enough (the gym counts for his size only while it is there).
  // No ScrollTrigger.refresh() here: it takes the pinned stage out of the page for a moment,
  // and whoever pressed the feluca from the keyboard would lose the focus.
  const onMorgana = () => render();
  document.addEventListener('morgana', onMorgana);

  gsap.ticker.add(walker.tick);

  // The one staged moment: the sun comes up over Calabria and he walks into the frame.
  const opening = gsap.timeline({ paused: true });
  opening.fromTo(s.sky, { '--sun-intro': 0.2 }, { '--sun-intro': 0, duration: 2.6, ease: 'power2.out' }, 0);
  opening.fromTo(
    s.walker,
    { x: () => -(anchor + 90) },
    {
      x: 0,
      duration: 2.4,
      ease: 'power1.out',
      onUpdate() {
        const x = Number(gsap.getProperty(s.walker, 'x'));
        walker.step(x - introX);
        introX = x;
      },
    },
    0,
  );
  if (window.scrollY < 4) {
    introX = -(anchor + 90);
    opening.play();
  } else {
    opening.progress(1);
  }

  render();
  root.classList.add('is-ready');

  return () => {
    opening.kill();
    trigger.kill();
    tween.kill();
    gsap.ticker.remove(walker.tick);
    s.track.removeEventListener('focusin', onFocus);
    document.removeEventListener('morgana', onMorgana);
    setGoer(null);
    walker.rest();
    gsap.set(s.walker, { clearProps: 'transform' });
    unpaint(s);
    root.classList.remove('mode-h');
  };
}

/* ------------------------------------------------------------------ */
/* phones: the page scrolls, the scene stays                           */
/* ------------------------------------------------------------------ */

function walkDown(s: Scene): () => void {
  root.classList.remove('mode-h');
  root.classList.add('mode-v');

  const walker = makeWalker(s.walker, 30);
  const loads = baggage(s);
  const state = { p: 0 };
  let lastScroll = window.scrollY;

  const render = () => {
    paintSky(s, state.p);
    const width = window.innerWidth;
    const x = width * 0.06 + state.p * (width * 0.88 - s.walker.offsetWidth);
    s.walker.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
  };

  const tween = gsap.to(state, { p: 1, ease: 'none', paused: true, onUpdate: render });
  const day = ScrollTrigger.create({
    start: 0,
    end: 'max',
    scrub: 0.35,
    animation: tween,
    onUpdate(self) {
      const scroll = self.scroll();
      walker.step((scroll - lastScroll) * 0.5);
      lastScroll = scroll;
    },
  });

  // A lamp comes on when its stop is well inside the screen.
  // On the phone a stop counts as reached when it is well inside the screen: its lamp comes on,
  // what it brings joins him, and he goes up a size.
  const seen = new Set<number>();
  const reach = (index: number, on: boolean) => {
    if (on) seen.add(index);
    else seen.delete(index);
    s.stops[index].classList.toggle('is-lit', on);
    for (const load of loads) if (load.index === index) load.items.forEach((item) => item.classList.toggle('is-here', on));
    walker.grow(buildFor(s, (i) => seen.has(i), loads));
  };
  const lamps = s.stops.map((stop, index) =>
    ScrollTrigger.create({
      trigger: stop,
      start: 'top 72%',
      onEnter: () => reach(index, true),
      onLeaveBack: () => reach(index, false),
    }),
  );

  const onMorgana = () => {
    const focused = document.activeElement as HTMLElement | null;
    ScrollTrigger.refresh();
    walker.grow(buildFor(s, (i) => seen.has(i), loads));
    if (focused && focused !== document.activeElement && focused.isConnected) focused.focus({ preventScroll: true });
  };
  document.addEventListener('morgana', onMorgana);
  gsap.ticker.add(walker.tick);

  const opening = gsap.fromTo(s.sky, { '--sun-intro': 0.2 }, { '--sun-intro': 0, duration: 2.6, ease: 'power2.out', paused: window.scrollY > 4 });

  render();
  root.classList.add('is-ready');

  return () => {
    opening.kill();
    day.kill();
    tween.kill();
    lamps.forEach((lamp) => lamp.kill());
    gsap.ticker.remove(walker.tick);
    document.removeEventListener('morgana', onMorgana);
    walker.rest();
    unpaint(s);
    root.classList.remove('mode-v');
  };
}

export function initMotion(): void {
  const s = scene();
  if (!s) return;
  const media = gsap.matchMedia();
  media.add(WIDE, () => walkSideways(s));
  media.add(NARROW, () => walkDown(s));
}
