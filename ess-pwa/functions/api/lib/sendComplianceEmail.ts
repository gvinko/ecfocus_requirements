/**
 * sendComplianceEmail.ts
 *
 * Isolated, dependency-free email dispatch for the EC Focus / Altisity
 * compliance audit package, sent via the Resend REST API on the Cloudflare
 * Workers/Pages Functions edge runtime (native `fetch` only).
 *
 * This module never throws: every failure path (oversized payload, network
 * error, non-2xx from Resend) resolves to a status object, so a failed
 * email can never roll back an already-committed Simpro job sync.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Env {
  RESEND_API_KEY: string;
  COMPLIANCE_NOTIFICATION_EMAIL: string;
  FROM_EMAIL: string;
}

interface SignatureEntry {
  dataUrl: string;
  timestamp: string;
  signerName?: string;
  name?: string;
  licenceNumber?: string;
  arcLicenceNumber?: string;
}

interface SyncPayloadSignatures {
  customerNomination: SignatureEntry | null;
  customerPostInstall: SignatureEntry | null;
  electrician: SignatureEntry | null;
  refrigerationMechanic: SignatureEntry | null;
}

interface SyncPayloadPhoto {
  id?: string;
  category: string;
  base64: string; // data URL or raw base64
  timestamp?: string;
}

export interface SyncPayload {
  simproJobId: string | number;
  customerDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    nmi: string;
  };
  existingUnit: {
    brand: string;
    model: string;
    serial: string;
    type: string;
    refrigerantType: string;
  };
  newUnit: {
    brand: string;
    modelIndoor: string;
    modelOutdoor: string;
    serialIndoor: string;
    serialOutdoor: string;
    kwCapacity: number | string;
  };
  commissioning: {
    refrigerantRecoveredKg: number | string;
    cylinderNumber: string;
    vacuumMicrons: number | string;
    holdingPressurePsi: number | string;
    isolationSwitchInstalled: boolean;
  };
  financials: {
    quotedTotalIncTax: number | string;
    rebateDiscountIncTax: number | string;
    customerContributionPaidIncTax: number | string;
    paymentMethod: string;
  };
  signatures: SyncPayloadSignatures;
  photos: SyncPayloadPhoto[];
}

export interface SendComplianceEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export interface ResendAttachment {
  filename: string;
  content: string; // raw base64, no data URL prefix
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// Resend's documented hard ceiling for total request payload (attachments +
// JSON overhead). A 512KB buffer is reserved for the HTML/text body and
// request scaffolding so we never file a request right at the boundary.
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const REQUEST_OVERHEAD_BYTES = 512 * 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strips a "data:<mime>;base64," prefix if present; returns raw base64 as-is otherwise. */
function stripDataUrlPrefix(value: string): string {
  const commaIndex = value.indexOf(',');
  return value.startsWith('data:') && commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}

/** Base64 decodes to (n * 3 / 4) bytes, minus padding — close enough for a size guard. */
function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.ceil((base64.length * 3) / 4) - padding);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value: number | string | undefined): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
}

function safeSignerLabel(sig: SignatureEntry | null, key: 'signerName' | 'name'): string {
  if (!sig) return 'Not signed';
  const who = sig[key] || 'Unnamed signer';
  const when = sig.timestamp ? new Date(sig.timestamp).toLocaleString('en-AU') : 'no timestamp';
  return `${escapeHtml(who)} — ${escapeHtml(when)}`;
}

function buildAttachments(payload: SyncPayload): ResendAttachment[] {
  const attachments: ResendAttachment[] = [];

  payload.photos.forEach((photo, i) => {
    attachments.push({
      filename: `${photo.category}_${photo.id ?? i}.jpg`,
      content: stripDataUrlPrefix(photo.base64)
    });
  });

  const signatureFiles: Array<[string, SignatureEntry | null]> = [
    ['customer_nomination_signature', payload.signatures.customerNomination],
    ['customer_post_install_signature', payload.signatures.customerPostInstall],
    ['electrician_signature', payload.signatures.electrician],
    ['arc_technician_signature', payload.signatures.refrigerationMechanic]
  ];

  for (const [name, sig] of signatureFiles) {
    if (!sig?.dataUrl) continue;
    attachments.push({
      filename: `${name}.png`,
      content: stripDataUrlPrefix(sig.dataUrl)
    });
  }

  return attachments;
}

