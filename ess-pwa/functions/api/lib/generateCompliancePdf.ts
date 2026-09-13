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

interface PdfLine {
  text: string;
  bold?: boolean;
}

const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

/** Keeps the output string strictly single-byte (Latin-1) so btoa() is valid. */
function toLatin1(value: unknown): string {
  return String(value ?? '—')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, (ch) => (ch === '—' ? '-' : '?'))
    .slice(0, 500);
}

/** Escapes PDF string-literal special characters: backslash and parens. */
function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(value: number | string | undefined): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '-';
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildLines(payload: SyncPayload, referenceId: string | number): PdfLine[] {
  const c = payload.customerDetails;
  const eu = payload.existingUnit;
  const nu = payload.newUnit;
  const cm = payload.commissioning;
  const fin = payload.financials;
  const sig = payload.signatures;

  const lines: PdfLine[] = [];
  const header = (t: string) => lines.push({ text: t, bold: true }, { text: '' });
  const row = (label: string, value: unknown) => lines.push({ text: `${label}: ${toLatin1(value)}` });

  lines.push({ text: 'EC Focus / Altisity - ESS/PDRS Compliance Audit Package', bold: true });
  lines.push({ text: `Job Reference #${toLatin1(payload.simproJobId)}  |  ${toLatin1(referenceId)}` });
  lines.push({ text: '' });

  header('Customer & Site');
  row('Customer Name', c.name);
  row('Site Address', c.address);
  row('NMI', c.nmi);
  row('Phone', c.phone);
  row('Email', c.email);

  header('Decommissioned Equipment');
  row('Brand', eu.brand);
  row('Model', eu.model);
  row('Serial', eu.serial);
  row('Type', eu.type);
  row('Refrigerant Type', eu.refrigerantType);

  header('New Installed Equipment');
  row('Brand', nu.brand);
  row('Model (Indoor)', nu.modelIndoor);
  row('Model (Outdoor)', nu.modelOutdoor);
  row('Serial (Indoor)', nu.serialIndoor);
  row('Serial (Outdoor)', nu.serialOutdoor);
  row('Capacity (kW)', nu.kwCapacity);

  header('Commissioning Data');
  row('Triple Evac Vacuum (microns)', cm.vacuumMicrons);
  row('Holding Pressure (psi)', cm.holdingPressurePsi);
  row('Refrigerant Recovered (kg)', cm.refrigerantRecoveredKg);
  row('Recovery Cylinder Number', cm.cylinderNumber);
  row('Switchboard Isolation Installed', cm.isolationSwitchInstalled ? 'Yes' : 'No');

  header('Sign-Off & Licences');
  row('Electrician', sig.electrician ? `${sig.electrician.name || 'Unnamed'} (Licence #${sig.electrician.licenceNumber || '-'})` : 'Not signed');
  row('ARC Technician', sig.refrigerationMechanic ? `${sig.refrigerationMechanic.name || 'Unnamed'} (ARCtick #${sig.refrigerationMechanic.arcLicenceNumber || '-'})` : 'Not signed');
  row('Customer Nomination Signed', sig.customerNomination ? `${sig.customerNomination.signerName || 'Unnamed'} - ${sig.customerNomination.timestamp || ''}` : 'Not signed');
  row('Customer Completion Signed', sig.customerPostInstall ? `${sig.customerPostInstall.signerName || 'Unnamed'} - ${sig.customerPostInstall.timestamp || ''}` : 'Not signed');

  header('Financial Ledger Status');
  row('Quoted Total (inc. tax)', money(fin.quotedTotalIncTax));
  row('Rebate / Discount (inc. tax)', money(fin.rebateDiscountIncTax));
  row('Customer Co-Payment (inc. tax)', money(fin.customerContributionPaidIncTax));
  row('Payment Method', fin.paymentMethod || '-');

  lines.push({ text: '' });
  lines.push({ text: `Generated automatically on job finalization. Photos are attached separately to this email.` });

  return lines;
}

/**
 * Builds a minimal multi-page PDF from the payload and returns its base64
 * encoding, ready to drop into a Resend `{ filename, content }` attachment.
 */
export function buildCompliancePdfBase64(payload: SyncPayload, referenceId: string | number): string {
  const lines = buildLines(payload, referenceId);
  const pages = chunk(lines, LINES_PER_PAGE);
  const numPages = Math.max(1, pages.length);

  // Object numbering: 1=Catalog, 2=Pages, 3=Font F1 (Helvetica),
  // 4=Font F2 (Helvetica-Bold), then per page i (0-indexed):
  // page object id = 5 + i*2, content stream id = 6 + i*2.
  const pageIds = Array.from({ length: numPages }, (_, i) => 5 + i * 2);
  const contentIds = Array.from({ length: numPages }, (_, i) => 6 + i * 2);
  const maxId = contentIds[contentIds.length - 1];

  const chunks: string[] = [];
  const offsets: number[] = [];
  let length = 0;

  const write = (s: string) => {
    chunks.push(s);
    length += s.length;
  };

  const addObject = (id: number, body: string) => {
    offsets[id] = length;
    write(`${id} 0 obj\n${body}\nendobj\n`);
  };

  write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(
    2,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${numPages} >>`
  );
  addObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  addObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  (pages.length ? pages : [[]]).forEach((pageLines, i) => {
    const pageId = pageIds[i];
    const contentId = contentIds[i];

    const streamParts: string[] = [`BT`, `${LINE_HEIGHT} TL`, `${MARGIN} ${PAGE_HEIGHT - MARGIN} Td`];
    for (const line of pageLines) {
      const font = line.bold ? '/F2' : '/F1';
      streamParts.push(`${font} ${FONT_SIZE} Tf`);
      streamParts.push(`(${escapePdfText(line.text)}) Tj`);
      streamParts.push(`T*`);
    }
    streamParts.push('ET');
    const streamContent = streamParts.join('\n');

    addObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    addObject(contentId, `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
  });

  const xrefOffset = length;
  const pad10 = (n: number) => String(n).padStart(10, '0');

  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    xref += `${pad10(offsets[id] ?? 0)} 00000 n \n`;
  }
  write(xref);
  write(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdfString = chunks.join('');
  return btoa(pdfString);
}
