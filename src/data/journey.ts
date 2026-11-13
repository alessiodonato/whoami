/**
 * Everything the site says lives in this file.
 *
 * Add a stop = add an object to `journey`. The path gets longer by itself:
 * no other file needs to change.
 *
 * Where something is still missing, leave the string "TODO".
 * `npm run build` refuses to build while any TODO is left and lists them;
 * `ALLOW_TODO=1 npm run build` skips the check; `npm run dev` highlights them.
 */

export type StopType = 'milestone' | 'project' | 'secret';
export type StopStatus = 'stable' | 'beta' | 'wip';

export interface StopLinks {
  github?: string;
  npm?: string;
  demo?: string;
  site?: string;
}

export interface Stop {
  /** Lowercase letters, digits and dashes. Used in the URL and by `open <id>` in the terminal. */
  id: string;
  /** milestone = road sign with a bench, project = lamppost, secret = mirage (hidden until unlocked). */
  type: StopType;
  /** A year (2026) or a stretch of time ("2019 – 2022"). Printed above the title. A milestone with one is a job on the CV. */
  year?: number | string;
  title: string;
  /** One line, 120 characters at most. Always visible on the sign. */
  pitch: string;
  /** Longer text, shown in the panel. Separate paragraphs with an empty line. */
  body?: string;
  stack?: string[];
  status?: StopStatus;
  links?: StopLinks;
}

/** Who is walking. Used by the opening screen and by `whoami` in the terminal. */
export const profile = {
  name: 'Alessio Donato',
  role: 'AI Automation Engineer',
  place: 'Messina, on the Strait',
  headline: 'I taught robots to click. Now I teach AI agents to remember.',
  /**
   * The first sign of the walk. The first two sentences say what I do: they are also
   * the description search engines show and the answer to `whoami` in the terminal.
   */
  intro:
    'Six-plus years automating business processes, first with software robots and now with AI agents. On the side I build open source tools for people who code with AI. Walk my seafront from dawn to night: the lampposts are the projects.',
  /** Added to the first sign only where the walk is animated: it is what explains the dog, the suitcase and the rest. */
  carry: 'Watch what I pick up on the way.',
  /** The opening lines of the one-page CV (/cv/). */
  summary:
    'AI Automation Engineer with six-plus years in RPA and hyperautomation: from software robots on enterprise systems to AI agents built on LLMs. On the side I build open source tools for AI coding agents.',
};

/**
 * The facts a recruiter looks for. They are on the "In short" sign near the start
 * of the walk and on the one-page CV. One row per line: add, remove or reorder them here.
 */
export const inShort: { name: string; value: string }[] = [
  { name: 'Experience', value: 'Six-plus years in enterprise automation and AI' },
  { name: 'Now', value: 'AI Automation Engineer at a multinational staffing agency, open source on the side' },
  { name: 'Works with', value: 'Claude API, Vertex AI, Gemini, UiPath, Python, TypeScript / Node.js, SQL' },
  { name: 'Certified', value: 'UiPath Advanced Developer (2023), Google AI Essentials (2024)' },
  { name: 'Languages', value: 'Italian (native), English (B2), French (basic)' },
  { name: 'Based in', value: 'Messina, Italy. Open to remote work and relocation' },
];

