import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getAppUrl, localeAliasMap, locales } from '@/i18n';

const nginxDir = resolve(__dirname, '../../nginx');
const redirects = readFileSync(resolve(nginxDir, 'locale-redirects.conf'), 'utf8');
const defaultConf = readFileSync(resolve(nginxDir, 'default.conf'), 'utf8');

/** The map lines of the form `~^/(?:a|b)/?$   /target/;` (the bare alias root). */
function parseRootRules(conf: string): Map<string, string> {
  const result = new Map<string, string>();
  const rule = /^\s*~\^\/(?:\(\?:([^)]+)\)|([A-Za-z-]+))\/\?\$\s+(\/[^;\s]*);/gm;
  for (const match of conf.matchAll(rule)) {
    const names = (match[1] ?? match[2]).split('|');
    for (const name of names) {
      result.set(name, match[3]);
    }
  }
  return result;
}

/** Every alias named in any rule of the map, whatever the rule does. */
function allAliasNames(conf: string): Set<string> {
  const names = new Set<string>();
  for (const line of conf.split('\n')) {
    const match = line.match(/^\s*~\^\/(?:\(\?:([^)]+)\)|([A-Za-z-]+))[(/]/);
    if (match) {
      for (const name of (match[1] ?? match[2]).split('|')) names.add(name);
    }
  }
  return names;
}

describe('nginx/locale-redirects.conf', () => {
  const expected = new Map(
    Object.entries(localeAliasMap).map(([alias, target]) => [alias, target === 'en' ? '/' : `/${target}/`])
  );

  it('redirects exactly the aliases in localeAliasMap', () => {
    expect([...allAliasNames(redirects)].sort()).toEqual(Object.keys(localeAliasMap).sort());
    expect([...parseRootRules(redirects).keys()].sort()).toEqual(Object.keys(localeAliasMap).sort());
  });

  it('sends each alias to its target locale', () => {
    const actual = parseRootRules(redirects);
    for (const [alias, target] of expected) {
      expect(actual.get(alias), alias).toBe(target);
    }
  });

  it('keeps the path, slash and index.html rules for every alias target', () => {
    // Each alias group has a root rule, an index.html rule, a slashless rule and a rest rule
    const ruleLines = redirects.split('\n').filter(l => /^\s*~\^\//.test(l));
    expect(ruleLines.length).toBe(8);
    const targets = new Set(Object.values(localeAliasMap));
    for (const target of targets) {
      const prefix = target === 'en' ? '' : `/${target}`;
      expect(redirects, target).toMatch(prefix === '' ? /\s\$a2;/ : new RegExp(`${prefix}\\$n2;`));
    }
  });
});

describe('nginx/default.conf launch counter', () => {
  it('lists exactly the non-English locales in the lang map', () => {
    const match = defaultConf.match(/map \$arg_lang \$side_badger_lang_query \{[^}]*~\^\(([^)]+)\)\$/);
    expect(match, 'lang map not found').not.toBeNull();
    expect((match as RegExpMatchArray)[1].split('|').sort()).toEqual(locales.filter(l => l !== 'en').sort());
  });

  it('targets the origin getAppUrl() points at', () => {
    const origin = new URL(getAppUrl()).origin;
    const dashboard = defaultConf.match(/location = \/go\/app\/ \{[^}]*return 302 (\S+?)\$side_badger_lang_query;/);
    const register = defaultConf.match(/location = \/go\/register\/ \{[^}]*return 302 (\S+?)\$side_badger_lang_query;/);
    expect(dashboard, '/go/app/ not found').not.toBeNull();
    expect(register, '/go/register/ not found').not.toBeNull();
    expect((dashboard as RegExpMatchArray)[1]).toBe(`${origin}/dashboard`);
    expect((register as RegExpMatchArray)[1]).toBe(`${origin}/register`);
  });

  it('logs launch clicks without address, user agent or referrer', () => {
    const format = defaultConf.match(/log_format side_badger_launch[^;]*;/);
    expect(format).not.toBeNull();
    const text = (format as RegExpMatchArray)[0];
    expect(text).not.toMatch(/remote_addr|http_user_agent|http_referer|http_x_|request_uri|\$args/);
  });

  it('includes the redirect map from where the Dockerfile puts it', () => {
    expect(defaultConf).toContain('include /etc/nginx/side-badger/locale-redirects.conf;');
  });

  it('sends cross-origin resource policy cross-origin for /og/ only', () => {
    expect(defaultConf).toMatch(/map \$uri \$side_badger_corp \{[^}]*~\^\/og\/\s+cross-origin;[^}]*default\s+same-origin;/);
    expect(defaultConf).toContain('add_header Cross-Origin-Resource-Policy $side_badger_corp always;');
  });
});
