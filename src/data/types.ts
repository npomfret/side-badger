/**
 * Types for the feature registry (restructure 3.1, D16).
 *
 * The registry is English and internal: pages reference its ids and statuses and never print
 * its strings verbatim. The data lives in `features.ts`, `use-cases.ts`, `substitutions.ts` and
 * `screenshots.ts` (P22). Ids are plain strings here so the types compile before the data
 * exists; `registry.test.ts` checks every reference against the data.
 */
import type { PageId } from '../site/pages';

export type FeatureId = string;
export type UseCaseId = string;
export type AudienceId = string;
/** A stable claim id such as `balances.fewer-payments`. */
export type ClaimId = string;
/** A screenshot id from `src/data/screenshots.ts`. */
export type ShotId = string;

export type FeatureStatus = 'available' | 'beta' | 'planned' | 'retired' | 'tenant-dependent';
export type ProofKind = 'screenshot' | 'demo' | 'documentation' | 'worked-example';

export interface Claim {
  id: ClaimId;
  /** Approved English wording */
  text: string;
}

export interface FeatureRecord {
  /** The site plan's ids: 'groups', 'invites', 'expense-splitting', 'settlements', … */
  id: FeatureId;
  /** The page that covers it, e.g. 'feature/settle-up' */
  homePage: PageId | null;
  /** Plain-English statement, internal */
  capability: string;
  /** The user problem it solves */
  problem: string;
  audiences: { primary: AudienceId[]; secondary: AudienceId[] };
  status: FeatureStatus | 'not-offered';
  confidence: 'high' | 'medium' | 'low';
  /** App-repo paths, read at the commit in `verifiedAt` */
  evidence: string[];
  /** App commit */
  verifiedAt: string;
  limits: string[];
  prerequisites: string[];
  /** `ref` is a ShotId, clip id, URL or example id */
  proof: { kind: ProofKind; ref: string }[];
  relatedFeatures: FeatureId[];
  useCases: UseCaseId[];
  searchLanguage: string[];
  /** Approved claims */
  claims: Claim[];
  /** Wording that must not be used */
  notApproved: string[];
  /** Content release (site plan D7) */
  release: 1 | 2;
  /** e.g. 'receipt quality evidence' (site plan D10) */
  gate?: string;
}

export interface UseCaseRecord {
  id: UseCaseId;
  audiences: AudienceId[];
  features: FeatureId[];
  scenarios: string[];
}

/** One row of the site plan's "Approved substitutions" table. */
export interface Substitution {
  /** Phrase that must not appear, matched case-insensitively. A cell with "/" is several phrases. */
  insteadOf: string;
  /** What to write instead */
  use: string;
}

/** An entry of `src/data/screenshots.ts`; only the id is relied on here. */
export interface Screenshot {
  id: ShotId;
  [field: string]: unknown;
}
