import { useEffect, useState } from 'react';
import { createJob, getJob, updateJob } from './db/db';
import { flushPendingJobs } from './services/syncManager';
import { emptyJob } from './types';
import type { JobRecord } from './types';

import Step1CustomerSite from './steps/Step1CustomerSite';
import Step2Nomination from './steps/Step2Nomination';
import Step3ExistingEquipment from './steps/Step3ExistingEquipment';
import Step4NewEquipment from './steps/Step4NewEquipment';
import Step5TradeSignoff from './steps/Step5TradeSignoff';
import Step6PostInstall from './steps/Step6PostInstall';
import Step7Review from './steps/Step7Review';

const STEP_LABELS = ['Site', 'Nomination', 'Existing', 'New/Commission', 'Trades', 'Post-Install', 'Review'];

export default function App() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [step, setStep] = useState(1);
  const [online, setOnline] = useState(navigator.onLine);

  // Bootstrap: create a fresh draft job on first load. A real deployment
  // would route this from a job list screen; kept minimal per spec scope.
  useEffect(() => {
    (async () => {
      const id = await createJob(emptyJob());
      setJobId(id);
      setJob(await getJob(id));
    })();
  }, []);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  async function patchJob(patch: Partial<JobRecord>) {
    if (jobId === null) return;
    await updateJob(jobId, patch);
    setJob(await getJob(jobId));
  }

  function registerPhoto(photoId: string) {
    if (!job) return;
    patchJob({ photoIds: [...job.photoIds, photoId] });
  }

  async function finalize() {
    if (jobId === null) return;
    await updateJob(jobId, { status: 'pending_sync' });
    setJob(await getJob(jobId));
    if (navigator.onLine) flushPendingJobs();
  }

  if (!job || jobId === null) {
    return <div className="p-6 text-center text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      <header className="sticky top-0 bg-slate-900 text-white p-3 flex items-center justify-between">
        <span className="font-semibold text-sm">EC Focus Compliance</span>
        <span className={`text-xs px-2 py-0.5 rounded ${online ? 'bg-green-600' : 'bg-red-600'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      </header>

      <nav className="flex overflow-x-auto text-xs border-b">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i + 1)}
            className={`flex-shrink-0 px-3 py-2 border-b-2 ${step === i + 1 ? 'border-slate-900 font-semibold' : 'border-transparent text-gray-500'}`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      <main className="p-4">
        {step === 1 && <Step1CustomerSite job={job} onChange={patchJob} />}
        {step === 2 && <Step2Nomination job={job} onChange={patchJob} />}
        {step === 3 && (
          <Step3ExistingEquipment job={job} jobId={jobId} onChange={patchJob} onPhotoCaptured={registerPhoto} />
        )}
        {step === 4 && (
          <Step4NewEquipment job={job} jobId={jobId} onChange={patchJob} onPhotoCaptured={registerPhoto} />
        )}
        {step === 5 && <Step5TradeSignoff job={job} onChange={patchJob} />}
        {step === 6 && (
          <Step6PostInstall job={job} jobId={jobId} onChange={patchJob} onPhotoCaptured={registerPhoto} />
        )}
        {step === 7 && <Step7Review job={job} jobId={jobId} onFinalize={finalize} />}
      </main>

      <footer className="flex justify-between p-4 border-t">
        <button
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="px-4 py-2 text-sm rounded border disabled:opacity-40"
        >
          Back
        </button>
        <button
          disabled={step === 7}
          onClick={() => setStep((s) => Math.min(7, s + 1))}
          className="px-4 py-2 text-sm rounded bg-slate-900 text-white disabled:opacity-40"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
