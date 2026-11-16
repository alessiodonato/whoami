/**
 * The list of pages for search engines, at /sitemap.xml.
 * It is made from the files in this folder: a new page gets its line by itself.
 */
import type { APIRoute } from 'astro';

const pages = Object.keys(import.meta.glob('./**/*.astro'))
  .map((file) => file.replace(/^\.\//, '/').replace(/\.astro$/, '/').replace(/\/index\/$/, '/'))
  .sort();

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const urls = pages.map((path) => `  <url><loc>${new URL(`${base}${path}`, site).href}</loc></url>`);

  return new Response(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
