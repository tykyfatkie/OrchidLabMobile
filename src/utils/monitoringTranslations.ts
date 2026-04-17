const MONITORING_METRIC_VI_MAP: Record<string, string> = {
  anthracnose: 'Bệnh thán thư',
  bacterialWilt: 'Héo rũ vi khuẩn',
  blackrot: 'Thối đen',
  brownspots: 'Đốm nâu',
  moldBacterial: 'Mốc khuẩn',
  moldFungus: 'Mốc nấm',
  softRot: 'Thối mềm',
  stemRot: 'Thối thân',
  witheredYellowRoot: 'Rễ vàng héo',
  oxidation: 'Oxy hóa',
  virus: 'Virus',
  healthy: 'Khỏe mạnh',
};

const MONITORING_TERM_VI_MAP: Record<string, string> = {
  temperature: 'Nhiệt độ',
  humidity: 'Độ ẩm',
  ph: 'Độ pH',
  conductivity: 'Độ dẫn điện',
  lightIntensity: 'Cường độ ánh sáng',
  co2: 'Nồng độ CO2',
  dissolvedOxygen: 'Oxy hòa tan',
  anthracnose: 'Bệnh thán thư',
  bacterialWilt: 'Héo rũ vi khuẩn',
  blackrot: 'Thối đen',
  brownspots: 'Đốm nâu',
  moldBacterial: 'Mốc khuẩn',
  moldFungus: 'Mốc nấm',
  softRot: 'Thối mềm',
  stemRot: 'Thối thân',
  witheredYellowRoot: 'Rễ vàng héo',
  oxidation: 'Oxy hóa',
  healthy: 'Khỏe mạnh',
};

export const translateMonitoringMetricVi = (key?: string | null) => {
  if (!key) return 'Không xác định';
  return MONITORING_METRIC_VI_MAP[key] ?? key;
};

export const translateMonitoringTermVi = (term?: string | null) => {
  if (!term) return 'Không xác định';
  return MONITORING_TERM_VI_MAP[term] ?? term;
};

export const translateMatchResultVi = (isMatch?: boolean | null) => {
  return isMatch ? 'Đạt' : 'Không đạt';
};
