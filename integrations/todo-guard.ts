import type { AstroIntegration } from 'astro';
import { findProblems, findTodos } from '../src/lib/todos.ts';

// The only thing needed from Node here: no need for its whole type package.
declare const process: { env: Record<string, string | undefined> };

/** Stops with a short message and no stack trace: the list is the whole point. */
function stop(title: string, lines: string[], hint: string): never {
  const error = new Error(`${title}\n\n${lines.map((line) => `  - ${line}`).join('\n')}\n\n${hint}\n`);
  error.stack = undefined;
  throw error;
}

/**
 * Refuses to build while src/data/journey.ts still holds a "TODO",
 * so a placeholder is never published by mistake.
 * ALLOW_TODO=1 skips the check (for tests).
 */
export default function todoGuard(): AstroIntegration {
  return {
    name: 'todo-guard',
    hooks: {
      'astro:build:start': ({ logger }) => {
        const problems = findProblems();
        if (problems.length > 0) {
          stop(
            `src/data/journey.ts has ${problems.length} ${problems.length === 1 ? 'mistake' : 'mistakes'}:`,
            problems,
            'Fix them and build again.',
          );
        }

        const todos = findTodos();
        if (todos.length === 0) return;

        const allowed = process.env.ALLOW_TODO === '1' || process.env.ALLOW_TODO === 'true';
        if (allowed) {
          logger.warn(`ALLOW_TODO is set: building with ${todos.length} TODO left in src/data/journey.ts.`);
          return;
        }

        stop(
          `Not building: src/data/journey.ts still has ${todos.length} TODO.`,
          todos,
          'Fill them in, or run `ALLOW_TODO=1 npm run build` to build anyway.',
        );
      },
    },
  };
}
