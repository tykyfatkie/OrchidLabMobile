import { create } from 'zustand';
import { notificationService, NotificationItem } from '../services/notification.service';

interface NotificationState {
  notifications: NotificationItem[];
  isLoading: boolean;
  pageNumber: number;
  hasMore: boolean;
  fetchNotifications: (userId: string, page: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  isLoading: false,
  pageNumber: 1,
  hasMore: true,

  fetchNotifications: async (userId, page) => {
    set({ isLoading: true });
    try {
      const data = await notificationService.getNotifications(userId, page);
      set((state) => ({
        // Nếu là trang 1 thì thay mới, nếu trang > 1 thì nối đuôi vào mảng cũ
        notifications: page === 1 ? data.data : [...state.notifications, ...data.data],
        pageNumber: page,
        hasMore: page < data.pageCount, // Kiểm tra còn trang nào không
        isLoading: false,
      }));
    } catch (error) {
      console.error('Lỗi khi tải thông báo:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => ({
        // Tìm thông báo theo ID và cập nhật isRead = true ngay trên giao diện
        notifications: state.notifications.map((notif) =>
          notif.id === id ? { ...notif, isRead: true } : notif
        ),
      }));
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã đọc:', error);
    }
  },
}));