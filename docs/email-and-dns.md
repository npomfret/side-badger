# Email and DNS

Reference for the next person who changes the sidebadger.me DNS zone or its mail setup. Facts were recorded on 2026-10-21; the "Status" section is a point-in-time snapshot, the rest is the intended setup.

## Domain and DNS host

- Registrar and DNS host: **Easyspace**. Nameservers: `ns1.namecity.com` and `ns2.namecity.com`.
- The zone is **not** on Cloudflare and there is no API. Every change is made by hand in the Easyspace DNS panel.

### Easyspace quirks

- Enter TXT host names fully qualified (for example `google._domainkey.sidebadger.me`), or Save stays disabled.
- The panel adds the quotes around TXT values itself. Do not type them.
- After an edit, ns1 and ns2 can disagree. ns2 updated but ns1 kept serving the old SPF record for over 20 minutes. Check both directly:

  ```bash
  dig +short TXT sidebadger.me @ns1.namecity.com
  dig +short TXT sidebadger.me @ns2.namecity.com
  ```

  If ns1 is stale, re-save the record. If that fails, raise a ticket with Easyspace.

## Mail split

### People's mail: Google Workspace

sidebadger.me is a secondary domain on the owner's existing Workspace, with no extra seats. Groups:

- `support@sidebadger.me`: the owner is a member; "Who can post" is External.
- `dmarc-reports@sidebadger.me`: receives DMARC aggregate reports.

Read the mail in Gmail. To reply as support@, use Gmail -> Settings -> Accounts -> "Send mail as".

### App transactional email: Postmark

- Return-Path: `pm-bounces.sidebadger.me`, a CNAME to `pm.mtasv.net`.
- DKIM selector: `20251218094557pm._domainkey`.

### Inbound mail to the app (not set up)

If the app ever needs to process incoming mail, use Postmark inbound on a separate subdomain with its own MX record (for example `in.sidebadger.me` -> `inbound.postmarkapp.com`). Never touch the apex MX.

## DNS records

| Type | Host | Value | Purpose |
|---|---|---|---|
| MX | apex | `1 smtp.google.com` (the only MX record) | Delivers people's mail to Workspace |
| TXT | apex | `v=spf1 include:_spf.google.com include:spf.mtasv.net ~all` | SPF for Google and Postmark |
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
- SPF on ns1 is stale (see the Easyspace quirks above).
- Gmail activation in Workspace is pending. The first check failed, most likely because the "no MX" answer was still cached (1-hour negative TTL).
- Google DKIM "Start authentication" has been clicked.
- The inbound test email has not been sent yet.

### Follow-ups

- Consider moving DMARC to `p=quarantine` once the reports show everything aligned.
- Filter the DMARC reports in Gmail.

## Verification

```bash
dig +short MX sidebadger.me
dig +short TXT sidebadger.me @ns1.namecity.com
dig +short TXT sidebadger.me @ns2.namecity.com
```

Run the TXT query against both nameservers after every edit, and confirm they return the same single SPF record.
