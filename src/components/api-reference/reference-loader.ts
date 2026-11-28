import type { ApiReferenceDocument, ReferenceSource } from './reference-source';

export type ReferenceState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly document: ApiReferenceDocument }
  | { readonly kind: 'failed'; readonly error: unknown };

export interface ReferenceRequest {
  readonly signal: AbortSignal;
  readonly aborted: Promise<never>;
  cancel(): void;
  done(): void;
}

/** Owns one page's attempts. Cancellation invalidates even a source that ignores its abort signal. */
export class ReferenceLoader {
  // Only the current attempt may publish a result; cancelled/finished attempts lose ownership.
  private active: ReferenceRequest | undefined;

  constructor(
    private readonly source: ReferenceSource,
    private readonly begin: () => ReferenceRequest,
    private readonly changed: (state: ReferenceState) => void,
  ) {}

  async load(): Promise<void> {
    this.cancel();
    const request = this.begin();
    this.active = request;
    this.changed({ kind: 'loading' });
    try {
      const document = await Promise.race([this.source.load(request.signal), request.aborted]);
      if (this.active === request) this.changed({ kind: 'ready', document });
    } catch (error) {
      if (this.active === request) this.changed({ kind: 'failed', error });
    } finally {
      request.done();
      if (this.active === request) this.active = undefined;
    }
  }

  cancel(): void {
    const previous = this.active;
    this.active = undefined;
    previous?.cancel();
    previous?.done();
  }
}
