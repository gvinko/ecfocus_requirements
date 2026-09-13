import Dexie, { type Table } from 'dexie';
import type { JobRecord, PhotoRecord } from '../types';

class EssComplianceDB extends Dexie {
  jobs!: Table<JobRecord, number>;
  photos!: Table<PhotoRecord, string>;

  constructor() {
    super('ess_pdrs_ec_focus_db');
    this.version(1).stores({
      // '++id' = auto-increment PK. Secondary index on status so the sync
      // manager can query pending_sync jobs without a full table scan.
      jobs: '++id, simproJobId, status, updatedAt',
      // Photo PK is a UUID assigned client-side (see GeotaggedCameraCapture),
      // indexed by jobId so a job's photos can be pulled in one query.
      photos: 'id, jobId, category'
    });
  }
}

export const db = new EssComplianceDB();

export async function createJob(job: JobRecord): Promise<number> {
  return db.jobs.add(job);
}

export async function updateJob(id: number, patch: Partial<JobRecord>): Promise<void> {
  await db.jobs.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function getJob(id: number): Promise<JobRecord | undefined> {
  return db.jobs.get(id);
}

export async function getPendingSyncJobs(): Promise<JobRecord[]> {
  return db.jobs.where('status').equals('pending_sync').toArray();
}

export async function getPhotosForJob(jobId: number): Promise<PhotoRecord[]> {
  return db.photos.where('jobId').equals(jobId).toArray();
}

export async function addPhoto(photo: PhotoRecord): Promise<string> {
  return db.photos.add(photo);
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}
