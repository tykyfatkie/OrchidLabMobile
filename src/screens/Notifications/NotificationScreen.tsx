/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  SectionListData,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Svg, { Path, Polyline, Rect, Circle, Line } from 'react-native-svg';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { styles } from './NotificationStyles';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuth } from '../../context/AuthContext';

// ─── Navigation Types ─────────────────────────────────────────────────────────

type RootStackParamList = {
  TaskDetail:          { taskId: string };
  ExperimentLogDetail: { experimentLogId: string };
  ReportDetail:        { monitoringLogId: string };
  SampleDetail:        { sampleId: string };
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type NotificationTargetType =
  | 'Task'
  | 'ExperimentLog'
  | 'MonitoringLog'
  | 'Sample';

type Notification = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  notificationTargetType: NotificationTargetType;
  targetId: string;
};

type Section = {
  title: string;
  data: Notification[];
};

type FilterKey = 'all' | 'task' | 'experiment' | 'report';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',        label: 'Tất cả'    },
  { key: 'task',       label: 'Task'       },
  { key: 'experiment', label: 'Thí nghiệm' },
  { key: 'report',     label: 'Báo cáo'   },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────

type SvgIconProps = { size?: number; color?: string; strokeWidth?: number };

const IconChevronBack = ({ size = 24, color = '#111827', strokeWidth = 2 }: SvgIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconDocumentText = ({ size = 22, color = '#7C3AED', strokeWidth = 1.8 }: SvgIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="14 2 14 8 20 8"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Polyline points="10 9 9 9 8 9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </Svg>
);

const IconFlask = ({ size = 22, color = '#0EA5E9', strokeWidth = 1.8 }: SvgIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 3h6M9 3v8L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L15 11V3"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M6.5 15.5h11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    <Circle cx="9.5" cy="18" r="1" fill={color} />
    <Circle cx="13" cy="17" r="0.8" fill={color} />
  </Svg>
);

const IconCheckbox = ({ size = 22, color = '#16A34A', strokeWidth = 1.8 }: SvgIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={strokeWidth} />
    <Path
      d="M8 12l3 3 5-5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const IconBell = ({ size = 22, color = '#F59E0B', strokeWidth = 1.8 }: SvgIconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

type IconConfig = {
  component: React.ComponentType<SvgIconProps>;
  color: string;
  bg: string;
};

const getIconConfig = (targetType: NotificationTargetType): IconConfig => {
  switch (targetType) {
    case 'MonitoringLog':
      return { component: IconDocumentText, color: '#7C3AED', bg: '#EDE9FE' };
    case 'ExperimentLog':
      return { component: IconFlask,        color: '#0EA5E9', bg: '#E0F2FE' };
    case 'Task':
      return { component: IconCheckbox,     color: '#16A34A', bg: '#DCFCE7' };
    case 'Sample':
      return { component: IconBell,         color: '#F59E0B', bg: '#FEF3C7' };
  }
};

const formatTime = (createdAt: string): string => {
  const date     = new Date(createdAt);
  const now      = new Date();
  const diffMin  = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin  < 1)  return 'Vừa xong';
  if (diffMin  < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const matchesFilter = (n: Notification, filter: FilterKey): boolean => {
  if (filter === 'all') return true;
  switch (filter) {
    case 'task':       return n.notificationTargetType === 'Task';
    case 'experiment': return n.notificationTargetType === 'ExperimentLog';
    case 'report':     return n.notificationTargetType === 'MonitoringLog';
    default:           return true;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

const NotificationItem = ({
  item,
  onPress,
  isLast,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
  isLast: boolean;
}) => {
  const icon = getIconConfig(item.notificationTargetType);
  const IconComponent = icon.component;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => onPress(item)}
        style={[styles.itemRow, !item.isRead && styles.itemRowUnread]}
      >
        {/* Unread dot */}
        <View style={styles.dotWrapper}>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        {/* Icon */}
        <View style={[
          styles.iconWrapper,
          { backgroundColor: item.isRead ? '#F3F4F6' : icon.bg },
        ]}>
          <IconComponent
            size={22}
            color={item.isRead ? '#9CA3AF' : icon.color}
          />
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <View style={styles.itemTopRow}>
            <Text
              style={[styles.itemTitle, item.isRead && styles.itemTitleRead]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.itemDate, !item.isRead && styles.itemDateUnread]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <Text
            style={[styles.itemBody, item.isRead && styles.itemBodyRead]}
            numberOfLines={2}
          >
            {item.content}
          </Text>
        </View>
      </TouchableOpacity>

      {!isLast && <View style={styles.divider} />}
    </>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const NotificationScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { notifications, isLoading, hasMore, pageNumber, fetchNotifications, markAsRead } =
    useNotificationStore();

  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id, 1);
  }, [user?.id]);

  const loadMore = () => {
    if (!isLoading && hasMore && user?.id) {
      fetchNotifications(user.id, pageNumber + 1);
    }
  };

  // ── Type-safe navigation — route names khớp với AuthNavigator ──
  const handlePress = (item: Notification) => {
    if (!item.isRead) markAsRead(item.id);

    switch (item.notificationTargetType) {
      case 'Task':
        navigation.navigate('TaskDetail', { taskId: item.targetId });
        break;
      case 'ExperimentLog':
        navigation.navigate('ExperimentLogDetail', { experimentLogId: item.targetId });
        break;
      case 'MonitoringLog':
        navigation.navigate('ReportDetail', { monitoringLogId: item.targetId });
        break;
      case 'Sample':
        navigation.navigate('SampleDetail', { sampleId: item.targetId });
        break;
    }
  };

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n, activeFilter)),
    [notifications, activeFilter],
  );

  const sections: Section[] = useMemo(() => {
    const now = new Date();
    const recent:  Notification[] = [];
    const earlier: Notification[] = [];

    filtered.forEach((n) => {
      const diffHours = (now.getTime() - new Date(n.createdAt).getTime()) / 3600000;
      if (diffHours < 24) recent.push(n);
      else earlier.push(n);
    });

    const result: Section[] = [];
    if (recent.length  > 0) result.push({ title: 'Hôm nay',  data: recent  });
    if (earlier.length > 0) result.push({ title: 'Trước đó', data: earlier });
    return result;
  }, [filtered]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <IconChevronBack size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Placeholder giữ title căn giữa */}
        <View style={styles.backButton} />
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === f.key && styles.filterTabTextActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── List ── */}
      <SectionList<Notification, Section>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index, section }) => (
          <NotificationItem
            item={item}
            onPress={handlePress}
            isLast={index === section.data.length - 1}
          />
        )}
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