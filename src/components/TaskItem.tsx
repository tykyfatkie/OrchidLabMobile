/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, Layers, Info } from 'lucide-react-native';
import { styles } from '../styles/styles';
import { translateTaskStatusVi } from '../utils/statusTranslations';

interface Props {
  item: {
    id: string;
    name: string;
    description: string;
    stageId: number;
    status: string;
    expectedEndDate: string | null;
  };
  onPress?: () => void;
}

export const TaskItem = ({ item, onPress }: Props) => {
  const isTemplate = item.status === 'Template';
  const displayDate = item.expectedEndDate ? item.expectedEndDate.split('T')[0] : 'N/A';

  return (
    <TouchableOpacity style={styles.reportCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.reportInfo}>
        <Text style={styles.reportTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.reportDate} numberOfLines={2}>{item.description}</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Layers size={12} color="#5A7A5A" style={{ marginRight: 4 }} />
          <Text style={styles.reportDate}>Giai đoạn: {item.stageId}</Text>
          <View style={{ width: 12 }} />
          <Calendar size={12} color="#5A7A5A" style={{ marginRight: 4 }} />
          <Text style={styles.reportDate}>Hạn: {displayDate}</Text>
        </View>
      </View>

      <View style={[styles.statusTag, isTemplate ? styles.statusPending : styles.statusDone]}>
        <Text style={styles.statusText}>
          {translateTaskStatusVi(item.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};