function buildHtmlBody(payload: SyncPayload, invoiceId: string | number): string {
  const c = payload.customerDetails;
  const eu = payload.existingUnit;
  const nu = payload.newUnit;
  const cm = payload.commissioning;
  const fin = payload.financials;
  const sig = payload.signatures;

  const row = (label: string, value: unknown) => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd;background:#f8f9fa;font-weight:600;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(value)}</td>
    </tr>`;

  const sectionHeader = (title: string) => `
    <tr>
      <td colspan="2" style="padding:8px 10px;background:#0f172a;color:#ffffff;font-weight:700;">${escapeHtml(title)}</td>
    </tr>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:720px;margin:0 auto;">
    <h2 style="margin-bottom:4px;">EC Focus / Altisity — ESS/PDRS Compliance Audit Package</h2>
    <p style="margin-top:0;color:#555;">Job #${escapeHtml(payload.simproJobId)} &middot; Simpro Tax Invoice #${escapeHtml(invoiceId)}</p>

    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      ${sectionHeader('Customer & Site')}
      ${row('Customer Name', c.name)}
      ${row('Site Address', c.address)}
      ${row('NMI', c.nmi)}
      ${row('Phone', c.phone)}
      ${row('Email', c.email)}

      ${sectionHeader('Decommissioned Equipment')}
      ${row('Brand', eu.brand)}
      ${row('Model', eu.model)}
      ${row('Serial', eu.serial)}
      ${row('Type', eu.type)}
      ${row('Refrigerant Type', eu.refrigerantType)}

      ${sectionHeader('New Installed Equipment')}
      ${row('Brand', nu.brand)}
      ${row('Model (Indoor)', nu.modelIndoor)}
      ${row('Model (Outdoor)', nu.modelOutdoor)}
      ${row('Serial (Indoor)', nu.serialIndoor)}
      ${row('Serial (Outdoor)', nu.serialOutdoor)}
      ${row('Capacity (kW)', nu.kwCapacity)}

      ${sectionHeader('Commissioning Data')}
      ${row('Triple Evac Vacuum (microns)', cm.vacuumMicrons)}
      ${row('Holding Pressure (psi)', cm.holdingPressurePsi)}
      ${row('Refrigerant Recovered (kg)', cm.refrigerantRecoveredKg)}
      ${row('Recovery Cylinder Number', cm.cylinderNumber)}
      ${row('Switchboard Isolation Installed', cm.isolationSwitchInstalled ? 'Yes' : 'No')}

      ${sectionHeader('Sign-Off & Licences')}
      ${row('Electrician', sig.electrician ? `${sig.electrician.name || 'Unnamed'} (Licence #${sig.electrician.licenceNumber || '—'})` : 'Not signed')}
      ${row('ARC Technician', sig.refrigerationMechanic ? `${sig.refrigerationMechanic.name || 'Unnamed'} (ARCtick #${sig.refrigerationMechanic.arcLicenceNumber || '—'})` : 'Not signed')}
      ${row('Customer Nomination Signed', safeSignerLabel(sig.customerNomination, 'signerName'))}
      ${row('Customer Completion Signed', safeSignerLabel(sig.customerPostInstall, 'signerName'))}

      ${sectionHeader('Financial Ledger Status')}
      ${row('Quoted Total (inc. tax)', money(fin.quotedTotalIncTax))}
      ${row('Rebate / Discount (inc. tax)', money(fin.rebateDiscountIncTax))}
      ${row('Customer Co-Payment (inc. tax)', money(fin.customerContributionPaidIncTax))}
      ${row('Payment Method', fin.paymentMethod || '—')}
    </table>

    <p style="color:#888;font-size:12px;margin-top:16px;">
      Generated automatically on Simpro sync. Attachments include all captured site photos and signatures.
    </p>
  </div>`;
}

function buildTextBody(payload: SyncPayload, invoiceId: string | number): string {
  const c = payload.customerDetails;
  const fin = payload.financials;
  return [
    `EC Focus / Altisity — ESS/PDRS Compliance Audit Package`,
    `Job #${payload.simproJobId} | Simpro Tax Invoice #${invoiceId}`,
    ``,
    `Customer: ${c.name}`,
    `Site: ${c.address}`,
    `NMI: ${c.nmi}`,
    ``,
    `Quoted Total: ${money(fin.quotedTotalIncTax)}`,
    `Rebate/Discount: ${money(fin.rebateDiscountIncTax)}`,
    `Customer Co-Payment: ${money(fin.customerContributionPaidIncTax)} (${fin.paymentMethod || 'n/a'})`,
    ``,
    `Full details and supporting photos/signatures are attached. This is an automated notification.`
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function sendComplianceEmail(
  payload: SyncPayload,
  invoiceId: string | number,
  env: Env,
  extraAttachments: ResendAttachment[] = []
): Promise<SendComplianceEmailResult> {
  if (!env.RESEND_API_KEY || !env.COMPLIANCE_NOTIFICATION_EMAIL || !env.FROM_EMAIL) {
    return { success: false, error: 'Email dispatch misconfigured: missing RESEND_API_KEY, COMPLIANCE_NOTIFICATION_EMAIL, or FROM_EMAIL' };
  }

  let attachments: ResendAttachment[];
  try {
    attachments = [...buildAttachments(payload), ...extraAttachments];
  } catch (err) {
    return { success: false, error: `Failed to assemble attachments: ${err instanceof Error ? err.message : String(err)}` };
  }

  const totalAttachmentBytes = attachments.reduce((sum, a) => sum + estimateBase64Bytes(a.content), 0);
  if (totalAttachmentBytes > MAX_TOTAL_BYTES - REQUEST_OVERHEAD_BYTES) {
    return {
      success: false,
      error: `Compliance email payload too large (${(totalAttachmentBytes / (1024 * 1024)).toFixed(1)}MB of attachments, limit ~${((MAX_TOTAL_BYTES - REQUEST_OVERHEAD_BYTES) / (1024 * 1024)).toFixed(1)}MB). Reduce photo count/size or split into multiple emails.`
    };
  }

  const html = buildHtmlBody(payload, invoiceId);
  const text = buildTextBody(payload, invoiceId);
  const subject = `[AUDIT COMPLIANCE] Job #${payload.simproJobId} - NMI: ${payload.customerDetails.nmi} - ${payload.customerDetails.name}`;

  const body: Record<string, unknown> = {
    from: env.FROM_EMAIL,
    to: [env.COMPLIANCE_NOTIFICATION_EMAIL],
    subject,
    html,
    text,
    attachments
  };
  if (payload.customerDetails.email) {
    body.reply_to = payload.customerDetails.email;
  }

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    return { success: false, error: `Network error contacting Resend: ${err instanceof Error ? err.message : String(err)}` };
  }

  let responseBody: any = null;
  try {
    responseBody = await response.json();
  } catch {
    // Non-JSON response body — fall through, handled by status check below.
  }

  if (!response.ok) {
    const detail = responseBody?.message || responseBody?.error || response.statusText;
    return { success: false, error: `Resend API error (${response.status}): ${detail}` };
  }

  return { success: true, emailId: responseBody?.id };
}

// ---------------------------------------------------------------------------
// Example invocation (see functions/api/sync-job.ts):
//
//   const pdfBase64 = buildCompliancePdfBase64(payload, referenceId);
//   const emailResult = await sendComplianceEmail(payload, referenceId, env, [
//     { filename: `compliance_summary_${payload.simproJobId}.pdf`, content: pdfBase64 }
//   ]);
//   if (!emailResult.success) {
//     console.error('Compliance email dispatch failed:', emailResult.error);
//   }
// ---------------------------------------------------------------------------
