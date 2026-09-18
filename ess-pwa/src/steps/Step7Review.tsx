import { useEffect, useState } from 'react';
import { getPhotosForJob } from '../db/db';
import { MANDATORY_PHOTO_CATEGORIES, PHOTO_CATEGORY_LABELS } from '../types';
import type { JobRecord, PhotoRecord } from '../types';

interface Props {
  job: JobRecord;
  jobId: number;
  onFinalize: () => void;
}

function isBlank(value: unknown): boolean {
  return value === '' || value === null || value === undefined;
}

function missingRequirements(job: JobRecord, photos: PhotoRecord[]): string[] {
  const issues: string[] = [];
  const customer = job.customerDetails;
  const existing = job.existingUnit;
  const unit = job.newUnit;
  const commissioning = job.commissioning;
  const financials = job.financials;

  if (!job.simproJobId.trim()) issues.push('Simpro Job ID is missing');
  if (!customer.name.trim()) issues.push('Customer name is missing');
  if (!customer.address.trim()) issues.push('Site address is missing');
  if (!customer.phone.trim()) issues.push('Customer phone is missing');
  if (!customer.email.trim()) issues.push('Customer email is missing');
  if (!customer.nmi.trim()) issues.push('NMI is missing');

  if (!existing.brand.trim()) issues.push('Existing unit brand is missing');
  if (!existing.model.trim()) issues.push('Existing unit model is missing');
  if (!existing.serial.trim()) issues.push('Existing unit serial is missing');
  if (!existing.type.trim()) issues.push('Existing unit type is missing');
  if (!existing.refrigerantType.trim()) issues.push('Existing unit refrigerant type is missing');

  if (!unit.brand.trim()) issues.push('New unit brand is missing');
  if (!unit.modelIndoor.trim()) issues.push('New indoor model number is missing');
  if (!unit.modelOutdoor.trim()) issues.push('New outdoor model number is missing');
  if (!unit.serialIndoor.trim()) issues.push('New indoor serial number is missing');
  if (!unit.serialOutdoor.trim()) issues.push('New outdoor serial number is missing');
  if (isBlank(unit.kwCapacity)) issues.push('New unit capacity is missing');

  if (isBlank(commissioning.refrigerantRecoveredKg)) issues.push('Recovered refrigerant amount is missing');
  if (!commissioning.cylinderNumber.trim()) issues.push('Recovery cylinder number is missing');
  if (isBlank(commissioning.vacuumMicrons)) issues.push('Vacuum reading is missing');
  if (isBlank(commissioning.holdingPressurePsi)) issues.push('Holding pressure reading is missing');
  if (!commissioning.isolationSwitchInstalled) issues.push('Isolation switch installation is not confirmed');

  if (isBlank(financials.quotedTotalIncTax)) issues.push('Quoted total is missing');
  if (isBlank(financials.rebateDiscountIncTax)) issues.push('Rebate / discount amount is missing');
  if (isBlank(financials.customerContributionPaidIncTax)) issues.push('Customer contribution/payment is missing');
  if (!financials.paymentMethod.trim()) issues.push('Payment method is missing');

  if (!job.signatures.customerNomination?.signerName.trim()) issues.push('Customer nomination signer name is missing');
  if (!job.signatures.customerNomination?.dataUrl) issues.push('Customer nomination signature is missing');
  if (!job.signatures.customerPostInstall?.signerName.trim()) issues.push('Customer post-install signer name is missing');
  if (!job.signatures.customerPostInstall?.dataUrl) issues.push('Customer post-install signature is missing');
  if (!job.signatures.electrician?.name.trim()) issues.push('Electrician name is missing');
  if (!job.signatures.electrician?.licenceNumber.trim()) issues.push('Electrician licence number is missing');
  if (!job.signatures.electrician?.dataUrl) issues.push('Electrician signature is missing');
  if (!job.signatures.refrigerationMechanic?.name.trim()) issues.push('ARC technician name is missing');
  if (!job.signatures.refrigerationMechanic?.arcLicenceNumber.trim()) issues.push('ARC licence number is missing');
  if (!job.signatures.refrigerationMechanic?.dataUrl) issues.push('ARC technician signature is missing');

  const capturedCategories = new Set(photos.map((p) => p.category));
  for (const category of MANDATORY_PHOTO_CATEGORIES) {
    if (!capturedCategories.has(category)) {
      issues.push(`Missing required photo: ${PHOTO_CATEGORY_LABELS[category]}`);
    }
  }

  const missingGeo = photos.filter(
    (photo) =>
      MANDATORY_PHOTO_CATEGORIES.includes(photo.category) &&
      (photo.latitude === null || photo.longitude === null)
  );
  for (const photo of missingGeo) {
    issues.push(`GPS location missing: ${PHOTO_CATEGORY_LABELS[photo.category]}`);
  }

  const invalidTimestamps = photos.filter(
    (photo) => MANDATORY_PHOTO_CATEGORIES.includes(photo.category) && !photo.timestamp
  );
  for (const photo of invalidTimestamps) {
    issues.push(`Capture timestamp missing: ${PHOTO_CATEGORY_LABELS[photo.category]}`);
  }

  return issues;
}

export default function Step7Review({ job, jobId, onFinalize }: Props) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  useEffect(() => {
    getPhotosForJob(jobId).then(setPhotos);
  }, [jobId, job.photoIds.length]);

  const issues = missingRequirements(job, photos);
  const canFinalize = issues.length === 0 && job.status === 'draft';
  const readyLabel = canFinalize ? 'READY TO SUBMIT' : 'NOT READY TO SUBMIT';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">7. Compliance Readiness</h2>

      <div className={`rounded border p-3 ${canFinalize ? 'border-green-500 bg-green-50' : 'border-amber-400 bg-amber-50'}`}>
        <p className={`font-bold ${canFinalize ? 'text-green-800' : 'text-amber-800'}`}>{readyLabel}</p>
        <p className="text-sm mt-1">
          {canFinalize
            ? 'All required job details, signatures, GPS evidence and photos are present.'
            : `${issues.length} requirement${issues.length === 1 ? '' : 's'} still need attention before submission.`}
        </p>
      </div>

      <div className="text-sm border rounded p-3 space-y-1">
        <p><span className="font-medium">Job:</span> {job.simproJobId || '—'}</p>
        <p><span className="font-medium">Customer:</span> {job.customerDetails.name || '—'}</p>
        <p><span className="font-medium">Address:</span> {job.customerDetails.address || '—'}</p>
        <p><span className="font-medium">Photos captured:</span> {photos.length}</p>
        <p><span className="font-medium">Status:</span> {job.status}</p>
      </div>

      {issues.length > 0 && (
        <div className="border border-amber-400 bg-amber-50 rounded p-3 text-sm">
          <p className="font-medium text-amber-800 mb-1">Fix before submitting:</p>
          <ul className="list-disc list-inside text-amber-800 space-y-1">
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      )}

      {job.status === 'pending_sync' && (
        <p className="text-sm text-blue-700">Queued for upload — it will retry automatically when the device is online.</p>
      )}
      {job.status === 'synced' && <p className="text-sm text-green-700">Compliance package sent successfully.</p>}
      {job.status === 'failed' && (
        <p className="text-sm text-red-700">Last upload attempt failed: {job.syncError}</p>
      )}

      <button
        type="button"
        disabled={!canFinalize}
        onClick={onFinalize}
        className="w-full py-3 rounded bg-slate-900 text-white font-semibold disabled:bg-gray-300"
      >
        {canFinalize ? 'Finalize Compliance Package' : 'Complete Missing Requirements First'}
      </button>
    </div>
  );
}
