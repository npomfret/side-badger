/**
 * Social cards (restructure D27): language-neutral 1200×630 PNGs at `/og/<card>-<logoLocale>.png`.
 *
 * The artwork in `src/assets/og/<card>.png` is 2400×1260 and has no text. The locale's wordmark
 * (`public/images/<logoLocale>/logo-transparent.png`) is composited on the right, because
 * text-on-image generators cannot shape Arabic and Indic scripts. `og:title` carries the words.
 * Locales without a translated wordmark use the English one (see `logoLocales`).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { logoLocales } from '../../i18n';

const WIDTH = 1200;
const HEIGHT = 630;
const WORDMARK_WIDTH = 540;

// Only the file names matter here; the artwork is read from disk below
const artwork = import.meta.glob('/src/assets/og/*.png', { query: '?url', import: 'default' });
const cardIds = Object.keys(artwork).map(path => path.replace(/^.*\/(.+)\.png$/, '$1'));

export const getStaticPaths: GetStaticPaths = () =>
  cardIds.flatMap(card =>
    logoLocales.map(logoLocale => ({
      params: { card: `${card}-${logoLocale}` },
      props: { card, logoLocale },
    }))
  );

export const GET: APIRoute = async ({ props }) => {
  const { card, logoLocale } = props as { card: string; logoLocale: string };
  const background = await sharp(resolve('src/assets/og', `${card}.png`))
    .resize(WIDTH, HEIGHT)
    .toBuffer();
  const wordmark = await sharp(
    readFileSync(resolve('public/images', logoLocale, 'logo-transparent.png'))
  )
    .resize({ width: WORDMARK_WIDTH })
    .toBuffer();
  const { height } = await sharp(wordmark).metadata();
  const png = await sharp(background)
    .composite([
      {
        input: wordmark,
        left: WIDTH - WORDMARK_WIDTH - 70,
        top: Math.round((HEIGHT - (height ?? 0)) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
