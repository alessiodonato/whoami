/**
 * "Take me to that stop." How to get there depends on the layout:
 * the vertical page just scrolls to it, the sideways walk (motion.ts)
 * turns it into a scroll position and registers its own way here.
 */

export type Goer = (target: Element) => void;

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const byScrolling: Goer = (target) => {
  target.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' });
};

let goer: Goer = byScrolling;

export function setGoer(next: Goer | null): void {
  goer = next ?? byScrolling;
}

export function goTo(target: Element): void {
  goer(target);
}

export const root = document.documentElement;

export const isUnlocked = () => root.classList.contains('is-unlocked');

/** The stops a visitor can reach right now: the secret ones only after the Fata Morgana. */
export function reachableStops(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-stop]')].filter(
    (stop) => stop.dataset.type !== 'secret' || isUnlocked(),
  );
}
