#!/usr/bin/env node
// Edge stand-in for local Lighthouse runs: forwards to the nginx container and
// compresses text responses (brotli q6 or gzip 6, chosen by Accept-Encoding),
// as the shared Snowmonkey edge does in production.
import http from 'node:http';
import zlib from 'node:zlib';

const USAGE = `Usage: lighthouse-proxy.mjs --listen <port> --target <port> [--host 127.0.0.1]

Reverse proxy that compresses HTML, CSS, JS, JSON, SVG and plain text with
brotli quality 6 or gzip level 6, chosen from Accept-Encoding.

Example: node scripts/lighthouse-proxy.mjs --listen 18102 --target 18101
`;

const args = process.argv.slice(2);
const opts = { host: '127.0.0.1' };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--help') {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  if (['--listen', '--target', '--host'].includes(a) && args[i + 1] !== undefined) {
    opts[a.slice(2)] = args[++i];
  } else {
    process.stderr.write(`Unknown or incomplete argument: ${a}\n${USAGE}`);
    process.exit(2);
  }
}
if (!opts.listen || !opts.target) {
  process.stderr.write(USAGE);
  process.exit(2);
}

const COMPRESSIBLE =
  /^(text\/(html|css|javascript|plain)|application\/(javascript|json|manifest\+json)|image\/svg\+xml)/i;

const server = http.createServer((req, res) => {
  const upstream = http.request(
    {
      host: opts.host,
      port: Number(opts.target),
      method: req.method,
      path: req.url,
      headers: { ...req.headers, 'accept-encoding': 'identity' },
    },
    (up) => {
      const headers = { ...up.headers };
      const type = String(headers['content-type'] || '');
      const accept = String(req.headers['accept-encoding'] || '');
      const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
      if (!encoding || !COMPRESSIBLE.test(type) || up.statusCode === 304 || req.method === 'HEAD') {
        res.writeHead(up.statusCode, headers);
        up.pipe(res);
        return;
      }
      delete headers['content-length'];
      headers['content-encoding'] = encoding;
      headers.vary = headers.vary ? `${headers.vary}, Accept-Encoding` : 'Accept-Encoding';
      res.writeHead(up.statusCode, headers);
      const z =
        encoding === 'br'
          ? zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 } })
          : zlib.createGzip({ level: 6 });
      up.pipe(z).pipe(res);
    },
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`proxy error: ${err.message}\n`);
  });
  req.pipe(upstream);
});

server.listen(Number(opts.listen), opts.host, () => {
  process.stdout.write(`proxy ${opts.host}:${opts.listen} -> ${opts.host}:${opts.target}\n`);
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
