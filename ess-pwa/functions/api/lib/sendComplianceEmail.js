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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var RESEND_ENDPOINT = 'https://api.resend.com/emails';
// Resend's documented hard ceiling for total request payload (attachments +
// JSON overhead). A 512KB buffer is reserved for the HTML/text body and
// request scaffolding so we never file a request right at the boundary.
var MAX_TOTAL_BYTES = 40 * 1024 * 1024;
var REQUEST_OVERHEAD_BYTES = 512 * 1024;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Strips a "data:<mime>;base64," prefix if present; returns raw base64 as-is otherwise. */
function stripDataUrlPrefix(value) {
    var commaIndex = value.indexOf(',');
    return value.startsWith('data:') && commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
}
/** Base64 decodes to (n * 3 / 4) bytes, minus padding — close enough for a size guard. */
function estimateBase64Bytes(base64) {
    var padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.ceil((base64.length * 3) / 4) - padding);
}
function escapeHtml(value) {
    return String(value !== null && value !== void 0 ? value : '—')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function money(value) {
    var n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? "$".concat(n.toFixed(2)) : '—';
}
function safeSignerLabel(sig, key) {
    if (!sig)
        return 'Not signed';
    var who = sig[key] || 'Unnamed signer';
    var when = sig.timestamp ? new Date(sig.timestamp).toLocaleString('en-AU') : 'no timestamp';
    return "".concat(escapeHtml(who), " \u2014 ").concat(escapeHtml(when));
}
function buildAttachments(payload) {
    var attachments = [];
    payload.photos.forEach(function (photo, i) {
        var _a;
        attachments.push({
            filename: "".concat(photo.category, "_").concat((_a = photo.id) !== null && _a !== void 0 ? _a : i, ".jpg"),
            content: stripDataUrlPrefix(photo.base64)
        });
    });
    var signatureFiles = [
        ['customer_nomination_signature', payload.signatures.customerNomination],
        ['customer_post_install_signature', payload.signatures.customerPostInstall],
        ['electrician_signature', payload.signatures.electrician],
        ['arc_technician_signature', payload.signatures.refrigerationMechanic]
    ];
    for (var _i = 0, signatureFiles_1 = signatureFiles; _i < signatureFiles_1.length; _i++) {
        var _a = signatureFiles_1[_i], name_1 = _a[0], sig = _a[1];
        if (!(sig === null || sig === void 0 ? void 0 : sig.dataUrl))
            continue;
        attachments.push({
            filename: "".concat(name_1, ".png"),
            content: stripDataUrlPrefix(sig.dataUrl)
        });
    }
    return attachments;
}
function buildHtmlBody(payload, invoiceId) {
    var c = payload.customerDetails;
    var eu = payload.existingUnit;
    var nu = payload.newUnit;
    var cm = payload.commissioning;
    var fin = payload.financials;
    var sig = payload.signatures;
    var row = function (label, value) { return "\n    <tr>\n      <td style=\"padding:6px 10px;border:1px solid #ddd;background:#f8f9fa;font-weight:600;white-space:nowrap;\">".concat(escapeHtml(label), "</td>\n      <td style=\"padding:6px 10px;border:1px solid #ddd;\">").concat(escapeHtml(value), "</td>\n    </tr>"); };
    var sectionHeader = function (title) { return "\n    <tr>\n      <td colspan=\"2\" style=\"padding:8px 10px;background:#0f172a;color:#ffffff;font-weight:700;\">".concat(escapeHtml(title), "</td>\n    </tr>"); };
    return "\n  <div style=\"font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:720px;margin:0 auto;\">\n    <h2 style=\"margin-bottom:4px;\">EC Focus / Altisity \u2014 ESS/PDRS Compliance Audit Package</h2>\n    <p style=\"margin-top:0;color:#555;\">Job #".concat(escapeHtml(payload.simproJobId), " &middot; Simpro Tax Invoice #").concat(escapeHtml(invoiceId), "</p>\n\n    <table style=\"border-collapse:collapse;width:100%;font-size:14px;\">\n      ").concat(sectionHeader('Customer & Site'), "\n      ").concat(row('Customer Name', c.name), "\n      ").concat(row('Site Address', c.address), "\n      ").concat(row('NMI', c.nmi), "\n      ").concat(row('Phone', c.phone), "\n      ").concat(row('Email', c.email), "\n\n      ").concat(sectionHeader('Decommissioned Equipment'), "\n      ").concat(row('Brand', eu.brand), "\n      ").concat(row('Model', eu.model), "\n      ").concat(row('Serial', eu.serial), "\n      ").concat(row('Type', eu.type), "\n      ").concat(row('Refrigerant Type', eu.refrigerantType), "\n\n      ").concat(sectionHeader('New Installed Equipment'), "\n      ").concat(row('Brand', nu.brand), "\n      ").concat(row('Model (Indoor)', nu.modelIndoor), "\n      ").concat(row('Model (Outdoor)', nu.modelOutdoor), "\n      ").concat(row('Serial (Indoor)', nu.serialIndoor), "\n      ").concat(row('Serial (Outdoor)', nu.serialOutdoor), "\n      ").concat(row('Capacity (kW)', nu.kwCapacity), "\n\n      ").concat(sectionHeader('Commissioning Data'), "\n      ").concat(row('Triple Evac Vacuum (microns)', cm.vacuumMicrons), "\n      ").concat(row('Holding Pressure (psi)', cm.holdingPressurePsi), "\n      ").concat(row('Refrigerant Recovered (kg)', cm.refrigerantRecoveredKg), "\n      ").concat(row('Recovery Cylinder Number', cm.cylinderNumber), "\n      ").concat(row('Switchboard Isolation Installed', cm.isolationSwitchInstalled ? 'Yes' : 'No'), "\n\n      ").concat(sectionHeader('Sign-Off & Licences'), "\n      ").concat(row('Electrician', sig.electrician ? "".concat(sig.electrician.name || 'Unnamed', " (Licence #").concat(sig.electrician.licenceNumber || '—', ")") : 'Not signed'), "\n      ").concat(row('ARC Technician', sig.refrigerationMechanic ? "".concat(sig.refrigerationMechanic.name || 'Unnamed', " (ARCtick #").concat(sig.refrigerationMechanic.arcLicenceNumber || '—', ")") : 'Not signed'), "\n      ").concat(row('Customer Nomination Signed', safeSignerLabel(sig.customerNomination, 'signerName')), "\n      ").concat(row('Customer Completion Signed', safeSignerLabel(sig.customerPostInstall, 'signerName')), "\n\n      ").concat(sectionHeader('Financial Ledger Status'), "\n      ").concat(row('Quoted Total (inc. tax)', money(fin.quotedTotalIncTax)), "\n      ").concat(row('Rebate / Discount (inc. tax)', money(fin.rebateDiscountIncTax)), "\n      ").concat(row('Customer Co-Payment (inc. tax)', money(fin.customerContributionPaidIncTax)), "\n      ").concat(row('Payment Method', fin.paymentMethod || '—'), "\n    </table>\n\n    <p style=\"color:#888;font-size:12px;margin-top:16px;\">\n      Generated automatically on Simpro sync. Attachments include all captured site photos and signatures.\n    </p>\n  </div>");
}
function buildTextBody(payload, invoiceId) {
    var c = payload.customerDetails;
    var fin = payload.financials;
    return [
        "EC Focus / Altisity \u2014 ESS/PDRS Compliance Audit Package",
        "Job #".concat(payload.simproJobId, " | Simpro Tax Invoice #").concat(invoiceId),
        "",
        "Customer: ".concat(c.name),
        "Site: ".concat(c.address),
        "NMI: ".concat(c.nmi),
        "",
        "Quoted Total: ".concat(money(fin.quotedTotalIncTax)),
        "Rebate/Discount: ".concat(money(fin.rebateDiscountIncTax)),
        "Customer Co-Payment: ".concat(money(fin.customerContributionPaidIncTax), " (").concat(fin.paymentMethod || 'n/a', ")"),
        "",
        "Full details and supporting photos/signatures are attached. This is an automated notification."
    ].join('\n');
}
// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export function sendComplianceEmail(payload_1, invoiceId_1, env_1) {
    return __awaiter(this, arguments, void 0, function (payload, invoiceId, env, extraAttachments) {
        var attachments, totalAttachmentBytes, html, text, subject, body, response, err_1, responseBody, _a, detail;
        if (extraAttachments === void 0) { extraAttachments = []; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!env.RESEND_API_KEY || !env.COMPLIANCE_NOTIFICATION_EMAIL || !env.FROM_EMAIL) {
                        return [2 /*return*/, { success: false, error: 'Email dispatch misconfigured: missing RESEND_API_KEY, COMPLIANCE_NOTIFICATION_EMAIL, or FROM_EMAIL' }];
                    }
                    try {
                        attachments = __spreadArray(__spreadArray([], buildAttachments(payload), true), extraAttachments, true);
                    }
                    catch (err) {
                        return [2 /*return*/, { success: false, error: "Failed to assemble attachments: ".concat(err instanceof Error ? err.message : String(err)) }];
                    }
                    totalAttachmentBytes = attachments.reduce(function (sum, a) { return sum + estimateBase64Bytes(a.content); }, 0);
                    if (totalAttachmentBytes > MAX_TOTAL_BYTES - REQUEST_OVERHEAD_BYTES) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Compliance email payload too large (".concat((totalAttachmentBytes / (1024 * 1024)).toFixed(1), "MB of attachments, limit ~").concat(((MAX_TOTAL_BYTES - REQUEST_OVERHEAD_BYTES) / (1024 * 1024)).toFixed(1), "MB). Reduce photo count/size or split into multiple emails.")
                            }];
                    }
                    html = buildHtmlBody(payload, invoiceId);
                    text = buildTextBody(payload, invoiceId);
                    subject = "[AUDIT COMPLIANCE] Job #".concat(payload.simproJobId, " - NMI: ").concat(payload.customerDetails.nmi, " - ").concat(payload.customerDetails.name);
                    body = {
                        from: env.FROM_EMAIL,
                        to: [env.COMPLIANCE_NOTIFICATION_EMAIL],
                        subject: subject,
                        html: html,
                        text: text,
                        attachments: attachments
                    };
                    if (payload.customerDetails.email) {
                        body.reply_to = payload.customerDetails.email;
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(RESEND_ENDPOINT, {
                            method: 'POST',
                            headers: {
                                Authorization: "Bearer ".concat(env.RESEND_API_KEY),
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(body)
                        })];
                case 2:
                    response = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _b.sent();
                    return [2 /*return*/, { success: false, error: "Network error contacting Resend: ".concat(err_1 instanceof Error ? err_1.message : String(err_1)) }];
                case 4:
                    responseBody = null;
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, response.json()];
                case 6:
                    responseBody = _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _a = _b.sent();
                    return [3 /*break*/, 8];
                case 8:
                    if (!response.ok) {
                        detail = (responseBody === null || responseBody === void 0 ? void 0 : responseBody.message) || (responseBody === null || responseBody === void 0 ? void 0 : responseBody.error) || response.statusText;
                        return [2 /*return*/, { success: false, error: "Resend API error (".concat(response.status, "): ").concat(detail) }];
                    }
                    return [2 /*return*/, { success: true, emailId: responseBody === null || responseBody === void 0 ? void 0 : responseBody.id }];
            }
        });
    });
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
