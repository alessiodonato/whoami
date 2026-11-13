import { defineConfig } from 'astro/config';
import todoGuard from './integrations/todo-guard.ts';

export default defineConfig({
  // Published on GitHub Pages at the root of https://alessiodonato.github.io/
  // (GitHub serves that address only from a repository called "alessiodonato.github.io").
  site: 'https://alessiodonato.github.io',
  output: 'static',
  integrations: [todoGuard()],
  build: {
    // One page: inlining the CSS saves a render-blocking request.
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
