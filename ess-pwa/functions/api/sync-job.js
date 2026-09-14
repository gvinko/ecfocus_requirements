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
import { sendComplianceEmail } from './lib/sendComplianceEmail';
import { buildCompliancePdfBase64 } from './lib/generateCompliancePdf';
export var onRequestPost = function (context) { return __awaiter(void 0, void 0, void 0, function () {
    var request, env, payload, _a, referenceId, pdfBase64, emailResult;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                request = context.request, env = context.env;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, request.json()];
            case 2:
                payload = _b.sent();
                return [3 /*break*/, 4];
            case 3:
                _a = _b.sent();
                return [2 /*return*/, new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), { status: 400 })];
            case 4:
                if (!payload.simproJobId) {
                    return [2 /*return*/, new Response(JSON.stringify({ success: false, error: 'Missing simproJobId' }), { status: 400 })];
                }
                if (!env.RESEND_API_KEY || !env.COMPLIANCE_NOTIFICATION_EMAIL || !env.FROM_EMAIL) {
                    return [2 /*return*/, new Response(JSON.stringify({ success: false, error: 'Server misconfigured: RESEND_API_KEY / COMPLIANCE_NOTIFICATION_EMAIL / FROM_EMAIL not set' }), { status: 500 })];
                }
                referenceId = "TEST-".concat(payload.simproJobId, "-").concat(Date.now());
                try {
                    pdfBase64 = buildCompliancePdfBase64(payload, referenceId);
                }
                catch (err) {
                    return [2 /*return*/, new Response(JSON.stringify({ success: false, error: "PDF generation failed: ".concat(err instanceof Error ? err.message : String(err)) }), { status: 500 })];
                }
                return [4 /*yield*/, sendComplianceEmail(payload, referenceId, env, [
                        { filename: "compliance_summary_".concat(payload.simproJobId, ".pdf"), content: pdfBase64 }
                    ])];
            case 5:
                emailResult = _b.sent();
                if (!emailResult.success) {
                    return [2 /*return*/, new Response(JSON.stringify({ success: false, error: emailResult.error }), {
                            status: 502,
                            headers: { 'Content-Type': 'application/json' }
                        })];
                }
                return [2 /*return*/, new Response(JSON.stringify({ success: true, emailId: emailResult.emailId, referenceId: referenceId }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    })];
        }
    });
}); };
