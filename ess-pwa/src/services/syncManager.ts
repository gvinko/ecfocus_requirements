import { getPendingSyncJobs, getPhotosForJob, updateJob } from '../db/db';
import type { JobRecord, PhotoRecord } from '../types';

interface SyncPhotoPayload {
  id: string;
  category: PhotoRecord['category'];
  base64: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

interface SyncJobPayload extends Omit<JobRecord, 'photoIds'> {
  photos: SyncPhotoPayload[];
}

let syncInFlight = false;

async function buildPayload(job: JobRecord): Promise<SyncJobPayload> {
  const photos = await getPhotosForJob(job.id!);
  const { photoIds, ...jobFields } = job;
  return {
    ...jobFields,
    photos: photos.map((p) => ({
      id: p.id,
      category: p.category,
      base64: p.base64,
      latitude: p.latitude,
      longitude: p.longitude,
      timestamp: p.timestamp
    }))
  };
}

async function syncOneJob(job: JobRecord): Promise<void> {
  const payload = await buildPayload(job);
  try {
    const res = await fetch('/api/sync-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Sync failed (${res.status}): ${text}`);
    }

    await updateJob(job.id!, { status: 'synced', syncError: undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    await updateJob(job.id!, { status: 'failed', syncError: message });
  }
}

/**
 * Flushes every locally queued job whose status is 'pending_sync'.
 * Safe to call repeatedly; re-entrant calls are ignored via syncInFlight.
 * Jobs are synced sequentially (not in parallel) so a failure on one job's
 * Simpro calls can't race with another job's invoice/payment sequence.
 */
export async function flushPendingJobs(): Promise<void> {
  if (syncInFlight) return;
  if (!navigator.onLine) return;

  syncInFlight = true;
  try {
    const pending = await getPendingSyncJobs();
    for (const job of pending) {
      await syncOneJob(job);
    }
  } finally {
    syncInFlight = false;
  }
}

export function startSyncManager(): void {
  window.addEventListener('online', () => {
    flushPendingJobs();
  });

  // Also attempt a flush on startup in case the device is already online
  // with jobs left over from a previous offline session.
  if (navigator.onLine) {
    flushPendingJobs();
  }
}
