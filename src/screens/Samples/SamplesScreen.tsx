/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TestTube, PackageCheck } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { SampleItem } from '../../components/SampleItem';
import { QuickMenu } from '../../components/QuickMenu';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;

const SamplesScreen = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchSamples = useCallback(async (pageNo: number, replace: boolean) => {
    if (replace) setLoading(true);
    try {
      const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/samples?pageNo=${pageNo}&pageSize=${PAGE_SIZE}`);
      const json = await res.json();

      const fetchedData = json.data ?? [];
      setData(prev => replace ? fetchedData : [...prev, ...fetchedData]);
      setTotalCount(json.totalCount ?? 0);
      setHasMore(pageNo < (json.pageCount ?? 1));
      setPage(pageNo);
    } catch (e) {
      console.error("Lỗi fetch samples:", e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSamples(1, true); }, []);

  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { backgroundColor: '#FFFFFF' }]}>
          <TestTube size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>{totalCount}</Text>
          <Text style={styles.metricTitle}>Tổng số{"\n"}mẫu vật</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#A3F7BF' }]}>
          <PackageCheck size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>{data.filter(i => i.status === 'Created').length}</Text>
          <Text style={styles.metricTitle}>Mẫu vật{"\n"}mới tạo</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Danh sách mẫu vật</Text>
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
        <Text style={styles.headerTitle}>Mẫu Vật</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1F3D2F" /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <SampleItem item={item} onPress={() => navigation.navigate('SampleDetail', { sampleId: item.id })} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSamples(1, true)} tintColor="#1F3D2F" />}
          onEndReached={() => hasMore && !loading && fetchSamples(page + 1, false)}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CustomTabBar />
    </SafeAreaView>
  );
};

export default SamplesScreen;