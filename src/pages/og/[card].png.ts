/**
 * Social cards (restructure D27): language-neutral 1200×630 PNGs at `/og/<card>-<logoLocale>.png`.
 *
 * The artwork in `src/assets/og/<card>.png` is 2400×1260 and has no text. The text part of the
 * locale's logo (`public/images/<logoLocale>/logo-transparent.png`, without its badger head) is
 * composited on the right, because text-on-image generators cannot shape Arabic and Indic scripts.
 * `og:title` carries the words. Locales without a translated wordmark use the English one (see
 * `logoLocales`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { logoLocales } from '../../i18n';

const WIDTH = 1200;
const HEIGHT = 630;
// The artwork's mascot ends at x≈645 (1200 scale); the wordmark sits clear of it
const WORDMARK_WIDTH = 470;
const WORDMARK_MARGIN = 50;
// Every locale's 1200×377 logo is the badger head (x<394), a divider (x≈412-423), a clear gap
// (x≈423-440), then the wordmark. The card already has the mascot, so the logo is cut in the middle
// of that gap and trimmed, keeping only the text. The cut column must be fully transparent.
const WORDMARK_CUT_X = 432;
// Palette PNG: the cards are flat colour, so 256 dithered colours look the same as truecolour at
// about half the size, which keeps every card under the site plan's 200 KB budget
const PNG_OPTIONS = { palette: true, colours: 256, quality: 100, dither: 1, effort: 10 } as const;

// Read the directory rather than import.meta.glob, so Vite does not emit the 2400×1260 sources
const ARTWORK_DIR = resolve('src/assets/og');
const cardIds = readdirSync(ARTWORK_DIR)
  .filter(file => file.endsWith('.png'))
  .map(file => file.replace(/\.png$/, ''));

export const getStaticPaths: GetStaticPaths = () =>
  cardIds.flatMap(card =>
    logoLocales.map(logoLocale => ({
      params: { card: `${card}-${logoLocale}` },
      props: { card, logoLocale },
    }))
  );

const wordmarkOf = async (logoLocale: string): Promise<Buffer> => {
  const file = resolve('public/images', logoLocale, 'logo-transparent.png');
  const { data, info } = await sharp(readFileSync(file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) {
    if (data[(y * info.width + WORDMARK_CUT_X) * info.channels + 3] !== 0) {
      throw new Error(
        `${file}: column x=${WORDMARK_CUT_X} is not transparent, so the badger head cannot be cut off the wordmark`
      );
    }
  }
  const textOnly = await sharp(data, { raw: info })
    .extract({
      left: WORDMARK_CUT_X,
      top: 0,
      width: info.width - WORDMARK_CUT_X,
      height: info.height,
    })
    .png()
    .toBuffer();
  return sharp(textOnly).trim().resize({ width: WORDMARK_WIDTH }).toBuffer();
};

export const GET: APIRoute = async ({ props }) => {
  const { card, logoLocale } = props as { card: string; logoLocale: string };
  const background = await sharp(resolve(ARTWORK_DIR, `${card}.png`))
    .resize(WIDTH, HEIGHT)
    .toBuffer();
  const wordmark = await wordmarkOf(logoLocale);
  const { height } = await sharp(wordmark).metadata();
  const png = await sharp(background)
    .composite([
      {
        input: wordmark,
        left: WIDTH - WORDMARK_WIDTH - WORDMARK_MARGIN,
        top: Math.round((HEIGHT - (height ?? 0)) / 2),
      },
    ])
    .png(PNG_OPTIONS)
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
