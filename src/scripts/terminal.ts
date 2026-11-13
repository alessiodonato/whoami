/**
 * The terminal on the pier: help, whoami, ls projects, open <project>, contact.
 * It reads everything from the page, so it can never say something the page doesn't.
 * One more word works, and it is not in the list.
 */

import { isUnlocked, reachableStops } from './nav.ts';
import { goToMirage, lock, unlock } from './secrets.ts';
import { openStop } from './stops.ts';

type Line = string | Node | (string | Node)[];

const plain = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function initTerminal(): void {
  const terminal = document.querySelector<HTMLElement>('#terminal');
  const log = document.querySelector<HTMLElement>('#terminal-log');
  const form = document.querySelector<HTMLFormElement>('#terminal-form');
  const input = document.querySelector<HTMLInputElement>('#terminal-input');
  if (!terminal || !log || !form || !input) return;

  const whoami: string[] = JSON.parse(terminal.dataset.whoami ?? '[]');
  const history: string[] = [];
  let cursor = 0;

  const say = (line: Line, className?: string) => {
    const p = document.createElement('p');
    if (className) p.className = className;
    p.append(...(Array.isArray(line) ? line : [line]));
    log.append(p);
    log.scrollTop = log.scrollHeight;
  };

  const stops = () =>
    reachableStops().map((stop) => ({
      id: stop.id,
      type: stop.dataset.type ?? '',
      title: stop.dataset.title ?? stop.id,
      pitch: stop.querySelector('.plate__pitch')?.textContent?.trim() ?? '',
    }));

  const action = (label: string, run: () => void) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', run);
    return button;
  };

  const list = (type: string) => {
    const items = stops().filter((stop) => stop.type === type);
    const width = Math.max(...items.map((item) => item.id.length));
    for (const item of items) say(`${item.id.padEnd(width + 2)}${item.pitch}`);
    say(`open <name> shows one, for example: open ${items[0]?.id ?? 'forchetta'}`, 't-dim');
  };

  const commands: Record<string, (argument: string) => void> = {
    help() {
      say('help             this list');
      say('whoami           who is walking');
      say('ls projects      the lampposts');
      say('open <project>   one of them, up close');
      say('contact          how to reach me');
      say('One more word works here. It is on the sign by the feluca.', 't-dim');
    },

    whoami() {
      whoami.forEach((line) => say(line));
    },

    ls(argument) {
      const what = plain(argument);
      if (what === '' || what === 'projects') return list('project');
      if (what === 'mirages' && isUnlocked()) return list('secret');
      say(`ls: nothing called "${argument}" here. Try: ls projects`);
    },

    open(argument) {
      const wanted = plain(argument);
      if (!wanted) return say('open what? For example: open arricurdai');
      const all = stops();
      const match =
        all.find((stop) => plain(stop.id) === wanted || plain(stop.title) === wanted) ??
        all.find((stop) => plain(stop.id).startsWith(wanted) || plain(stop.title).startsWith(wanted));
      if (!match) return say(`open: no stop called "${argument}". ls projects lists them.`);
      say(`Opening ${match.title}.`);
      openStop(match.id);
    },

    contact() {
      for (const row of document.querySelectorAll('#contacts li')) {
        const name = row.querySelector('.contacts__name')?.textContent?.trim() ?? '';
        const value = row.querySelector('.contacts__value');
        if (!value) continue;
        const copy = value.cloneNode(true) as HTMLElement;
        copy.removeAttribute('class');
        if (copy instanceof HTMLAnchorElement) copy.textContent = copy.href.replace(/^mailto:/, '');
        say([`${name.padEnd(10)}`, copy]);
      }
      const locked = [...document.querySelectorAll('#locked .contacts__name')].map((node) => node.textContent?.trim() ?? '');
      for (const name of locked) say(`${name.padEnd(10)}locked`);
      if (locked.length > 0) say('Locked means: contact me for more information.', 't-dim');
    },

    clear() {
      log.replaceChildren();
    },

    // The one that is not in the list.
    morgana() {
      if (unlock('terminal')) {
        say('The air over the water bends.');
        say(['The Fata Morgana is out, back towards the sunset. ', action('Walk back to her', goToMirage)]);
        say('ls mirages lists what she is showing. fog sends her away.', 't-dim');
      } else if (isUnlocked()) {
        say(['She is already out. ', action('Walk back to her', goToMirage)]);
      } else {
        say('Nothing over the water tonight.');
      }
    },

    fog() {
      say(lock() ? 'Fog on the Strait. The mirages are gone.' : 'It is already clear.');
    },
  };

  const aliases: Record<string, string> = {
    'fata morgana': 'morgana',
    fatamorgana: 'morgana',
    contacts: 'contact',
    '?': 'help',
  };

  const run = (raw: string) => {
    const typed = raw.trim();
    say(`~ $ ${typed}`, 't-cmd');
    if (!typed) return;

    const whole = aliases[plain(typed)] ?? aliases[typed];
    const [first = '', ...rest] = typed.split(/\s+/);
    const name = whole ?? aliases[first.toLowerCase()] ?? first.toLowerCase();
    const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
    if (!command) return say(`command not found: ${first}. help lists what works.`);
    command(whole ? '' : rest.join(' '));
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const typed = input.value;
    if (typed.trim()) history.push(typed);
    cursor = history.length;
    input.value = '';
    run(typed);
  });

  // Up and down bring back earlier commands, as in any terminal.
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (history.length === 0) return;
    event.preventDefault();
    cursor = Math.min(history.length, Math.max(0, cursor + (event.key === 'ArrowUp' ? -1 : 1)));
    input.value = history[cursor] ?? '';
  });

  // A click anywhere on the terminal lands in the prompt, unless it is selecting text or pressing something.
  terminal.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input')) return;
    if (window.getSelection()?.toString()) return;
    input.focus({ preventScroll: true });
  });

  terminal.hidden = false;
}
