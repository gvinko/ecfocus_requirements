import GeotaggedCameraCapture from '../components/GeotaggedCameraCapture';
import type { JobRecord } from '../types';

interface Props {
  job: JobRecord;
  jobId: number;
  onChange: (patch: Partial<JobRecord>) => void;
  onPhotoCaptured: (photoId: string) => void;
}

export default function Step3ExistingEquipment({ job, jobId, onChange, onPhotoCaptured }: Props) {
  const eu = job.existingUnit;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">3. Existing Equipment</h2>

      <label className="block text-sm">
        Brand
        <input className="mt-1 w-full border rounded px-2 py-1" value={eu.brand}
          onChange={(e) => onChange({ existingUnit: { ...eu, brand: e.target.value } })} />
      </label>
      <label className="block text-sm">
        Model
        <input className="mt-1 w-full border rounded px-2 py-1" value={eu.model}
          onChange={(e) => onChange({ existingUnit: { ...eu, model: e.target.value } })} />
      </label>
      <label className="block text-sm">
        Serial
        <input className="mt-1 w-full border rounded px-2 py-1" value={eu.serial}
          onChange={(e) => onChange({ existingUnit: { ...eu, serial: e.target.value } })} />
      </label>
      <label className="block text-sm">
        Type (e.g. ducted, split, cassette)
        <input className="mt-1 w-full border rounded px-2 py-1" value={eu.type}
          onChange={(e) => onChange({ existingUnit: { ...eu, type: e.target.value } })} />
      </label>
      <label className="block text-sm">
        Refrigerant Type
        <input className="mt-1 w-full border rounded px-2 py-1" value={eu.refrigerantType}
          onChange={(e) => onChange({ existingUnit: { ...eu, refrigerantType: e.target.value } })} />
      </label>

      <GeotaggedCameraCapture
        jobId={jobId}
        simproJobId={job.simproJobId}
        category="existing_unit_insitu"
        label="Photo: existing unit in-situ (prior to removal)"
        onCaptured={onPhotoCaptured}
      />
      <GeotaggedCameraCapture
        jobId={jobId}
        simproJobId={job.simproJobId}
        category="existing_nameplate"
        label="Photo: existing compliance/nameplate (model, serial, capacity)"
        onCaptured={(id) => {
          onChange({ existingUnit: { ...eu, photoId: id } });
          onPhotoCaptured(id);
        }}
      />
    </div>
  );
}
