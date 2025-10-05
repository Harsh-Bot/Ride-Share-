export type CampusLocation = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

const CAMPUS_LOOKUP: Record<string, CampusLocation> = {
  burnaby: {
    id: 'burnaby',
    label: 'SFU Burnaby',
    latitude: 49.2781,
    longitude: -122.9199
  },
  surrey: {
    id: 'surrey',
    label: 'SFU Surrey',
    latitude: 49.1896,
    longitude: -122.8489
  }
};

export const resolveCampus = async (query: string): Promise<CampusLocation> => {
  const normalized = query.trim().toLowerCase();
  const campus = CAMPUS_LOOKUP[normalized];
  if (!campus) {
    throw new Error('TODO: integrate Google Maps API for campus resolution');
  }
  return campus;
};
