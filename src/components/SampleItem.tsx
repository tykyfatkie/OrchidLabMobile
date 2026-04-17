/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { styles } from '../styles/styles';
import { translateSampleStatusVi } from '../utils/sampleTranslations';

interface Props {
  item: {
    id: string;
    name: string;
    currentSampleStage: string;
    executionDate: string;
    status: string;
  };
  onPress?: () => void;
}

export const SampleItem = ({ item, onPress }: Props) => {
  const isCreated = item.status === 'Created';
  // Lấy ngày thực hiện (YYYY-MM-DD)
  const displayDate = item.executionDate ?? 'Chưa có';

  return (
    <TouchableOpacity style={styles.reportCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.reportInfo}>
        <Text style={styles.reportTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.reportDate}>
          Giai đoạn: {item.currentSampleStage}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Calendar size={12} color="#5A7A5A" style={{ marginRight: 4 }} />
          <Text style={styles.reportDate}>Thực hiện: {displayDate}</Text>
        </View>
      </View>

      <View style={[styles.statusTag, isCreated ? styles.statusPending : styles.statusDone]}>
        <Text style={styles.statusText}>{translateSampleStatusVi(item.status)}</Text>
      </View>
    </TouchableOpacity>
  );
};