/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, RefreshControl,
  ImageBackground, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TestTube, PackageCheck, XCircle, Clock, Filter, Search, X } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { SampleItem } from '../../components/SampleItem';
import { QuickMenu } from '../../components/QuickMenu';
import { sampleStyles as s, COLORS, STATUS_FILTERS, METRIC_CARDS } from './SampleStyle';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 500;

const normalizeStatus = (status?: string) => String(status ?? '').toLowerCase();

const sortByNewest = (items: any[]): any[] =>
  [...items].sort(
    (a, b) => new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime(),
  );

const FilterChip = ({ label, color, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={active ? [s.chipActive, { backgroundColor: color }] : s.chipInactive}
  >
    <Text style={active ? s.chipTextActive : s.chipTextInactive}>{label}</Text>
  </TouchableOpacity>
);

const NewestBanner = () => (
  <View style={s.newestBanner}>
    <Clock size={12} color={COLORS.amber} />
    <Text style={s.newestBannerText}>MỚI NHẤT</Text>
  </View>
);

const SamplesScreen = () => {
  const navigation = useNavigation<any>();

  const [data, setData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [nameSearch, setNameSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [committedStatus, setCommittedStatus] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setCommittedSearch(nameSearch), DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [nameSearch]);

  useEffect(() => { setCommittedStatus(activeStatus); }, [activeStatus]);

  const buildUrl = (base: string, pageNo: number) => {
    const params = new URLSearchParams();
    params.set('pageNo', String(pageNo));
    params.set('pageSize', String(PAGE_SIZE));
    return `${base}/api/samples?${params.toString()}`;
  };

  const fetchSamples = useCallback(
    async (pageNo: number, replace: boolean) => {
      if (replace) setLoading(true);
      try {
        const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
        const url = buildUrl(cleanUrl, pageNo);
        const res = await fetch(url);
        const json = await res.json();
        const fetched: any[] = json.data ?? [];
        setData(prev => replace ? sortByNewest(fetched) : sortByNewest([...prev, ...fetched]));
        setTotalCount(json.totalCount ?? 0);
        setHasMore(pageNo < (json.pageCount ?? 1));
        setPage(pageNo);
      } catch (e) {
        console.error('Lỗi fetch samples:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [committedSearch],
  );

  const fetchAllForMetrics = useCallback(async () => {
    try {
      const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/samples?pageNo=1&pageSize=200`);
      const json = await res.json();
      setAllData(json.data ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchAllForMetrics(); }, []);
  useEffect(() => { fetchSamples(1, true); }, [committedSearch]);

  // Client-side filter by status
  const displayData = committedStatus
    ? data.filter(i => normalizeStatus(i.status) === committedStatus.toLowerCase())
    : data;

  const metricsData = allData.length ? allData : data;
  const isFiltering = committedSearch || committedStatus;

  const inProgressCount = metricsData.filter(i => normalizeStatus(i.status) === 'inprogressed').length;
  const convertedCount  = metricsData.filter(i => normalizeStatus(i.status) === 'convertedtoseedling').length;
  const cancelledCount  = metricsData.filter(i =>
    ['executedbecauseofdisease', 'cancelled'].includes(normalizeStatus(i.status)),
  ).length;

  const handleRefresh = () => {
    setRefreshing(true);
    setNameSearch(''); setActiveStatus('');
    setCommittedSearch(''); setCommittedStatus('');
    fetchAllForMetrics();
  };

  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>
      {/* Metrics */}
      <View style={s.metricsRow}>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.total.bg }]}>
          <TestTube size={20} color={METRIC_CARDS.total.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.total.textColor }]}>
            {metricsData.length || totalCount}
          </Text>
          <Text style={s.metricLabel}>Tổng{'\n'}mẫu vật</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.inProgress.bg }]}>
          <Clock size={20} color={METRIC_CARDS.inProgress.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.inProgress.textColor }]}>{inProgressCount}</Text>
          <Text style={s.metricLabel}>Đang{'\n'}tiến hành</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.converted.bg }]}>
          <PackageCheck size={20} color={METRIC_CARDS.converted.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.converted.textColor }]}>{convertedCount}</Text>
          <Text style={s.metricLabel}>Đã chuyển{'\n'}cây</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.cancelled.bg }]}>
          <XCircle size={20} color={METRIC_CARDS.cancelled.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.cancelled.textColor }]}>{cancelledCount}</Text>
          <Text style={s.metricLabel}>Hủy{'\n'}/ Bệnh</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrapper}>
        <View style={[s.searchBox, nameSearch ? s.searchBoxActive : s.searchBoxDefault]}>
          <Search size={15} color={nameSearch ? COLORS.primary : COLORS.placeholder} />
          <TextInput
            value={nameSearch}
            onChangeText={setNameSearch}
            placeholder="Tìm theo tên mẫu vật..."
            placeholderTextColor={COLORS.placeholder}
            style={s.searchInput}
          />
          {nameSearch ? (
            <TouchableOpacity onPress={() => setNameSearch('')} activeOpacity={0.7}>
              <X size={15} color={COLORS.placeholder} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter chips */}
      <View style={s.filterScroll}>
        <View style={s.filterHeader}>
          <Filter size={14} color={COLORS.primary} />
          <Text style={s.filterHeaderText}>Lọc theo trạng thái</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScrollContent}>
          {STATUS_FILTERS.map(f => (
            <FilterChip
              key={f.key}
              label={f.label}
              color={f.color}
              active={activeStatus === f.key}
              onPress={() => setActiveStatus(f.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Result row */}
      <View style={s.resultRow}>
        <Text style={styles.sectionTitle}>Danh sách mẫu vật</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isFiltering ? (
            <TouchableOpacity onPress={handleRefresh} activeOpacity={0.8} style={s.clearBtn}>
              <X size={11} color={COLORS.red} />
              <Text style={s.clearBtnText}>Xóa lọc</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={s.resultCount}>{displayData.length} kết quả</Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isNewest = index === 0;
    return (
      <>
        {isNewest && <NewestBanner />}
        <View style={isNewest ? s.newestItemWrapper : undefined}>
          <SampleItem
            item={item}
            onPress={() => navigation.navigate('SampleDetail', { sampleId: item.id })}
          />
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ImageBackground
        source={require('../../assets/images/background.jpg')}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      >
        <LinearGradient colors={['rgba(223,231,223,0.85)', 'rgba(242,246,242,0.85)']} style={{ flex: 1 }} />
      </ImageBackground>

      <QuickMenu />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Mẫu Vật</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={ListHeader}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.listSeparator} />}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>Không tìm thấy mẫu vật nào.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={() => { if (hasMore && !loading) fetchSamples(page + 1, false); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CustomTabBar />
    </SafeAreaView>
  );
};

export default SamplesScreen;