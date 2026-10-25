# Email and DNS

Reference for the next person who changes the sidebadger.me DNS zone or its mail setup. Facts were recorded on 2026-10-21; the "Status" section is a point-in-time snapshot, the rest is the intended setup.

## Domain and DNS host

- Registrar: **Easyspace**. A transfer to Cloudflare Registrar is planned.
- DNS host: **Cloudflare** since 2026-10-25. Nameservers: `harmony.ns.cloudflare.com` and `lennox.ns.cloudflare.com`.
- The records are kept in the `google-workspace` repo, in `dns/sidebadger.me.json`, and applied with its `scripts/cf.py`. To change a record, edit that file and run `scripts/cf.py apply sidebadger.me --dry-run`, then run it without `--dry-run`. Don't edit the zone in the Cloudflare dashboard, or the file and the zone will drift apart. That repo's `docs/dns.md` covers the API token and the rules.
- Every record is **DNS only** (not proxied). The servers issue their own certificates over HTTP, which the Cloudflare proxy would break.
- No DNSSEC: Easyspace can't publish a DS record for nameservers it doesn't host.

## Mail split

### People's mail: Google Workspace

sidebadger.me is a secondary domain on the existing Google Workspace, whose primary domain is `pomocorp.com`, with no extra seats. The groups' owner is `gsuite@snowmonkey.co.uk`. Groups:

- `support@sidebadger.me`: the owner is a member; "Who can post" is External.
- `dmarc-reports@sidebadger.me`: receives DMARC aggregate reports.

Read the mail in Gmail. To reply as support@, use Gmail -> Settings -> Accounts -> "Send mail as".

### App transactional email: Postmark

- Return-Path: `pm-bounces.sidebadger.me`, a CNAME to `pm.mtasv.net`.
- DKIM selector: `20251218094557pm._domainkey`.
- SPF: because Postmark sends with that custom Return-Path, receivers evaluate SPF for Postmark mail against `pm-bounces.sidebadger.me`, not the apex record. The `include:spf.mtasv.net` in the apex SPF is harmless but optional; Postmark says an SPF record isn't needed when a custom Return-Path is set up. The apex SPF matters for mail sent from Google Workspace.

### Inbound mail to the app (not set up)

If the app ever needs to process incoming mail, use Postmark inbound on a separate subdomain with its own MX record (for example `in.sidebadger.me` -> `inbound.postmarkapp.com`). Never touch the apex MX.

## DNS records

| Type | Host | Value | Purpose |
|---|---|---|---|
| A | apex, `www`, `app` | `77.68.112.97` | Prod box |
| A | `staging` | `109.228.39.174` | Dev box |
| MX | apex | `1 smtp.google.com` (the only MX record) | Delivers people's mail to Workspace |
| TXT | apex | `v=spf1 include:_spf.google.com include:spf.mtasv.net ~all` | SPF for Google Workspace mail. The Postmark include is optional (see Postmark above) |
| TXT | apex | `google-site-verification=...` | Verified the domain for Workspace. Do not remove it |
| TXT | `google._domainkey` | Google DKIM, RSA 2048 | Signs Workspace mail |
| TXT | `20251218094557pm._domainkey` | Postmark DKIM | Signs app mail |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc-reports@sidebadger.me` | DMARC policy and report address |
| CNAME | `pm-bounces` | `pm.mtasv.net` | Postmark Return-Path |

### Rules

- There must be exactly one SPF record. Merge any new sender into it and keep it at 10 DNS lookups or fewer.
- DKIM key values are not recorded here. Regenerate them in Workspace -> Apps -> Gmail -> Authenticate email, and in Postmark -> Sender signatures/Domains.

## Status as of 2026-10-21 (point in time)

- MX and both DKIM records are live.
- Gmail activation in Workspace is complete: the console shows "Gmail is activated!".
- Google DKIM "Start authentication" has been clicked.
- The inbound test passed: an external email to `support@sidebadger.me` arrived in the `gsuite@snowmonkey.co.uk` inbox through the Support group.

### Follow-ups

- Consider moving DMARC to `p=quarantine` once the reports show everything aligned.
- Filter the DMARC reports in Gmail.

### 2026-10-25: moved to Cloudflare

Before the move, both Easyspace nameservers had the same records, so the SPF drift of 2026-10-21 had cleared. The 11 records were copied to Cloudflare and checked against Easyspace before the nameservers changed. The site, `app.`, `staging.` and mail all kept working.

## Verification

```bash
dig +short MX sidebadger.me
dig +short TXT sidebadger.me @harmony.ns.cloudflare.com
dig +short TXT sidebadger.me @lennox.ns.cloudflare.com
```

In the `google-workspace` repo, `scripts/cf.py show sidebadger.me` lists any difference between the zone and `dns/sidebadger.me.json`, and exits 1 if there is one.
