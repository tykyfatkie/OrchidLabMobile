/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FlaskConical, Beaker } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { styles } from '../styles/styles';

interface Props {
  item: {
    id: string;
    name: string;
    batcheName: string;
    methodName: string;
    status: string;
    createdDate: string;
    currentStageOrder: number;
  };
  index: number;
  onPress?: () => void;
}

// ── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  created:               { label: 'Mới tạo',         bg: '#F3F4F6', text: '#6B7280' },
  inprogress:            { label: 'Đang thực hiện',   bg: '#DBEAFE', text: '#2563EB' },
  waitingforchangestage: { label: 'Chờ duyệt',        bg: '#FEF3C7', text: '#D97706' },
  completed:             { label: 'Hoàn thành',       bg: '#D1FAE5', text: '#059669' },
  destroyed:             { label: 'Thất bại',         bg: '#FEE2E2', text: '#DC2626' },
  cancelled:             { label: 'Đã hủy',           bg: '#F3F4F6', text: '#9CA3AF' },
};

const getStatusStyle = (status: string) =>
  STATUS_CONFIG[status?.toLowerCase()] ?? { label: status, bg: '#F3F4F6', text: '#6B7280' };

export const ExperimentLogItem = ({ item, index, onPress }: Props) => {
  const formattedDate = item.createdDate?.split('T')[0] ?? '';
  const statusStyle = getStatusStyle(item.status);

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 100, 500)).springify()}>
      <TouchableOpacity style={styles.reportCard} activeOpacity={0.85} onPress={onPress}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.reportDate}>
            <Beaker size={12} color="#5A7A5A" /> {item.batcheName} • <FlaskConical size={12} color="#5A7A5A" /> {item.methodName}
          </Text>
          <Text style={[styles.reportDate, { marginTop: 4 }]}>Ngày tạo: {formattedDate}</Text>
        </View>

        {/* ── Right column: stage + status ── */}
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={[styles.statusTag, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statusText}>GĐ: {item.currentStageOrder}</Text>
          </View>

          <View style={{
            backgroundColor: statusStyle.bg,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}>
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: statusStyle.text,
            }}>
              {statusStyle.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};