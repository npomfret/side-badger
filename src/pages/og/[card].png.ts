/**
 * Social cards (restructure D27): language-neutral 1200×630 PNGs at `/og/<card>-<logoLocale>.png`.
 *
 * The artwork in `src/assets/og/<card>.png` is 2400×1260 and has no text. The locale's wordmark
 * (the text part of `public/images/<logoLocale>/logo-transparent.png`, without its badger head) is composited on the right, because
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
// The artwork's mascot ends at x≈645 (1200 scale); the wordmark sits clear of it
const WORDMARK_WIDTH = 470;
// Every locale's logo file is the badger head (x<395), a divider (x≈413-422), then the wordmark.
// The card already has the mascot, so only the text is composited.
const WORDMARK_FROM_X = 442;
const WORDMARK_MARGIN = 50;

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
  const logoFile = readFileSync(resolve('public/images', logoLocale, 'logo-transparent.png'));
  const { width: logoWidth = 0, height: logoHeight = 0 } = await sharp(logoFile).metadata();
  const textOnly = await sharp(logoFile)
    .extract({ left: WORDMARK_FROM_X, top: 0, width: logoWidth - WORDMARK_FROM_X, height: logoHeight })
    .toBuffer();
  const wordmark = await sharp(textOnly)
    .trim()
    .resize({ width: WORDMARK_WIDTH })
    .toBuffer();
  const { height } = await sharp(wordmark).metadata();
  const png = await sharp(background)
    .composite([
      {
        input: wordmark,
        left: WIDTH - WORDMARK_WIDTH - WORDMARK_MARGIN,
        top: Math.round((HEIGHT - (height ?? 0)) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
