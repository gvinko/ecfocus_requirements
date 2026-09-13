import type { JobRecord } from '../types';

interface Props {
  job: JobRecord;
  onChange: (patch: Partial<JobRecord>) => void;
}

export default function Step1CustomerSite({ job, onChange }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">1. Customer &amp; Site Details</h2>

      <label className="block text-sm">
        Simpro Job ID
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={job.simproJobId}
          onChange={(e) => onChange({ simproJobId: e.target.value })}
        />
      </label>

      <label className="block text-sm">
        Customer Name
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={job.customerDetails.name}
          onChange={(e) => onChange({ customerDetails: { ...job.customerDetails, name: e.target.value } })}
        />
      </label>

      <label className="block text-sm">
        Site Address
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={job.customerDetails.address}
          onChange={(e) => onChange({ customerDetails: { ...job.customerDetails, address: e.target.value } })}
        />
      </label>

      <label className="block text-sm">
        Phone
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={job.customerDetails.phone}
          onChange={(e) => onChange({ customerDetails: { ...job.customerDetails, phone: e.target.value } })}
        />
      </label>

      <label className="block text-sm">
        Email
        <input
          type="email"
          className="mt-1 w-full border rounded px-2 py-1"
          value={job.customerDetails.email}
          onChange={(e) => onChange({ customerDetails: { ...job.customerDetails, email: e.target.value } })}
        />
      </label>

      <label className="block text-sm">
        NMI
        <input
          className="mt-1 w-full border rounded px-2 py-1"
          value={job.customerDetails.nmi}
          onChange={(e) => onChange({ customerDetails: { ...job.customerDetails, nmi: e.target.value } })}
        />
      </label>
    </div>
  );
}
