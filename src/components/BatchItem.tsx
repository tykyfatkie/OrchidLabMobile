/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Layers, MapPin } from 'lucide-react-native';
import { styles } from '../styles/styles';
import { translateStatusVi } from '../utils/statusTranslations';

interface Props {
  item: {
    id: number;
    batchName: string;
    labRoomName: string;
    batchSizeWidth: number;
    batchSizeHeight: number;
    widthUnit: string;
    heightUnit: string;
    status: string;
  };
}

export const BatchItem = ({ item }: Props) => {
  const isReady = item.status === 'Ready';

  return (
    <TouchableOpacity style={styles.reportCard} activeOpacity={0.85}>
      <View style={styles.reportInfo}>
        <Text style={styles.reportTitle} numberOfLines={1}>{item.batchName}</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <MapPin size={12} color="#5A7A5A" style={{ marginRight: 4 }} />
          <Text style={styles.reportDate}>Phòng: {item.labRoomName}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Layers size={12} color="#5A7A5A" style={{ marginRight: 4 }} />
          <Text style={styles.reportDate}>
            Kích thước: {item.batchSizeWidth}{item.widthUnit} x {item.batchSizeHeight}{item.heightUnit}
          </Text>
        </View>
      </View>

      <View style={[styles.statusTag, isReady ? styles.statusDone : styles.statusPending]}>
        <Text style={styles.statusText}>
          {translateStatusVi(item.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};