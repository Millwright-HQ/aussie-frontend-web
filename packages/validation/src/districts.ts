/** All 25 administrative districts of Sri Lanka, grouped by province. */
export const DISTRICTS = [
  { code: 'CMB', name: 'Colombo', province: 'Western' },
  { code: 'GMP', name: 'Gampaha', province: 'Western' },
  { code: 'KLT', name: 'Kalutara', province: 'Western' },
  { code: 'KDY', name: 'Kandy', province: 'Central' },
  { code: 'MTL', name: 'Matale', province: 'Central' },
  { code: 'NUW', name: 'Nuwara Eliya', province: 'Central' },
  { code: 'GLE', name: 'Galle', province: 'Southern' },
  { code: 'MTR', name: 'Matara', province: 'Southern' },
  { code: 'HMB', name: 'Hambantota', province: 'Southern' },
  { code: 'JAF', name: 'Jaffna', province: 'Northern' },
  { code: 'KLN', name: 'Kilinochchi', province: 'Northern' },
  { code: 'MNR', name: 'Mannar', province: 'Northern' },
  { code: 'VAV', name: 'Vavuniya', province: 'Northern' },
  { code: 'MLT', name: 'Mullaitivu', province: 'Northern' },
  { code: 'BTC', name: 'Batticaloa', province: 'Eastern' },
  { code: 'AMP', name: 'Ampara', province: 'Eastern' },
  { code: 'TRC', name: 'Trincomalee', province: 'Eastern' },
  { code: 'KRN', name: 'Kurunegala', province: 'North Western' },
  { code: 'PTM', name: 'Puttalam', province: 'North Western' },
  { code: 'ANP', name: 'Anuradhapura', province: 'North Central' },
  { code: 'POL', name: 'Polonnaruwa', province: 'North Central' },
  { code: 'BDL', name: 'Badulla', province: 'Uva' },
  { code: 'MON', name: 'Monaragala', province: 'Uva' },
  { code: 'RTN', name: 'Ratnapura', province: 'Sabaragamuwa' },
  { code: 'KGL', name: 'Kegalle', province: 'Sabaragamuwa' },
] as const;

export type DistrictCode = (typeof DISTRICTS)[number]['code'];

export const DISTRICT_CODES = DISTRICTS.map((d) => d.code) as unknown as readonly [
  DistrictCode,
  ...DistrictCode[],
];
