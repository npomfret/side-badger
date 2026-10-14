import { describe, expect, it } from 'vitest';
import { checkJsonLd } from './rules/r11-jsonld';
import { dist } from './lib/site';
import { fx, mentions, one, sites } from './lib/fixtures';

describe('rule 11: JSON-LD parses, has the required nodes and matches the visible page', () => {
  it('dist: every page', () => {
    expect(checkJsonLd(dist())).toEqual([]);
  });

  describe('fixtures', () => {
    it('passes a home page with the base nodes and SoftwareApplication', () => {
      expect(checkJsonLd(one('good/home.html'))).toEqual([]);
    });

    it('passes a pricing page whose FAQ question is visible', () => {
      expect(checkJsonLd(one('good/pricing.html', 'pricing/index.html'))).toEqual([]);
    });

    it('passes a localized noindex legal page with base nodes only', () => {
      expect(checkJsonLd(one('good/noindex-fr-privacy.html', 'fr/privacy/index.html'))).toEqual([]);
    });

    it('does not require JSON-LD on the 404 page', () => {
      expect(checkJsonLd(one('r03/noindex-404.html', '404.html'))).toEqual([]);
    });

    it('fails a block that does not parse', () => {
      expect(mentions(checkJsonLd(one('r11/invalid-json.html')), 'does not parse')).toBe(true);
    });

    it('fails a home page without SoftwareApplication', () => {
      expect(mentions(checkJsonLd(one('r11/home-without-app.html')), 'lacks a SoftwareApplication')).toBe(true);
    });

    it('fails a pricing page without FAQPage', () => {
      expect(mentions(checkJsonLd(one('r11/pricing-without-faq.html', 'pricing/index.html')), 'lacks a FAQPage')).toBe(true);
    });

    it('fails a FAQ question that is not in the visible text', () => {
      const problems = checkJsonLd(one('r11/faq-not-visible.html', 'pricing/index.html'));
      expect(mentions(problems, 'Is it secretly free?', 'not in the visible text')).toBe(true);
    });

    it('fails a WebPage.url that differs from the canonical', () => {
      expect(mentions(checkJsonLd(one('r11/webpage-url-differs.html')), 'WebPage.url')).toBe(true);
    });

    it('passes a BreadcrumbList that matches the visible breadcrumb', () => {
      expect(checkJsonLd(one('r11/breadcrumb-ok.html'))).toEqual([]);
    });

    it('fails a BreadcrumbList that differs from the visible breadcrumb', () => {
      expect(mentions(checkJsonLd(one('r11/breadcrumb-differs.html')), 'differs from the visible breadcrumb')).toBe(true);
    });

    it('reads only the nav labelled as the breadcrumb, not other navs', () => {
      const site = sites({
        'index.html': fx('r11/breadcrumb-ok.html').replace('aria-label="Breadcrumb"', 'aria-label="Main navigation"'),
      });
      expect(mentions(checkJsonLd(site), 'no visible breadcrumb')).toBe(true);
    });

    it('fails a BreadcrumbList with no visible breadcrumb', () => {
      expect(mentions(checkJsonLd(one('r11/breadcrumb-not-visible.html')), 'no visible breadcrumb')).toBe(true);
    });

    it('fails an English legal page whose WebPage has no dateModified', () => {
      expect(mentions(checkJsonLd(one('r11/legal-no-date.html', 'privacy/index.html')), 'dateModified')).toBe(true);
      expect(checkJsonLd(one('r11/legal-dated.html', 'privacy/index.html'))).toEqual([]);
    });
  });
});
