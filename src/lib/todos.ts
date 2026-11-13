import { contacts, inShort, journey, onRequest, profile } from '../data/journey.ts';

export const PITCH_MAX = 120;

const TODO_RE = /\bTODO\b/;

/** True for the placeholder string, alone or inside a longer one. */
export function isTodo(value: unknown): boolean {
  return typeof value === 'string' && TODO_RE.test(value);
}

/** Every place in journey.ts that still holds a TODO, as "stop-id → field". */
export function findTodos(): string[] {
  const found: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (isTodo(value)) found.push(path);
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) walk(item, `${path}.${key}`);
    }
  };
  for (const stop of journey) {
    for (const [key, value] of Object.entries(stop)) {
      if (key !== 'id') walk(value, `${stop.id} → ${key}`);
    }
  }
  for (const [key, value] of Object.entries(contacts)) walk(value, `contacts → ${key}`);
  for (const [key, value] of Object.entries(profile)) walk(value, `profile → ${key}`);
  walk(onRequest, 'onRequest');
  inShort.forEach((row) => walk(row.value, `inShort → ${row.name}`));
  return found;
}

/** Mistakes that would break the page. These fail the build even with ALLOW_TODO=1. */
export function findProblems(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const stop of journey) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(stop.id)) {
      problems.push(`"${stop.id}": the id can only have lowercase letters, digits and dashes`);
    }
    if (seen.has(stop.id)) problems.push(`"${stop.id}": this id is used twice`);
    seen.add(stop.id);
    if (!['milestone', 'project', 'secret'].includes(stop.type)) {
      problems.push(`"${stop.id}": type "${stop.type}" is not milestone, project or secret`);
    }
    if (stop.status && !['stable', 'beta', 'wip'].includes(stop.status)) {
      problems.push(`"${stop.id}": status "${stop.status}" is not stable, beta or wip`);
    }
    if (!isTodo(stop.pitch) && stop.pitch.length > PITCH_MAX) {
      problems.push(`"${stop.id}": the pitch is ${stop.pitch.length} characters, the limit is ${PITCH_MAX}`);
    }
  }
  return problems;
}