/** The stops, in walking order. */
export const journey: Stop[] = [
  {
    id: 'it-consultant',
    type: 'milestone',
    year: '2019 – 2022',
    title: 'IT Consultant',
    pitch: 'Started in RPA with UiPath: software robots clicking through the work nobody wanted to do.',
    body: `In the hyperautomation and AI team of a consulting firm, on projects for clients in banking, finance, insurance, HR, procurement and operations.

RPA on virtualized desktops, OCR on documents no machine was supposed to read, some NLP in Python to sort invoices out of shared inboxes, and Java on the backend when a robot was not the answer.

Client after client, every company had its own systems, and the same spreadsheet holding them together.`,
    stack: ['UiPath', 'Python', 'Java', 'OCR'],
  },
  {
    id: 'automation-engineer',
    type: 'milestone',
    year: '2022 – today',
    title: 'AI Automation Engineer',
    pitch: 'At a multinational staffing agency: automation and AI on real processes, where a broken bot gets noticed fast.',
    body: `AI agents that read documents and hand back structured data, contract workflows automated end to end from offer to signature, approvals that route themselves by thresholds and roles.

The whole stretch each time: from sitting with the people who do the work to watching the result run in production.`,
    stack: ['UiPath', 'Vertex AI', 'Gemini'],
  },
  {
    id: 'arricurdai',
    type: 'project',
    title: 'arricurdAI',
    pitch: 'Stop paying twice for the same context: profile, guard, handoff and recall for Claude Code.',
    body: `Claude Code resends the whole conversation on every call, and after an hour away it writes all of it to the cache again. arricurdAI shows where the tokens go, stops the costly resume before it happens, hands the fresh session a short note and lets Claude search what earlier sessions said.

It runs on local files only: no telemetry, no model, no API key.

The name comes from the Sicilian "arricurdari", to remember.`,
    stack: ['TypeScript', 'Node.js', 'Claude Code hooks'],
    links: {
      github: 'https://github.com/alessiodonato/arricurdai',
      npm: 'https://www.npmjs.com/package/arricurdai',
      site: 'https://alessiodonato.github.io/arricurdai/',
    },
  },
  {
    id: 'forchetta',
    type: 'project',
    title: 'Forchetta',
    pitch: "Run several Claude Code sessions in the same repo. They won't step on each other.",
    body: `A macOS app that shows every Claude Code session on your Mac in one window. When two sessions reach for the same file, the guard makes one wait, tells Claude why, and lets it go on when the file is free.

Permission prompts, notifications and teams of agents are handled from the same place. With arricurdAI installed it also shows each session's cache countdown and what today cost.

Forchetta is Italian for fork: one handle, several tines.`,
    stack: ['TypeScript', 'Swift', 'Preact', 'xterm.js', 'Claude Code hooks'],
    links: {
      github: 'https://github.com/alessiodonato/forchetta',
      site: 'https://forchetta.dev',
    },
  },
  {
    id: 'pillole-di-llm',
    type: 'project',
    title: 'Pillole di LLM',
    pitch: 'A visual, hands-on guide to how an LLM really works, in Italian. Nineteen pills, one mechanism each.',
    body: `Nineteen short pages, one mechanism each: tokenization with the real GPT-4o tokenizer, attention, sampling, the context window, RAG, agents. Every page has a visualization you can play with and a few questions at the end.

Plain HTML, CSS and JavaScript: no framework, no runtime dependencies.

"Pillole" is Italian for pills: small doses.`,
    stack: ['HTML', 'CSS', 'JavaScript'],
    links: {
      github: 'https://github.com/alessiodonato/pillole-di-llm',
      demo: 'https://alessiodonato.github.io/pillole-di-llm/',
    },
  },
  {
    id: 'pulizia-mac',
    type: 'project',
    title: 'pulizia-mac',
    pitch: 'A Mac cleanup that asks permission: it explains every item and deletes only what you approve.',
    body: `One bash file, zero dependencies. It shows where the disk space went, explains each thing that can be removed (what it is, how much it weighs, how to get it back) and waits for your yes.

Made for developers with a small disk: npm, pip, pnpm and Go caches, the browsers Puppeteer and Playwright download, the node_modules of projects you stopped touching. Personal files go to the Trash, never straight to rm.

The interface is in Italian.`,
    stack: ['Bash'],
    links: {
      github: 'https://github.com/alessiodonato/pulizia-mac',
    },
  },
  {
    id: 'spotsmith',
    type: 'milestone',
    title: 'Spotsmith',
    pitch: "Something else I'm building. The link says more than I will.",
    links: {
      site: 'https://spotsmith.it',
    },
  },
  {
    id: 'gym',
    type: 'secret',
    title: 'Bodybuilding',
    pitch: "The one habit I can't do without. Also the one process I never automated: every rep is done by hand.",
    body: `Progress here is boring on purpose: show up, add a little, come back.

It is the same loop as good software, with a slower release cycle and no way to skip the tests.`,
  },
  {
    id: 'wakeboard',
    type: 'secret',
    title: 'Wakeboard at sunset',
    pitch: "A board, a rope and the Strait at sunset. The currents here don't negotiate.",
    body: `The Strait of Messina is not a lake. The current turns around every six hours and has opinions about where you should be: that is most of the fun.

No screen, no notifications, and falling is part of the method.`,
  },
  {
    id: 'vinyl',
    type: 'secret',
    title: 'The vinyl collection',
    pitch: 'I listen to everything. The records are the part of it I can hold in my hands.',
    body: `No favourite genre and no shame about it: the queue goes wherever it goes.

Vinyl is the slow version. You pick one record, you put it on, you listen to the whole side. For someone who spends the day making things faster, that is the point.`,
  },
];

/**
 * Shown on the pier and by `contact` in the terminal.
 * Email is a plain address, the others are full URLs. Delete a line and its row disappears.
 */
export const contacts = {
  email: 'alessiodonato00@gmail.com',
  github: 'https://github.com/alessiodonato',
  linkedin: 'https://www.linkedin.com/in/alessio-donato-5825a0172',
};

/**
 * What is shared only on request. Each name is listed on the pier with a padlock
 * and "Contact me for more information".
 * Names only, on purpose: the phone number and the CV themselves are never in this
 * file, so they can end up neither in the built site nor in the repository.
 */
export const onRequest = ['Phone', 'Full CV'];
