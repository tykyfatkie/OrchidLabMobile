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
import { Sprout, Box, CheckCircle2, Clock, Filter, Search, X } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { BatchItem } from '../../components/BatchItem';
import { QuickMenu } from '../../components/QuickMenu';
import { batchStyles as s, COLORS, STATUS_FILTERS, METRIC_CARDS } from './BatchStyle';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 500;

const normalizeStatus = (status?: string) => String(status ?? '').toLowerCase();

const buildUrl = (base: string, pageNo: number, batchSearch: string, labSearch: string): string => {
  const params = new URLSearchParams();
  params.set('pageNo', String(pageNo));
  params.set('pageSize', String(PAGE_SIZE));
  if (batchSearch.trim()) params.set('BatchNameSearchTerm', batchSearch.trim());
  if (labSearch.trim()) params.set('LabNameSearchTerm', labSearch.trim());
  return `${base}/api/batches?${params.toString()}`;
};

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

const BatchesScreen = () => {
  const navigation = useNavigation<any>();

  const [data, setData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [batchSearch, setBatchSearch] = useState('');
  const [labSearch, setLabSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [committedBatch, setCommittedBatch] = useState('');
  const [committedLab, setCommittedLab] = useState('');
  const [committedStatus, setCommittedStatus] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setCommittedBatch(batchSearch);
      setCommittedLab(labSearch);
    }, DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [batchSearch, labSearch]);

  useEffect(() => { setCommittedStatus(activeStatus); }, [activeStatus]);

  const fetchBatches = useCallback(
    async (pageNo: number, replace: boolean, bSearch: string, lSearch: string) => {
      if (replace) setLoading(true);
      try {
        const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
        const url = buildUrl(cleanUrl, pageNo, bSearch, lSearch);
        const res = await fetch(url);
        const json = await res.json();
        const fetched: any[] = json.data ?? [];
        setData(prev => replace ? fetched : [...prev, ...fetched]);
        setTotalCount(json.totalCount ?? 0);
        setHasMore(pageNo < (json.pageCount ?? 1));
        setPage(pageNo);
      } catch (e) {
        console.error('Lỗi fetch batches:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const fetchAllForMetrics = useCallback(async () => {
    try {
      const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/batches?pageNo=1&pageSize=200`);
      const json = await res.json();
      setAllData(json.data ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchAllForMetrics(); }, []);
  useEffect(() => { fetchBatches(1, true, committedBatch, committedLab); }, [committedBatch, committedLab]);

  // Client-side filter by status (API không hỗ trợ status filter)
  const displayData = committedStatus
    ? data.filter(i => normalizeStatus(i.status) === committedStatus.toLowerCase())
    : data;

  const metricsData = allData.length ? allData : data;
  const isFiltering = committedBatch || committedLab || committedStatus;

  const readyCount  = metricsData.filter(i => normalizeStatus(i.status) === 'ready').length;
  const inUseCount  = metricsData.filter(i => normalizeStatus(i.status) === 'inuse').length;
  const fullCount   = metricsData.filter(i => normalizeStatus(i.status) === 'full').length;

  const handleRefresh = () => {
    setRefreshing(true);
    setBatchSearch(''); setLabSearch(''); setActiveStatus('');
    setCommittedBatch(''); setCommittedLab(''); setCommittedStatus('');
    fetchAllForMetrics();
  };

  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>
      {/* Metrics */}
      <View style={s.metricsRow}>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.total.bg }]}>
          <Sprout size={20} color={METRIC_CARDS.total.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.total.textColor }]}>
            {metricsData.length || totalCount}
          </Text>
          <Text style={s.metricLabel}>Tổng{'\n'}lô nuôi</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.ready.bg }]}>
          <CheckCircle2 size={20} color={METRIC_CARDS.ready.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.ready.textColor }]}>{readyCount}</Text>
          <Text style={s.metricLabel}>Sẵn{'\n'}sàng</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.inUse.bg }]}>
          <Box size={20} color={METRIC_CARDS.inUse.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.inUse.textColor }]}>{inUseCount}</Text>
          <Text style={s.metricLabel}>Đang{'\n'}dùng</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.full.bg }]}>
          <Clock size={20} color={METRIC_CARDS.full.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.full.textColor }]}>{fullCount}</Text>
          <Text style={s.metricLabel}>Đã{'\n'}đầy</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrapper}>
        <View style={[s.searchBox, batchSearch ? s.searchBoxActive : s.searchBoxDefault]}>
          <Search size={15} color={batchSearch ? COLORS.primary : COLORS.placeholder} />
          <TextInput
            value={batchSearch}
            onChangeText={setBatchSearch}
            placeholder="Tìm theo tên lô nuôi..."
            placeholderTextColor={COLORS.placeholder}
            style={s.searchInput}
          />
          {batchSearch ? (
            <TouchableOpacity onPress={() => setBatchSearch('')} activeOpacity={0.7}>
              <X size={15} color={COLORS.placeholder} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={[s.searchBox, labSearch ? s.searchBoxActive : s.searchBoxDefault, { marginTop: 8 }]}>
          <Search size={15} color={labSearch ? COLORS.primary : COLORS.placeholder} />
          <TextInput
            value={labSearch}
            onChangeText={setLabSearch}
            placeholder="Tìm theo tên phòng lab..."
            placeholderTextColor={COLORS.placeholder}
            style={s.searchInput}
          />
          {labSearch ? (
            <TouchableOpacity onPress={() => setLabSearch('')} activeOpacity={0.7}>
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
        <Text style={styles.sectionTitle}>Danh sách lô nuôi</Text>
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
          <BatchItem
            item={item}
            onPress={() => navigation.navigate('BatchDetail', { batchId: item.id })}
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
        <Text style={styles.headerTitle}>Lô Nuôi</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={ListHeader}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.listSeparator} />}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>Không tìm thấy lô nuôi nào.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={() => { if (hasMore && !loading) fetchBatches(page + 1, false, committedBatch, committedLab); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CustomTabBar />
    </SafeAreaView>
  );
};

export default BatchesScreen;