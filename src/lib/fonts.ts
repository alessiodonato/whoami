/** The two self-hosted typefaces, declared once for both pages. */

export const FONT_FILES = ['fraunces-latin-soft.woff2', 'atkinson-next-latin.woff2'];

export function fontFaces(base: string): string {
  return [
    `@font-face{font-family:Fraunces;src:url(${base}/fonts/fraunces-latin-soft.woff2) format("woff2");font-weight:100 900;font-style:normal;font-display:swap}`,
    `@font-face{font-family:"Atkinson Next";src:url(${base}/fonts/atkinson-next-latin.woff2) format("woff2");font-weight:200 800;font-style:normal;font-display:swap}`,
  ].join('\n');
}
