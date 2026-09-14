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
    base64: string;
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
    content: string;
}
export declare function sendComplianceEmail(payload: SyncPayload, invoiceId: string | number, env: Env, extraAttachments?: ResendAttachment[]): Promise<SendComplianceEmailResult>;
export {};
