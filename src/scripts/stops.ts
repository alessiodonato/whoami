/**
 * The stops: click or Enter opens the panel, arrow keys move from one to the next.
 * The page already holds every word; this only adds the buttons.
 */

import { goTo, reachableStops } from './nav.ts';

const panel = document.querySelector<HTMLDialogElement>('#panel');
const panelBody = document.querySelector<HTMLElement>('#panel-body');

/**
 * Opens the panel with a copy of a sign, this time with everything on it:
 * what was folded away (`.plate__more`) and what the sign keeps for the panel in a <template>.
 */
function openSign(sign: Element): boolean {
  if (!panel || !panelBody) return false;

  const copy = sign.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('template').forEach((extra) => extra.replaceWith(extra.content.cloneNode(true)));
  copy.querySelectorAll('[data-panel-skip], .plate__hint, .plate__open--pill').forEach((node) => node.remove());
  copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  copy.querySelectorAll('.plate__open').forEach((button) => button.replaceWith(...button.childNodes));
  copy.querySelector('h2')?.setAttribute('id', 'panel-title');

  panelBody.replaceChildren(...copy.childNodes);
  panelBody.scrollTop = 0;
  if (!panel.open) panel.showModal();
  return true;
}

/** Opens the panel of a stop. Returns false when there is no such stop to open. */
export function openStop(id: string): boolean {
  const plate = reachableStops()
    .find((candidate) => candidate.id === id)
    ?.querySelector('.plate');
  return plate ? openSign(plate) : false;
}

export function initStops(): void {
  if (!panel) return;

  for (const stop of document.querySelectorAll<HTMLElement>('[data-stop]')) {
    const plate = stop.querySelector<HTMLElement>('.plate');
    const title = stop.querySelector<HTMLElement>('[data-title-text]');
    if (!plate || !title) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'plate__open';
    button.setAttribute('aria-haspopup', 'dialog');
    button.textContent = title.textContent;
    button.addEventListener('click', () => openStop(stop.id));
    title.replaceChildren(button);

    let foot = plate.querySelector<HTMLElement>('.plate__foot');
    if (!foot) {
      foot = document.createElement('div');
      foot.className = 'plate__foot';
      plate.append(foot);
    }
    const hint = document.createElement('span');
    hint.className = 'plate__hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Details';
    foot.append(hint);
  }

  // The signs that are not stops (the first one, and "In short") open the same way.
  for (const sign of document.querySelectorAll<HTMLElement>('[data-sign]')) {
    const title = sign.querySelector<HTMLElement>('[data-title-text]');
    const foot = sign.querySelector<HTMLElement>('[data-sign-foot]') ?? sign;
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => openSign(sign));
    if (title) {
      // a sign with a title: the title is the button, and a "Details" tag says so
      button.className = 'plate__open';
      button.textContent = title.textContent;
      title.replaceChildren(button);
      const hint = document.createElement('span');
      hint.className = 'plate__hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = 'Details';
      foot.append(hint);
    } else {
      // a sign without one: the "Details" tag itself is the button
      button.className = 'plate__open plate__open--pill';
      button.textContent = 'Details';
      if (sign.dataset.signLabel) button.setAttribute('aria-label', sign.dataset.signLabel);
      foot.append(button);
    }
  }

  // Arrow keys walk from stop to stop.
  document.querySelector('#stops')?.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    const from = event.target as HTMLElement;
    if (!from.classList.contains('plate__open')) return;

    const buttons = reachableStops()
      .map((stop) => stop.querySelector<HTMLElement>('.plate__open'))
      .filter((b): b is HTMLElement => b !== null);
    const at = buttons.indexOf(from);
    let to = at;
    if (key === 'ArrowRight' || key === 'ArrowDown') to = at + 1;
    else if (key === 'ArrowLeft' || key === 'ArrowUp') to = at - 1;
    else if (key === 'Home') to = 0;
    else if (key === 'End') to = buttons.length - 1;
    else return;

    event.preventDefault();
    const next = buttons[Math.min(buttons.length - 1, Math.max(0, to))];
    if (!next || next === from) return;
    next.focus({ preventScroll: true });
    const stop = next.closest('[data-stop]');
    if (stop) goTo(stop);
  });

  // A click on the dimmed page around the panel closes it.
  panel.addEventListener('click', (event) => {
    if (event.target === panel) panel.close();
  });
}
