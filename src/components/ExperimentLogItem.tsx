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

export const ExperimentLogItem = ({ item, index, onPress }: Props) => {
  const isCreated = item.status === 'Created';
  const formattedDate = item.createdDate?.split('T')[0] ?? '';

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

        <View style={[styles.statusTag, isCreated ? styles.statusPending : styles.statusDone]}>
          <Text style={styles.statusText}>GĐ: {item.currentStageOrder}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};