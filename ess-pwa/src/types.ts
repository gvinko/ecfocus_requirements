export type JobStatus = 'draft' | 'pending_sync' | 'synced' | 'failed';

export type PhotoCategory =
  | 'existing_unit_insitu'
  | 'existing_nameplate'
  | 'switchboard'
  | 'new_indoor_nameplate'
  | 'new_outdoor_nameplate'
  | 'final_install_indoor'
  | 'final_install_outdoor';

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  existing_unit_insitu: 'Existing unit in-situ (prior to removal)',
  existing_nameplate: 'Existing unit compliance/nameplate (model, serial, capacity)',
  switchboard: 'Main switchboard: circuit protection & dedicated AC isolator',
  new_indoor_nameplate: 'New indoor unit rating/compliance plate',
  new_outdoor_nameplate: 'New outdoor unit rating/compliance plate',
  final_install_indoor: 'Final installation: indoor unit, fully mounted & finished',
  final_install_outdoor: 'Final installation: outdoor condenser, fully mounted & finished'
};

/** Every one of these categories must have at least one captured photo before a job can be finalized. */
export const MANDATORY_PHOTO_CATEGORIES: PhotoCategory[] = [
  'existing_unit_insitu',
  'existing_nameplate',
  'switchboard',
  'new_indoor_nameplate',
  'new_outdoor_nameplate',
  'final_install_indoor',
  'final_install_outdoor'
];

export interface SignatureRecord {
  dataUrl: string;
  timestamp: string;
}

export interface CustomerSignature extends SignatureRecord {
  signerName: string;
}

export interface ElectricianSignature extends SignatureRecord {
  name: string;
  licenceNumber: string;
}

export interface RefrigerationMechanicSignature extends SignatureRecord {
  name: string;
  arcLicenceNumber: string;
}

export interface CustomerDetails {
  name: string;
  address: string;
  phone: string;
  email: string;
  nmi: string;
}

export interface ExistingUnit {
  brand: string;
  model: string;
  serial: string;
  type: string;
  refrigerantType: string;
  photoId: string;
}

export interface NewUnit {
  brand: string;
  modelIndoor: string;
  modelOutdoor: string;
  serialIndoor: string;
  serialOutdoor: string;
  kwCapacity: number | '';
}

export interface Commissioning {
  refrigerantRecoveredKg: number | '';
  cylinderNumber: string;
  vacuumMicrons: number | '';
  holdingPressurePsi: number | '';
  isolationSwitchInstalled: boolean;
}

export interface Financials {
  quotedTotalIncTax: number | '';
  rebateDiscountIncTax: number | '';
  customerContributionPaidIncTax: number | '';
  paymentMethod: string;
}

export interface JobSignatures {
  customerNomination: CustomerSignature | null;
  customerPostInstall: CustomerSignature | null;
  electrician: ElectricianSignature | null;
  refrigerationMechanic: RefrigerationMechanicSignature | null;
}

export interface JobRecord {
  id?: number;
  simproJobId: string;
  status: JobStatus;
  syncError?: string;
  customerDetails: CustomerDetails;
  existingUnit: ExistingUnit;
  newUnit: NewUnit;
  commissioning: Commissioning;
  financials: Financials;
  signatures: JobSignatures;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PhotoRecord {
  id: string;
  jobId: number;
  category: PhotoCategory;
  blob: Blob;
  base64: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string;
}

export function emptyJob(): JobRecord {
  const now = new Date().toISOString();
  return {
    simproJobId: '',
    status: 'draft',
    customerDetails: { name: '', address: '', phone: '', email: '', nmi: '' },
    existingUnit: { brand: '', model: '', serial: '', type: '', refrigerantType: '', photoId: '' },
    newUnit: { brand: '', modelIndoor: '', modelOutdoor: '', serialIndoor: '', serialOutdoor: '', kwCapacity: '' },
    commissioning: {
      refrigerantRecoveredKg: '',
      cylinderNumber: '',
      vacuumMicrons: '',
      holdingPressurePsi: '',
      isolationSwitchInstalled: false
    },
    financials: { quotedTotalIncTax: '', rebateDiscountIncTax: '', customerContributionPaidIncTax: '', paymentMethod: '' },
    signatures: {
      customerNomination: null,
      customerPostInstall: null,
      electrician: null,
      refrigerationMechanic: null
    },
    photoIds: [],
    createdAt: now,
    updatedAt: now
  };
}
