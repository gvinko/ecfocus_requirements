import GeotaggedCameraCapture from '../components/GeotaggedCameraCapture';
import type { JobRecord } from '../types';

interface Props {
  job: JobRecord;
  jobId: number;
  onChange: (patch: Partial<JobRecord>) => void;
  onPhotoCaptured: (photoId: string) => void;
}

export default function Step4NewEquipment({ job, jobId, onChange, onPhotoCaptured }: Props) {
  const nu = job.newUnit;
  const cm = job.commissioning;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">4. New Equipment</h2>
        <label className="block text-sm">
          Brand
          <input className="mt-1 w-full border rounded px-2 py-1" value={nu.brand}
            onChange={(e) => onChange({ newUnit: { ...nu, brand: e.target.value } })} />
        </label>
        <label className="block text-sm">
          Model (Indoor)
          <input className="mt-1 w-full border rounded px-2 py-1" value={nu.modelIndoor}
            onChange={(e) => onChange({ newUnit: { ...nu, modelIndoor: e.target.value } })} />
        </label>
        <label className="block text-sm">
          Model (Outdoor)
          <input className="mt-1 w-full border rounded px-2 py-1" value={nu.modelOutdoor}
            onChange={(e) => onChange({ newUnit: { ...nu, modelOutdoor: e.target.value } })} />
        </label>
        <label className="block text-sm">
          Serial (Indoor)
          <input className="mt-1 w-full border rounded px-2 py-1" value={nu.serialIndoor}
            onChange={(e) => onChange({ newUnit: { ...nu, serialIndoor: e.target.value } })} />
        </label>
        <label className="block text-sm">
          Serial (Outdoor)
          <input className="mt-1 w-full border rounded px-2 py-1" value={nu.serialOutdoor}
            onChange={(e) => onChange({ newUnit: { ...nu, serialOutdoor: e.target.value } })} />
        </label>
        <label className="block text-sm">
          Capacity (kW)
          <input type="number" step="0.1" className="mt-1 w-full border rounded px-2 py-1" value={nu.kwCapacity}
            onChange={(e) => onChange({ newUnit: { ...nu, kwCapacity: e.target.value === '' ? '' : Number(e.target.value) } })} />
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Commissioning</h3>
        <label className="block text-sm">
          Refrigerant Recovered (kg)
          <input type="number" step="0.01" className="mt-1 w-full border rounded px-2 py-1" value={cm.refrigerantRecoveredKg}
            onChange={(e) => onChange({ commissioning: { ...cm, refrigerantRecoveredKg: e.target.value === '' ? '' : Number(e.target.value) } })} />
        </label>
        <label className="block text-sm">
          Recovery Cylinder Number
          <input className="mt-1 w-full border rounded px-2 py-1" value={cm.cylinderNumber}
            onChange={(e) => onChange({ commissioning: { ...cm, cylinderNumber: e.target.value } })} />
        </label>
        <label className="block text-sm">
          Vacuum (microns)
          <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={cm.vacuumMicrons}
            onChange={(e) => onChange({ commissioning: { ...cm, vacuumMicrons: e.target.value === '' ? '' : Number(e.target.value) } })} />
        </label>
        <label className="block text-sm">
          Holding Pressure (psi)
          <input type="number" step="0.1" className="mt-1 w-full border rounded px-2 py-1" value={cm.holdingPressurePsi}
            onChange={(e) => onChange({ commissioning: { ...cm, holdingPressurePsi: e.target.value === '' ? '' : Number(e.target.value) } })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cm.isolationSwitchInstalled}
            onChange={(e) => onChange({ commissioning: { ...cm, isolationSwitchInstalled: e.target.checked } })} />
          Isolation switch installed
        </label>
      </div>

      <div className="space-y-3">
        <GeotaggedCameraCapture jobId={jobId} simproJobId={job.simproJobId} category="new_indoor_nameplate"
          label="Photo: new indoor nameplate" onCaptured={onPhotoCaptured} />
        <GeotaggedCameraCapture jobId={jobId} simproJobId={job.simproJobId} category="new_outdoor_nameplate"
          label="Photo: new outdoor nameplate" onCaptured={onPhotoCaptured} />
        <GeotaggedCameraCapture jobId={jobId} simproJobId={job.simproJobId} category="switchboard"
          label="Photo: switchboard — circuit protection & dedicated AC isolator" onCaptured={onPhotoCaptured} />
      </div>
    </div>
  );
}
