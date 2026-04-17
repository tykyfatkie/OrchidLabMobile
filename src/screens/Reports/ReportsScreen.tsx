/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, ImageBackground, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileBarChart2, AlertCircle, Plus } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { ReportItem } from '../../components/ReportItem';
import { QuickMenu } from '../../components/QuickMenu';

const BASE_URL = API_URL;
const PAGE_SIZE = 100;
const REPORT_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'waiting', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' },
  { key: 'draft', label: 'Bản nháp' },
] as const;

type ReportFilterKey = typeof REPORT_FILTERS[number]['key'];

const normalizeReportStatus = (status?: string) => String(status || '').trim().toLowerCase();

const matchesReportFilter = (status?: string, filterKey?: ReportFilterKey) => {
  const normalized = normalizeReportStatus(status);

  switch (filterKey) {
    case 'waiting':
      return normalized === 'waitingforapproval';
    case 'approved':
      return normalized === 'approved' || normalized === 'done';
    case 'rejected':
      return normalized === 'rejected' || normalized === 'declinedbytechnician' || normalized === 'reworkrequired';
    case 'draft':
      return normalized === 'created' || normalized === 'draft' || normalized === 'template' || normalized === 'pending';
    case 'all':
    default:
      return true;
  }
};

const TechnicianReportsScreen = () => {
  const navigation = useNavigation<any>();
  const [selectedFilter, setSelectedFilter] = useState<ReportFilterKey>('all');
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const filteredData = useMemo(
    () => data.filter((item: any) => matchesReportFilter(item.status, selectedFilter)),
    [data, selectedFilter],
  );

  const fetchReports = useCallback(async (pageNo: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/monitoring-log?pageNo=${pageNo}&pageSize=${PAGE_SIZE}`);
      const json = await res.json();

      const fetchedData = json.data ?? [];
      setData(prev => {
        const nextData = replace ? fetchedData : [...prev, ...fetchedData];
        const pending = nextData.filter((item: any) => item.status === 'WaitingForApproval').length;
        setPendingCount(pending);
        return nextData;
      });
      setTotalCount(json.totalCount ?? 0);
      setHasMore(pageNo < (json.pageCount ?? 1));
      setPage(pageNo);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false); setLoadingMore(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReports(1, true); }, []);

  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { backgroundColor: '#FFFFFF' }]}>
          <FileBarChart2 size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>{totalCount}</Text>
          <Text style={styles.metricTitle}>Tổng số{"\n"}báo cáo</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#A3F7BF' }]}>
          <AlertCircle size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>{pendingCount}</Text>
          <Text style={styles.metricTitle}>Đang chờ{"\n"}xử lý</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Bộ lọc</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {REPORT_FILTERS.map((filter) => {
          const isActive = selectedFilter === filter.key;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedFilter(filter.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>Danh sách báo cáo</Text>
    </View>
  );

  const EmptyList = () => {
    const isOriginalEmpty = data.length === 0;

    return (
      <View style={styles.center}>
        <Text style={styles.sectionTitle}>
          {isOriginalEmpty
            ? 'Danh sách báo cáo đang trống.'
            : 'Không có báo cáo phù hợp với bộ lọc này.'}
        </Text>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Báo Cáo</Text>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) => (
          <ReportItem
            item={item}
            index={index}
            onPress={() => navigation.navigate('ReportDetail', { monitoringLogId: item.id })}
          />
        )}
        ListEmptyComponent={!loadingMore ? <EmptyList /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReports(1, true)} tintColor="#1F3D2F" />}
        onEndReached={() => !loadingMore && hasMore && fetchReports(page + 1, false)}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#1F3D2F" /> : null}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <TouchableOpacity
        style={styles.floatingCreateButton}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('CreateReport')}
      >
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default TechnicianReportsScreen;