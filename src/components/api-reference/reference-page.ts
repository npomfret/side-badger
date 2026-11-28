import { ref } from '../tools/tool-dom';
import { boundedRequest, POLICY_TIMEOUT_MS } from '../policy/policy-source';
import { referenceSource } from './reference-source';
import { ReferenceLoader } from './reference-loader';
import { showReference, filterReference } from './reference-view';

function start(root: HTMLElement): void {
  const message = ref(root, 'message');
  const retry = ref<HTMLButtonElement>(root, 'retry');
  const body = ref(root, 'body');
  const filter = ref<HTMLInputElement>(root, 'filter');
  const filterLabel = ref(root, 'filter-label');
  const empty = ref(root, 'empty');
  const source = root.dataset.source;
  if (!source) throw new Error('Missing API documentation source');
  const loader = new ReferenceLoader(
    referenceSource(source, (url, init) => fetch(url, init)),
    () => boundedRequest(POLICY_TIMEOUT_MS),
    state => {
      const recovering = document.activeElement === message;
      message.textContent = state.kind === 'loading' ? root.dataset.loading ?? '' :
        state.kind === 'failed' ? root.dataset.error ?? '' : '';
      retry.hidden = state.kind !== 'failed';
      filterLabel.hidden = state.kind !== 'ready';
      body.hidden = state.kind !== 'ready';
      body.setAttribute('aria-busy', String(state.kind === 'loading'));
      body.replaceChildren();
      empty.hidden = true;
      if (state.kind === 'ready') {
        showReference(state.document, body);
        empty.hidden = filterReference(body, filter.value);
        if (recovering) body.focus({ preventScroll: true });
      }
      if (state.kind === 'failed') {
        // Preserve the original Error in the browser rather than introduce another error serializer.
        console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error',
          event: 'api-reference-load-failed' }), state.error);
      }
    },
  );
  retry.addEventListener('click', () => { message.focus(); void loader.load(); });
  filter.addEventListener('input', () => { empty.hidden = filterReference(body, filter.value); });
  window.addEventListener('pagehide', () => loader.cancel());
  // A page restored from the back-forward cache needs a new current contract too.
  window.addEventListener('pageshow', event => { if (event.persisted) void loader.load(); });
  void loader.load();
}

document.querySelectorAll<HTMLElement>('[data-api-reference]').forEach(start);
