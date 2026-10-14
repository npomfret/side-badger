/**
 * The header and footer logo, with its width and height read from the image file at build time,
 * so a logo swap cannot leave the attributes wrong (check:site rule 14).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logoLocales, type Locale } from '../../i18n';

export interface LogoImage {
  src: string;
  width: number;
  height: number;
}

const cache = new Map<string, LogoImage>();

/** Width and height from a PNG's IHDR chunk (bytes 16 to 24). */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  if (bytes.toString('latin1', 1, 4) !== 'PNG') throw new Error(`${file} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

export function logoFor(locale: Locale): LogoImage {
  const logoLocale = logoLocales.includes(locale) ? locale : 'en';
  let logo = cache.get(logoLocale);
  if (!logo) {
    const src = `/images/${logoLocale}/logo-transparent-small.png`;
    logo = { src, ...pngSize(join(process.cwd(), 'public', src)) };
    cache.set(logoLocale, logo);
  }
  return logo;
}
