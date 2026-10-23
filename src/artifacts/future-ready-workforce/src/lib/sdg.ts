export const SDG_LABELS: Record<string, string> = {
  '1': 'No poverty',
  '2': 'Zero hunger',
  '3': 'Good health and well-being',
  '4': 'Quality education',
  '5': 'Gender equality',
  '6': 'Clean water and sanitation',
  '7': 'Affordable and clean energy',
  '8': 'Decent work and economic growth',
  '9': 'Industry, innovation and infrastructure',
  '10': 'Reduced inequalities',
  '11': 'Sustainable cities and communities',
  '12': 'Responsible consumption and production',
  '13': 'Climate action',
  '14': 'Life below water',
  '15': 'Life on land',
  '16': 'Peace, justice and strong institutions',
  '17': 'Partnerships for the goals',
};

export const sdgNumber = (value: string) => value.match(/SDG\s*(\d+)/)?.[1] ?? '';

/** Always number + full official label, e.g. "SDG 4 · Quality education". */
export const sdgLabel = (value: string) => {
  const n = sdgNumber(value);
  return n && SDG_LABELS[n] ? `SDG ${n} · ${SDG_LABELS[n]}` : value;
};
