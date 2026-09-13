import SignatureField from '../components/SignatureField';
import type { JobRecord } from '../types';

interface Props {
  job: JobRecord;
  onChange: (patch: Partial<JobRecord>) => void;
}

export default function Step5TradeSignoff({ job, onChange }: Props) {
  const elec = job.signatures.electrician;
  const arc = job.signatures.refrigerationMechanic;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">5. Trade Sign-Offs</h2>

      <div className="space-y-2 border-t pt-3">
        <h3 className="font-semibold text-sm">Electrician</h3>
        <label className="block text-sm">
          Name
          <input className="mt-1 w-full border rounded px-2 py-1" value={elec?.name ?? ''}
            onChange={(e) => onChange({
              signatures: { ...job.signatures, electrician: { dataUrl: elec?.dataUrl ?? '', timestamp: elec?.timestamp ?? '', licenceNumber: elec?.licenceNumber ?? '', name: e.target.value } }
            })} />
        </label>
        <label className="block text-sm">
          Licence Number
          <input className="mt-1 w-full border rounded px-2 py-1" value={elec?.licenceNumber ?? ''}
            onChange={(e) => onChange({
              signatures: { ...job.signatures, electrician: { dataUrl: elec?.dataUrl ?? '', timestamp: elec?.timestamp ?? '', name: elec?.name ?? '', licenceNumber: e.target.value } }
            })} />
        </label>
        <SignatureField
          label="Electrician signature"
          signedDataUrl={elec?.dataUrl || null}
          onSign={(dataUrl) => onChange({
            signatures: { ...job.signatures, electrician: { name: elec?.name ?? '', licenceNumber: elec?.licenceNumber ?? '', dataUrl, timestamp: new Date().toISOString() } }
          })}
        />
      </div>

      <div className="space-y-2 border-t pt-3">
        <h3 className="font-semibold text-sm">ARC Refrigeration Mechanic</h3>
        <label className="block text-sm">
          Name
          <input className="mt-1 w-full border rounded px-2 py-1" value={arc?.name ?? ''}
            onChange={(e) => onChange({
              signatures: { ...job.signatures, refrigerationMechanic: { dataUrl: arc?.dataUrl ?? '', timestamp: arc?.timestamp ?? '', arcLicenceNumber: arc?.arcLicenceNumber ?? '', name: e.target.value } }
            })} />
        </label>
        <label className="block text-sm">
          ARC Licence Number
          <input className="mt-1 w-full border rounded px-2 py-1" value={arc?.arcLicenceNumber ?? ''}
            onChange={(e) => onChange({
              signatures: { ...job.signatures, refrigerationMechanic: { dataUrl: arc?.dataUrl ?? '', timestamp: arc?.timestamp ?? '', name: arc?.name ?? '', arcLicenceNumber: e.target.value } }
            })} />
        </label>
        <SignatureField
          label="ARC technician signature"
          signedDataUrl={arc?.dataUrl || null}
          onSign={(dataUrl) => onChange({
            signatures: { ...job.signatures, refrigerationMechanic: { name: arc?.name ?? '', arcLicenceNumber: arc?.arcLicenceNumber ?? '', dataUrl, timestamp: new Date().toISOString() } }
          })}
        />
      </div>
    </div>
  );
}
