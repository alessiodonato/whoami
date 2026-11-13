/**
 * The secret level. A game, never a wall: everything that matters is on the page anyway.
 * Two ways in: click the feluca (click it again and she goes), or type her name in the terminal on the pier.
 * What appears is the Fata Morgana, the mirage the Strait of Messina is known for.
 */

import { goTo, isUnlocked, root } from './nav.ts';

const KEY = 'fata-morgana';

const count = () => document.querySelectorAll('[data-stop][data-type="secret"]').length;
const plural = (n: number) => (n === 1 ? 'one mirage' : `${n} mirages`);

function firstSecret(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-stop][data-type="secret"]');
}

/** Walks to the first mirage and puts the focus on it. */
export function goToMirage(): void {
  const stop = firstSecret();
  if (!stop) return;
  goTo(stop);
  stop.querySelector<HTMLElement>('.plate__open')?.focus({ preventScroll: true });
}

function showAsUnlocked(): void {
  const text = document.querySelector('#clue-text');
  if (text) text.textContent = `She is out tonight: ${plural(count())} on the water, a few steps ahead. Click the feluca again to send them away.`;
  document.querySelector('#clue-boat')?.setAttribute('aria-pressed', 'true');
}

let noticeTimer = 0;

function announce(message: string, offerTheWay: boolean): void {
  const notice = document.querySelector<HTMLElement>('#notice');
  if (!notice) return;
  window.clearTimeout(noticeTimer);
  if (offerTheWay) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Take me there';
    button.addEventListener('click', () => {
      notice.replaceChildren();
      goToMirage();
    });
    notice.replaceChildren(message, button);
  } else {
    notice.replaceChildren(message);
  }
  noticeTimer = window.setTimeout(
    () => {
      if (!notice.contains(document.activeElement)) notice.replaceChildren();
    },
    offerTheWay ? 12000 : 4000,
  );
}

/**
 * Calls the Fata Morgana. Returns false if she was already there.
 * `from` is where the visitor did it: in the vertical layout the mirages are
 * inserted above the terminal, and the page must not jump under their hands.
 */
export function unlock(from: 'boat' | 'terminal'): boolean {
  if (isUnlocked() || count() === 0) return false;

  const holdStill = from === 'terminal' ? document.querySelector('#terminal') : null;
  const before = holdStill?.getBoundingClientRect().top ?? 0;

  root.classList.add('is-unlocked');
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // private window or storage off: the mirage just won't be remembered
  }
  showAsUnlocked();

  if (holdStill) {
    const moved = holdStill.getBoundingClientRect().top - before;
    if (Math.abs(moved) > 1) window.scrollBy({ top: moved, behavior: 'auto' });
  }

  document.dispatchEvent(new CustomEvent('morgana'));
  if (from === 'boat') announce(`Fata Morgana. ${plural(count())} appeared over the water.`, true);
  return true;
}

/** Puts the secret away again (the terminal knows how). */
export function lock(): boolean {
  if (!isUnlocked()) return false;
  root.classList.remove('is-unlocked');
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to forget
  }
  const text = document.querySelector('#clue-text');
  if (text) text.textContent = 'Some evenings the Strait shows things that are not there. The crew of the feluca swears by it.';
  document.querySelector('#clue-boat')?.setAttribute('aria-pressed', 'false');
  document.dispatchEvent(new CustomEvent('morgana'));
  return true;
}

export function initSecrets(): void {
  const boat = document.querySelector<HTMLButtonElement>('#clue-boat');
  if (!boat) return;
  boat.disabled = false;
  boat.setAttribute('aria-pressed', String(isUnlocked()));
  boat.addEventListener('click', () => {
    if (isUnlocked()) {
      lock();
      announce('The mirages are gone. The feluca can call them back.', false);
    } else {
      unlock('boat');
    }
  });
  if (isUnlocked()) showAsUnlocked();
}
