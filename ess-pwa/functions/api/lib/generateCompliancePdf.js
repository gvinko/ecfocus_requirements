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
var PAGE_WIDTH = 612; // US Letter, points
var PAGE_HEIGHT = 792;
var MARGIN = 50;
var FONT_SIZE = 10;
var LINE_HEIGHT = 14;
var LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);
/** Keeps the output string strictly single-byte (Latin-1) so btoa() is valid. */
function toLatin1(value) {
    return String(value !== null && value !== void 0 ? value : '—')
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, function (ch) { return (ch === '—' ? '-' : '?'); })
        .slice(0, 500);
}
/** Escapes PDF string-literal special characters: backslash and parens. */
function escapePdfText(value) {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function money(value) {
    var n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? "$".concat(n.toFixed(2)) : '-';
}
function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
function buildLines(payload, referenceId) {
    var c = payload.customerDetails;
    var eu = payload.existingUnit;
    var nu = payload.newUnit;
    var cm = payload.commissioning;
    var fin = payload.financials;
    var sig = payload.signatures;
    var lines = [];
    var header = function (t) { return lines.push({ text: t, bold: true }, { text: '' }); };
    var row = function (label, value) { return lines.push({ text: "".concat(label, ": ").concat(toLatin1(value)) }); };
    lines.push({ text: 'EC Focus / Altisity - ESS/PDRS Compliance Audit Package', bold: true });
    lines.push({ text: "Job Reference #".concat(toLatin1(payload.simproJobId), "  |  ").concat(toLatin1(referenceId)) });
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
    row('Electrician', sig.electrician ? "".concat(sig.electrician.name || 'Unnamed', " (Licence #").concat(sig.electrician.licenceNumber || '-', ")") : 'Not signed');
    row('ARC Technician', sig.refrigerationMechanic ? "".concat(sig.refrigerationMechanic.name || 'Unnamed', " (ARCtick #").concat(sig.refrigerationMechanic.arcLicenceNumber || '-', ")") : 'Not signed');
    row('Customer Nomination Signed', sig.customerNomination ? "".concat(sig.customerNomination.signerName || 'Unnamed', " - ").concat(sig.customerNomination.timestamp || '') : 'Not signed');
    row('Customer Completion Signed', sig.customerPostInstall ? "".concat(sig.customerPostInstall.signerName || 'Unnamed', " - ").concat(sig.customerPostInstall.timestamp || '') : 'Not signed');
    header('Financial Ledger Status');
    row('Quoted Total (inc. tax)', money(fin.quotedTotalIncTax));
    row('Rebate / Discount (inc. tax)', money(fin.rebateDiscountIncTax));
    row('Customer Co-Payment (inc. tax)', money(fin.customerContributionPaidIncTax));
    row('Payment Method', fin.paymentMethod || '-');
    lines.push({ text: '' });
    lines.push({ text: "Generated automatically on job finalization. Photos are attached separately to this email." });
    return lines;
}
/**
 * Builds a minimal multi-page PDF from the payload and returns its base64
 * encoding, ready to drop into a Resend `{ filename, content }` attachment.
 */
export function buildCompliancePdfBase64(payload, referenceId) {
    var _a;
    var lines = buildLines(payload, referenceId);
    var pages = chunk(lines, LINES_PER_PAGE);
    var numPages = Math.max(1, pages.length);
    // Object numbering: 1=Catalog, 2=Pages, 3=Font F1 (Helvetica),
    // 4=Font F2 (Helvetica-Bold), then per page i (0-indexed):
    // page object id = 5 + i*2, content stream id = 6 + i*2.
    var pageIds = Array.from({ length: numPages }, function (_, i) { return 5 + i * 2; });
    var contentIds = Array.from({ length: numPages }, function (_, i) { return 6 + i * 2; });
    var maxId = contentIds[contentIds.length - 1];
    var chunks = [];
    var offsets = [];
    var length = 0;
    var write = function (s) {
        chunks.push(s);
        length += s.length;
    };
    var addObject = function (id, body) {
        offsets[id] = length;
        write("".concat(id, " 0 obj\n").concat(body, "\nendobj\n"));
    };
    write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObject(2, "<< /Type /Pages /Kids [".concat(pageIds.map(function (id) { return "".concat(id, " 0 R"); }).join(' '), "] /Count ").concat(numPages, " >>"));
    addObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    addObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    (pages.length ? pages : [[]]).forEach(function (pageLines, i) {
        var pageId = pageIds[i];
        var contentId = contentIds[i];
        var streamParts = ["BT", "".concat(LINE_HEIGHT, " TL"), "".concat(MARGIN, " ").concat(PAGE_HEIGHT - MARGIN, " Td")];
        for (var _i = 0, pageLines_1 = pageLines; _i < pageLines_1.length; _i++) {
            var line = pageLines_1[_i];
            var font = line.bold ? '/F2' : '/F1';
            streamParts.push("".concat(font, " ").concat(FONT_SIZE, " Tf"));
            streamParts.push("(".concat(escapePdfText(line.text), ") Tj"));
            streamParts.push("T*");
        }
        streamParts.push('ET');
        var streamContent = streamParts.join('\n');
        addObject(pageId, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ".concat(PAGE_WIDTH, " ").concat(PAGE_HEIGHT, "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ").concat(contentId, " 0 R >>"));
        addObject(contentId, "<< /Length ".concat(streamContent.length, " >>\nstream\n").concat(streamContent, "\nendstream"));
    });
    var xrefOffset = length;
    var pad10 = function (n) { return String(n).padStart(10, '0'); };
    var xref = "xref\n0 ".concat(maxId + 1, "\n0000000000 65535 f \n");
    for (var id = 1; id <= maxId; id++) {
        xref += "".concat(pad10((_a = offsets[id]) !== null && _a !== void 0 ? _a : 0), " 00000 n \n");
    }
    write(xref);
    write("trailer\n<< /Size ".concat(maxId + 1, " /Root 1 0 R >>\nstartxref\n").concat(xrefOffset, "\n%%EOF"));
    var pdfString = chunks.join('');
    return btoa(pdfString);
}
