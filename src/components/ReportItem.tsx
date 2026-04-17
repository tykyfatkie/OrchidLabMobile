/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle2, Clock } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { styles } from '../styles/styles';
import { translateStatusVi } from '../utils/statusTranslations';

type Report = {
  id: string;
  name: string;
  createdBy: string;
  createdDate: string;
  sampleName: string;
  status: string;
  isNewest: boolean;
};

interface Props {
  item: Report;
  index: number;
  onPress?: () => void;
}

export const ReportItem = ({ item, index, onPress }: Props) => {
  const isDone = item.status === 'Approved' || item.status === 'Done';
  const displayStatus = translateStatusVi(item.status);
  const formattedDate = item.createdDate?.split('T')[0] ?? '';

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 100, 500)).springify()}>
      <TouchableOpacity style={styles.reportCard} activeOpacity={0.85} onPress={onPress}>
        {item.isNewest && <View style={styles.newDot} />}
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.reportDate}>{formattedDate} • 🌿 {item.sampleName}</Text>
        </View>

        <View style={[styles.statusTag, isDone ? styles.statusDone : styles.statusPending]}>
          {isDone ? (
            <CheckCircle2 size={14} color="#1F3D2F" style={{ marginRight: 4 }} />
          ) : (
            <Clock size={14} color="#1F3D2F" style={{ marginRight: 4 }} />
          )}
          <Text style={styles.statusText}>{displayStatus}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};