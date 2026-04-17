import { translateStatusVi } from './statusTranslations';

const SAMPLE_STATUS_MAP: Record<string, string> = {
  Created: 'Khởi tạo',
  InProgressed: 'Đang thực hiện',
  Completed: 'Hoàn thành',
  ExecutedBecauseOfDisease: 'Tiêu hủy do bệnh',
  ConvertedToSeedling: 'Chuyển thành cây giống',
};

const DISEASE_INCIDENT_STATUS_MAP: Record<string, string> = {
  AIDetected: 'AI phát hiện',
  UnderReview: 'Đang xem xét',
  Confirmed: 'Đã xác nhận',
  Dismissed: 'Đã loại bỏ',
};

const STAGE_STATUS_MAP: Record<string, string> = {
  Created: 'Khởi tạo',
  InProgressed: 'Đang thực hiện',
  Completed: 'Hoàn thành',
  Skipped: 'Bỏ qua',
};

export const translateSampleStatusVi = (status?: string | null) => {
  if (!status) return 'Không xác định';
  return SAMPLE_STATUS_MAP[status] ?? translateStatusVi(status);
};

export const translateDiseaseIncidentStatusVi = (status?: string | null) => {
  if (!status) return 'Không xác định';
  return DISEASE_INCIDENT_STATUS_MAP[status] ?? status;
};

export const translateSampleStageStatusVi = (status?: string | null) => {
  if (!status) return 'Không xác định';
  return STAGE_STATUS_MAP[status] ?? translateStatusVi(status);
};
