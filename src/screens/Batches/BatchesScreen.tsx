/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprout, Box } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';
import { QuickMenu } from '../../components/QuickMenu';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { BatchItem } from '../../components/BatchItem';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;

const BatchesScreen = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchBatches = useCallback(async (pageNo: number, replace: boolean) => {
    if (replace) setLoading(true);
    try {
      const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/batches?pageNo=${pageNo}&pageSize=${PAGE_SIZE}`);
      const json = await res.json();

      const fetchedData = json.data ?? [];
      setData(prev => replace ? fetchedData : [...prev, ...fetchedData]);
      setTotalCount(json.totalCount ?? 0);
      setHasMore(pageNo < (json.pageCount ?? 1));
    } catch (e) {
      console.error("Lỗi fetch batches:", e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBatches(1, true); }, []);

  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { backgroundColor: '#FFFFFF' }]}>
          <Sprout size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>{totalCount}</Text>
          <Text style={styles.metricTitle}>Tổng số{"\n"}lô nuôi</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#A3F7BF' }]}>
          <Box size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>
            {data.filter(i => i.status === 'Ready').length}
          </Text>
          <Text style={styles.metricTitle}>Lô nuôi{"\n"}sẵn sàng</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Danh sách lô nuôi</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* Hình nền */}
      <ImageBackground
        source={require('../../assets/images/background.jpg')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(223,231,223,0.85)', 'rgba(242,246,242,0.85)']}
          style={{ flex: 1 }}
        />
      </ImageBackground>

      <QuickMenu />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Lô Nuôi</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1F3D2F" /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <BatchItem
              item={item}
              onPress={() => navigation.navigate('BatchDetail', { batchId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBatches(1, true)} tintColor="#1F3D2F" />
          }
          onEndReached={() => hasMore && fetchBatches(page + 1, false)}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CustomTabBar />
    </SafeAreaView>
  );
};

export default BatchesScreen;