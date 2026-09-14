export interface PreloadedJob {
  simproJobId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  jobType: 'replacement' | 'new';
  needsReclaim: boolean;
  activityCode: string;
  installedUnit: {
    brand: string;
    model: string;
    heatingKw: string;
  };
}

export const SAMPLE_JOBS: PreloadedJob[] = [
  {
    simproJobId: 'SIM-10482',
    customerName: 'Andrew Gowens',
    email: 'andrew@gowansprint.com',
    phone: '0416069338',
    address: '65a Beaconsfield Road, Moss Vale, NSW 2577',
    jobType: 'replacement',
    needsReclaim: true,
    activityCode: 'HEER-HVAC 1-D16',
    installedUnit: {
      brand: 'Fujitsu',
      model: 'AOTH72KRTA / ARTH72KHTA',
      heatingKw: '7.2'
    }
  }
];