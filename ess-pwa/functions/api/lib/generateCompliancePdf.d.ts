/**
 * generateCompliancePdf.ts
 *
 * Zero-dependency PDF generator for the Edge runtime. Cloudflare
 * Workers/Pages Functions have no Node.js `Buffer` and can't run
 * Node-only PDF libraries (pdfkit, puppeteer, etc.), so this writes a
 * minimal valid PDF (base-14 Helvetica text only, no images) directly as
 * a PDF byte string, then base64-encodes it with the platform's `btoa`.
 *
 * Scope is intentionally narrow: one continuous label/value document,
 * paginated automatically. Good enough for an audit-trail summary sheet;
 * not a general-purpose PDF layout engine.
 */
import type { SyncPayload } from './sendComplianceEmail';
/**
 * Builds a minimal multi-page PDF from the payload and returns its base64
 * encoding, ready to drop into a Resend `{ filename, content }` attachment.
 */
export declare function buildCompliancePdfBase64(payload: SyncPayload, referenceId: string | number): string;
