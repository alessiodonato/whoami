/**
 * Entry point. The page works without any of this; scripts add the panel,
 * the terminal, the secret, and (only when motion is welcome) the walk itself.
 */

import { goTo, root } from './nav.ts';
import { initSecrets } from './secrets.ts';
import { initStops } from './stops.ts';
import { initTerminal } from './terminal.ts';

initStops();
initSecrets();
initTerminal();

// Links inside the page ("Skip to the contacts"): walk there instead of jumping.
document.addEventListener('click', (event) => {
  const link = (event.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
  const target = link ? document.getElementById(link.hash.slice(1)) : null;
  if (!target) return;
  event.preventDefault();
  link?.closest('dialog')?.close();
  goTo(target);
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

// GSAP is fetched only for visitors who want motion.
const wantsMotion = matchMedia('(prefers-reduced-motion: no-preference)');
let started = false;

async function startWalk(): Promise<void> {
  if (started || !wantsMotion.matches) return;
  started = true;
  try {
    const { initMotion } = await import('./motion.ts');
    initMotion();
  } catch {
    // No walk: the plain vertical page is still all there.
    root.classList.remove('mode-h', 'mode-v');
  }
}

startWalk();
wantsMotion.addEventListener('change', startWalk);
