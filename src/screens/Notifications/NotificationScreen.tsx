/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  SectionListData,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles } from './NotificationStyles';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuth } from '../../context/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Notification = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

type Section = {
  title: string;
  data: Notification[];
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

const NotificationItem = ({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (id: string, isRead: boolean) => void;
}) => {
  const formattedDate = useMemo(() => {
    const date = new Date(item.createdAt);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    const diffHour = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Hôm qua, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }, [item.createdAt]);

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={() => onPress(item.id, item.isRead)}
      style={styles.itemRow}
    >
      <View style={[styles.unreadBar, item.isRead && styles.unreadBarHidden]} />
      <View style={[styles.itemContent, item.isRead && styles.itemContentRead]}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemBody} numberOfLines={2}>{item.content}</Text>
        <Text style={styles.itemDate}>{formattedDate}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const NotificationScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { notifications, isLoading, hasMore, pageNumber, fetchNotifications, markAsRead } =
    useNotificationStore();

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id, 1);
  }, [user?.id]);

  const loadMore = () => {
    if (!isLoading && hasMore && user?.id) {
      fetchNotifications(user.id, pageNumber + 1);
    }
  };

  const handlePress = (id: string, isRead: boolean) => {
    if (!isRead) markAsRead(id);
    // TODO: Navigate đến màn hình chi tiết
  };

  const sections: Section[] = useMemo(() => {
    const now = new Date();
    const recent: Notification[] = [];
    const earlier: Notification[] = [];

    notifications.forEach((n) => {
      const diffHours = (now.getTime() - new Date(n.createdAt).getTime()) / 3600000;
      if (diffHours < 24) recent.push(n);
      else earlier.push(n);
    });

    const result: Section[] = [];
    if (recent.length > 0) result.push({ title: 'Gần đây', data: recent });
    if (earlier.length > 0) result.push({ title: 'Trước đó', data: earlier });
    return result;
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Reports' as never)}
          activeOpacity={0.6}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Reports</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadBadge}>{unreadCount} chưa đọc</Text>
          )}
        </View>
      </View>

      <SectionList<Notification, Section>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onPress={handlePress} />
        )}
        // Fix lỗi ts(7006): khai báo rõ type cho `section`
        renderSectionHeader={({ section }: { section: SectionListData<Notification, Section> }) => (
          <SectionHeader title={section.title} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={
          isLoading
            ? <ActivityIndicator size="small" color="#22C55E" style={styles.loader} />
            : null
        }
        ListEmptyComponent={
          !isLoading
            ? <Text style={styles.emptyText}>Bạn chưa có thông báo nào.</Text>
            : null
        }
      />
    </View>
  );
};

export default NotificationScreen;