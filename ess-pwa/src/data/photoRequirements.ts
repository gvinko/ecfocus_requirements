export interface PhotoRequirement {
  id: string;
  title: string;
  description: string;
  multiple: boolean;
  requiresGeo: boolean;
  category: 'existing' | 'refrigerant' | 'new' | 'decommission' | 'electrical';
}

export interface JobPhotoConfig {
  jobType: 'new' | 'replacement';
  needsReclaim: boolean;
}

export function getPhotoRequirements(config: JobPhotoConfig): PhotoRequirement[] {
  const list: PhotoRequirement[] = [];

  if (config.jobType === 'replacement') {
    list.push(
      {
        id: 'existing_indoor_insitu',
        title: 'Wide photo: EACH EXISTING INDOOR equipment IN SITU',
        description: 'Wide geo-tagged photo showing each existing indoor unit in its original position before removal.',
        multiple: true,
        requiresGeo: true,
        category: 'existing'
      },
      {
        id: 'existing_outdoor_insitu',
        title: 'Wide photo: EACH EXISTING OUTDOOR equipment IN SITU',
        description: 'Wide geo-tagged photo showing each existing outdoor unit in its original position before removal.',
        multiple: true,
        requiresGeo: true,
        category: 'existing'
      }
    );

    if (config.needsReclaim) {
      list.push({
        id: 'refrigerant_reclaim',
        title: 'Refrigerant Reclaim Evidence',
        description: 'Geo-tagged photo of refrigerant being reclaimed from the old unit, clearly showing recovery unit, refrigerant cylinder, and the unit being de-gassed.',
        multiple: false,
        requiresGeo: true,
        category: 'refrigerant'
      });
    }
  }

  list.push(
    {
      id: 'new_indoor_insitu',
      title: 'EACH NEW INDOOR unit IN SITU',
      description: 'Geo-tagged photo of each new indoor unit mounted in place after installation.',
      multiple: true,
      requiresGeo: true,
      category: 'new'
    },
    {
      id: 'new_indoor_nameplate',
      title: 'EACH NEW INDOOR unit compliance plate',
      description: 'Clear photo showing brand, model, serial number, and heating capacity (kW).',
      multiple: true,
      requiresGeo: true,
      category: 'new'
    },
    {
      id: 'new_outdoor_insitu',
      title: 'EACH NEW OUTDOOR unit IN SITU',
      description: 'Wide photo showing isolator switch, base mount/brackets, and secure installation.',
      multiple: true,
      requiresGeo: true,
      category: 'new'
    },
    {
      id: 'new_outdoor_nameplate',
      title: 'EACH NEW OUTDOOR unit compliance plate',
      description: 'Clear photo showing brand, model, serial number, and heating capacity (kW).',
      multiple: true,
      requiresGeo: true,
      category: 'new'
    }
  );

  if (config.jobType === 'replacement') {
    list.push({
      id: 'decommissioned_trailer_van',
      title: 'REMOVED and DECOMMISSIONED unit(s)',
      description: 'Wide geo-tagged photo showing the removed indoor and outdoor units loaded in the van or trailer.',
      multiple: true,
      requiresGeo: true,
      category: 'decommission'
    });
  }

  list.push({
    id: 'nmi_meter_or_bill',
    title: 'Electricity NMI meter or electricity bill',
    description: 'Geo-tagged photo of electricity NMI meter or recent electricity bill clearly showing the NMI number.',
    multiple: false,
    requiresGeo: true,
    category: 'electrical'
  });

  return list;
}