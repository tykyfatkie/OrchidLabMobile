import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { s } from '../../styles/technicianReportsStyles';
import { translateStatusVi } from '../../utils/statusTranslations';

export type Report = {
  id: string;
  name: string;
  createdBy: string;
  createdDate: string;
  sampleName: string;
  status: string;
  isNewest: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  Created: '#4CAF50',
  Pending: '#FF9800',
  Done: '#2196F3',
  Rejected: '#F44336',
};

export const ReportCard = ({ item, onPress }: { item: Report; onPress: () => void }) => {
  const color = STATUS_COLOR[item.status] ?? '#888';
  const date = item.createdDate?.split('T')[0] ?? '';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      {item.isNewest && <View style={s.newDot} />}
      <View style={s.cardTop}>
        <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={[s.badge, { backgroundColor: color + '22' }]}>
          <Text style={[s.badgeText, { color }]}>{translateStatusVi(item.status)}</Text>
        </View>
      </View>
      <Text style={s.cardSample}>🌿 {item.sampleName}</Text>
      <View style={s.cardBottom}>
        <Text style={s.cardMeta}>By {item.createdBy}</Text>
        <Text style={s.cardMeta}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
};