import apiClient from '../api/apiClient';

export type NotificationTargetType =
  | 'Task'
  | 'ExperimentLog'
  | 'MonitoringLog'
  | 'Sample';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  notificationTargetType: NotificationTargetType;
  targetId: string;
}

export interface PaginatedResponse<T> {
  totalCount: number;
  pageCount: number;
  pageSize: number;
  pageNumber: number;
  data: T[];
}

export const notificationService = {
  // Lấy danh sách thông báo
  getNotifications: async (userId: string, pageNumber: number = 1, pageSize: number = 10) => {
    const response = await apiClient.get<PaginatedResponse<NotificationItem>>('/api/notification', {
      params: { userId, pageNumber, pageSize },
    });
    return response.data;
  },

  // Đánh dấu đã đọc
  markAsRead: async (id: string) => {
    const response = await apiClient.put(`/api/notification/${id}/mark-as-read`);
    return response.data;
  },
};