const STATUS_VI_MAP: Record<string, string> = {
  Assigned: 'Được giao',
  InProgress: 'Đang thực hiện',
  WaitingForApproval: 'Chờ duyệt',
  CompletedInTime: 'Hoàn thành đúng hạn',
  CompletedOutTime: 'Hoàn thành trễ hạn',
  Deleted: 'Đã xóa',
  DeclinedByTechnician: 'Kỹ thuật viên từ chối',
  ReworkRequired: 'Cần làm lại',
  Template: 'Bản mẫu',

  Pending: 'Đang chờ',
  Complete: 'Hoàn thành',
  Failed: 'Thất bại',

  Approved: 'Đã duyệt',
  Done: 'Đã duyệt',
  Rejected: 'Từ chối',
  Ready: 'Sẵn sàng',
  Created: 'Đã tạo',
};

export const translateStatusVi = (status?: string | null) => {
  if (!status) return 'Không xác định';
  return STATUS_VI_MAP[status] ?? status;
};

export const translateTaskStatusVi = (status?: string | null) => translateStatusVi(status);

export const translateChecklistStatusVi = (status?: string | null) => translateStatusVi(status);
