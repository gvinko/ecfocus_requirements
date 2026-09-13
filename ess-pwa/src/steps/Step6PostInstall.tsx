import GeotaggedCameraCapture from '../components/GeotaggedCameraCapture';
import SignatureField from '../components/SignatureField';
import type { JobRecord } from '../types';

interface Props {
  job: JobRecord;
  jobId: number;
  onChange: (patch: Partial<JobRecord>) => void;
  onPhotoCaptured: (photoId: string) => void;
}

const PAYMENT_METHODS = ['Cash', 'EFTPOS', 'Bank Transfer', 'Credit Card', 'None'];

export default function Step6PostInstall({ job, jobId, onChange, onPhotoCaptured }: Props) {
  const fin = job.financials;
  const sig = job.signatures.customerPostInstall;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">6. Customer Post-Installation Sign-Off</h2>

      <label className="block text-sm">
        Quoted Total (inc. tax)
        <input type="number" step="0.01" className="mt-1 w-full border rounded px-2 py-1" value={fin.quotedTotalIncTax}
          onChange={(e) => onChange({ financials: { ...fin, quotedTotalIncTax: e.target.value === '' ? '' : Number(e.target.value) } })} />
      </label>
      <label className="block text-sm">
        Rebate / Discount (inc. tax)
        <input type="number" step="0.01" className="mt-1 w-full border rounded px-2 py-1" value={fin.rebateDiscountIncTax}
          onChange={(e) => onChange({ financials: { ...fin, rebateDiscountIncTax: e.target.value === '' ? '' : Number(e.target.value) } })} />
      </label>
      <label className="block text-sm">
        Customer Co-Payment Paid (inc. tax)
        <input type="number" step="0.01" className="mt-1 w-full border rounded px-2 py-1" value={fin.customerContributionPaidIncTax}
          onChange={(e) => onChange({ financials: { ...fin, customerContributionPaidIncTax: e.target.value === '' ? '' : Number(e.target.value) } })} />
      </label>
      <label className="block text-sm">
        Payment Method
        <select className="mt-1 w-full border rounded px-2 py-1" value={fin.paymentMethod}
          onChange={(e) => onChange({ financials: { ...fin, paymentMethod: e.target.value } })}>
          <option value="">Select…</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Signer full name
        <input className="mt-1 w-full border rounded px-2 py-1" value={sig?.signerName ?? ''}
          onChange={(e) => onChange({
            signatures: { ...job.signatures, customerPostInstall: { dataUrl: sig?.dataUrl ?? '', timestamp: sig?.timestamp ?? '', signerName: e.target.value } }
          })} />
      </label>

      <SignatureField
        label="Customer signature (post-install confirmation)"
        signedDataUrl={sig?.dataUrl || null}
        onSign={(dataUrl) => onChange({
          signatures: { ...job.signatures, customerPostInstall: { signerName: sig?.signerName ?? '', dataUrl, timestamp: new Date().toISOString() } }
        })}
      />

      <GeotaggedCameraCapture
        jobId={jobId}
        simproJobId={job.simproJobId}
        category="final_install_indoor"
        label="Photo: final installation — indoor unit, mounted & finished"
        onCaptured={onPhotoCaptured}
      />
      <GeotaggedCameraCapture
        jobId={jobId}
        simproJobId={job.simproJobId}
        category="final_install_outdoor"
        label="Photo: final installation — outdoor condenser, mounted & finished"
        onCaptured={onPhotoCaptured}
      />
    </div>
  );
}
