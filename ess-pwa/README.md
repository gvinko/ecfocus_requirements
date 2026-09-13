# EC Focus — ESS/PDRS Nomination & Compliance PWA

Offline-first field capture app for NSW ESS/PDRS HVAC nominations (EC Focus / Altisity).
**Currently in TEST MODE:** finalized jobs are emailed as a PDF + photo/signature
package instead of syncing to Simpro (see "Current mode" below).

## Stack
- Frontend: Vite + React + TypeScript + Tailwind, `vite-plugin-pwa` (Workbox)
- Offline storage: Dexie.js (IndexedDB) — `jobs` + `photos` tables
- Signatures: `react-signature-canvas`
- Photos: `<input capture="environment">` + Canvas downscale/watermark + `browser-image-compression`
- Backend: Cloudflare Pages Function `functions/api/sync-job.ts` → PDF generation + Resend email (Simpro relay disabled, see below)

## Project layout
```
src/
  db/db.ts                     Dexie schema + query helpers
  types.ts                     Shared domain types
  components/
    GeotaggedCameraCapture.tsx GPS + watermark + compress + save to Dexie
    SignatureField.tsx         react-signature-canvas wrapper
  steps/Step1..7*.tsx           The 7-step form flow
  services/syncManager.ts      online-listener, flushes pending_sync jobs
  App.tsx                      Wizard shell
functions/api/sync-job.ts      Cloudflare Pages Function (validates payload, builds PDF, emails compliance package)
functions/api/lib/generateCompliancePdf.ts   Zero-dependency PDF writer
functions/api/lib/sendComplianceEmail.ts     Resend REST API dispatch
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in real Resend credentials
npm run build                    # produces dist/
npm run pages:dev                # serves dist/ + functions/ on :8788 via wrangler
```

In a second terminal you can instead run `npm run dev` (Vite on :5173) — its dev
server proxies `/api/*` to `http://127.0.0.1:8788`, so run `pages:dev` alongside it
if you want live API calls while iterating on the UI.

`.dev.vars` is gitignored. Never commit real credentials.

## ⚠️ Current mode: TEST (Simpro disabled)

`functions/api/sync-job.ts` currently does **not** call Simpro. On finalize
(Step 7), it generates a one-page PDF compliance summary and emails the full
audit package — PDF + site photos + signatures — to
`COMPLIANCE_NOTIFICATION_EMAIL` via Resend. No `SIMPRO_*` env vars are read
in this mode; only `RESEND_API_KEY`, `COMPLIANCE_NOTIFICATION_EMAIL`, and
`FROM_EMAIL` are required. See `functions/api/lib/generateCompliancePdf.ts`
and `functions/api/lib/sendComplianceEmail.ts`.

To restore the Simpro relay (attach files → generate tax invoice → record
payment) later, reintroduce the `SIMPRO_*` calls in `sync-job.ts` (kept in
this project's git history) alongside or instead of the email step. When you
do, remember to map the app's payment method labels to real Simpro
`PaymentMethod` IDs (Setup → Payment Methods in Simpro) before going live.

## Production deployment (Cloudflare Pages)

1. Push this repo to GitHub/GitLab and connect it as a Cloudflare Pages project,
   or deploy directly:
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name ess-pdrs-ec-focus-pwa
   ```
2. In the Cloudflare dashboard → your Pages project → **Settings → Environment
   variables**, add for the **Production** (and **Preview**, if used) environment:
   - `RESEND_API_KEY`
   - `COMPLIANCE_NOTIFICATION_EMAIL`
   - `FROM_EMAIL`

   Or via CLI:
   ```bash
   npx wrangler pages secret put RESEND_API_KEY --project-name ess-pdrs-ec-focus-pwa
   npx wrangler pages secret put COMPLIANCE_NOTIFICATION_EMAIL --project-name ess-pdrs-ec-focus-pwa
   npx wrangler pages secret put FROM_EMAIL --project-name ess-pdrs-ec-focus-pwa
   ```
3. Verify `FROM_EMAIL`'s domain in the Resend dashboard (SPF/DKIM DNS records) or sends will fail.
4. Redeploy after setting secrets so the Function picks them up.

## App icons

`public/favicon.svg` is a placeholder. Replace `public/icon-192.png` and
`public/icon-512.png` (referenced in `vite.config.ts`'s PWA manifest) with your
actual branded icons before shipping — the manifest will otherwise 404 on
those assets when installed to a home screen.

## Data flow summary (test mode)

1. Field tech works entirely offline: job + photos + signatures are written
   to IndexedDB (Dexie) as they're captured. Nothing touches the network
   until Step 7 is finalized.
2. Step 7 flips the job's `status` to `pending_sync`.
3. `syncManager.ts` listens for the browser `online` event (and checks once
   on load) and POSTs the full job + embedded base64 photos/signatures to
   `/api/sync-job`.
4. The Pages Function generates a one-page PDF summary of the job
   (`generateCompliancePdf.ts`) and emails it, along with every captured
   photo and signature, to `COMPLIANCE_NOTIFICATION_EMAIL` via Resend
   (`sendComplianceEmail.ts`). On success the job is marked `synced`; on
   any failure it's marked `failed` with `syncError` set, and will be
   retried on the next `online` event.
