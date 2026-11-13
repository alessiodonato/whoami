import { defineConfig } from 'astro/config';
import todoGuard from './integrations/todo-guard.ts';

export default defineConfig({
  // Published on GitHub Pages as a project site: https://alessiodonato.github.io/whoami/
  // (the repository is called "whoami"; a different name or a custom domain means changing these two).
  site: 'https://alessiodonato.github.io',
  base: '/whoami',
  output: 'static',
  integrations: [todoGuard()],
  build: {
    // One page: inlining the CSS saves a render-blocking request.
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
