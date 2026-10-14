import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { siteFromFiles, type Site } from './site';

const here = dirname(fileURLToPath(import.meta.url));

/** The text of a fixture under src/__site_tests__/fixtures/ */
export function fx(name: string): string {
  return readFileSync(join(here, '..', 'fixtures', name), 'utf8');
}

/** A site holding one fixture at `file` (default the home page) plus any extra files */
export function one(name: string, file = 'index.html', extra: Record<string, string | Buffer> = {}): Site {
  return siteFromFiles({ [file]: fx(name), ...extra });
}

export function sites(files: Record<string, string | Buffer>): Site {
  return siteFromFiles(files);
}

export async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#16a34a' } }).png().toBuffer();
}

/** True when some problem mentions every given fragment */
export function mentions(problems: string[], ...fragments: string[]): boolean {
  return problems.some(problem => fragments.every(fragment => problem.includes(fragment)));
}
