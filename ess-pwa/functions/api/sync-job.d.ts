/**
 * POST /api/sync-job
 *
 * TEST MODE: Simpro integration is disabled for now. Instead of attaching
 * files/creating an invoice/recording a payment in Simpro, this route
 * generates a one-page PDF compliance summary and emails the full audit
 * package (PDF + site photos + signatures) to the compliance inbox via
 * sendComplianceEmail / Resend.
 *
 * To restore the Simpro relay later, see the git history for this file, or
 * reintroduce the SIMPRO_* env vars and the attach/invoice/payment calls
 * alongside this email step (both can run in the same handler).
 *
 * Env vars required (see .dev.vars.example):
 *   RESEND_API_KEY
 *   COMPLIANCE_NOTIFICATION_EMAIL
 *   FROM_EMAIL
 */
import { type Env } from './lib/sendComplianceEmail';
export declare const onRequestPost: PagesFunction<Env>;
