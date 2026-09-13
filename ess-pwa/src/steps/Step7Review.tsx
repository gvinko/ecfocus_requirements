import { useEffect, useState } from 'react';
import { getPhotosForJob } from '../db/db';
import { MANDATORY_PHOTO_CATEGORIES, PHOTO_CATEGORY_LABELS } from '../types';
import type { JobRecord, PhotoRecord } from '../types';

interface Props {
  job: JobRecord;
  jobId: number;
  onFinalize: () => void;
}

function missingRequirements(job: JobRecord, photos: PhotoRecord[]): string[] {
  const issues: string[] = [];
  if (!job.simproJobId) issues.push('Simpro Job ID is missing');
  if (!job.customerDetails.name) issues.push('Customer name is missing');
  if (!job.signatures.customerNomination?.dataUrl) issues.push('Customer nomination signature is missing');
  if (!job.signatures.customerPostInstall?.dataUrl) issues.push('Customer post-install signature is missing');
  if (!job.signatures.electrician?.dataUrl) issues.push('Electrician signature is missing');
  if (!job.signatures.refrigerationMechanic?.dataUrl) issues.push('ARC technician signature is missing');

  const capturedCategories = new Set(photos.map((p) => p.category));
  for (const category of MANDATORY_PHOTO_CATEGORIES) {
    if (!capturedCategories.has(category)) {
      issues.push(`Missing required photo: ${PHOTO_CATEGORY_LABELS[category]}`);
    }
  }
  return issues;
}

export default function Step7Review({ job, jobId, onFinalize }: Props) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  useEffect(() => {
    getPhotosForJob(jobId).then(setPhotos);
  }, [jobId]);

  const issues = missingRequirements(job, photos);
  const canFinalize = issues.length === 0 && job.status === 'draft';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">7. Review &amp; Finalize</h2>

      <div className="text-sm border rounded p-3 space-y-1">
        <p><span className="font-medium">Job:</span> {job.simproJobId || '—'}</p>
        <p><span className="font-medium">Customer:</span> {job.customerDetails.name || '—'}</p>
        <p><span className="font-medium">Address:</span> {job.customerDetails.address || '—'}</p>
        <p><span className="font-medium">Photos captured:</span> {photos.length}</p>
        <p><span className="font-medium">Status:</span> {job.status}</p>
      </div>

      {issues.length > 0 && (
        <div className="border border-amber-400 bg-amber-50 rounded p-3 text-sm">
          <p className="font-medium text-amber-800 mb-1">Cannot finalize yet:</p>
          <ul className="list-disc list-inside text-amber-800">
            {issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}

      {job.status === 'pending_sync' && (
        <p className="text-sm text-blue-700">Queued for sync — will upload automatically once online.</p>
      )}
      {job.status === 'synced' && <p className="text-sm text-green-700">Synced to Simpro.</p>}
      {job.status === 'failed' && (
        <p className="text-sm text-red-700">Last sync attempt failed: {job.syncError}</p>
      )}

      <button
        type="button"
        disabled={!canFinalize}
        onClick={onFinalize}
        className="w-full py-2 rounded bg-slate-900 text-white disabled:bg-gray-300"
      >
        Finalize &amp; Queue for Sync
      </button>
    </div>
  );
}
