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

import { sendComplianceEmail, type Env, type SyncPayload } from './lib/sendComplianceEmail';
import { buildCompliancePdfBase64 } from './lib/generateCompliancePdf';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let payload: SyncPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!payload.simproJobId) {
    return new Response(JSON.stringify({ success: false, error: 'Missing simproJobId' }), { status: 400 });
  }
  if (!env.RESEND_API_KEY || !env.COMPLIANCE_NOTIFICATION_EMAIL || !env.FROM_EMAIL) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server misconfigured: RESEND_API_KEY / COMPLIANCE_NOTIFICATION_EMAIL / FROM_EMAIL not set' }),
      { status: 500 }
    );
  }

  const referenceId = `TEST-${payload.simproJobId}-${Date.now()}`;

  let pdfBase64: string;
  try {
    pdfBase64 = buildCompliancePdfBase64(payload, referenceId);
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: `PDF generation failed: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 500 }
    );
  }

  const emailResult = await sendComplianceEmail(payload, referenceId, env, [
    { filename: `compliance_summary_${payload.simproJobId}.pdf`, content: pdfBase64 }
  ]);

  if (!emailResult.success) {
    return new Response(JSON.stringify({ success: false, error: emailResult.error }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true, emailId: emailResult.emailId, referenceId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
