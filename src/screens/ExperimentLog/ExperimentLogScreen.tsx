/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  X,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { ExperimentLogItem } from '../../components/ExperimentLogItem';
import { QuickMenu } from '../../components/QuickMenu';
import {
  experimentLogStyles as s,
  COLORS,
  STATUS_FILTERS,
  METRIC_CARDS,
} from './ExperimentLogStyles';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 500;

// ── Types ───────────────────────────────────────────────────
interface FilterParams {
  nameSearchTerm: string;
  methodNameSearchTerm: string;
  status: string;
}

const normalizeStatus = (s?: string) => String(s ?? '').toLowerCase();

// Sort by createdDate descending so newest is always first
const sortByNewest = (items: any[]): any[] =>
  [...items].sort(
    (a, b) =>
      new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime(),
  );

const buildUrl = (base: string, pageNo: number, filters: FilterParams): string => {
  const params = new URLSearchParams();
  params.set('pageNo', String(pageNo));
  params.set('pageSize', String(PAGE_SIZE));
  if (filters.nameSearchTerm.trim()) params.set('NameSearchTerm', filters.nameSearchTerm.trim());
  if (filters.methodNameSearchTerm.trim()) params.set('MethodNameSearchTerm', filters.methodNameSearchTerm.trim());
  if (filters.status) params.set('Status', filters.status);
  return `${base}/api/experiment-logs?${params.toString()}`;
};

// ── FilterChip ──────────────────────────────────────────────
interface FilterChipProps {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
}

const FilterChip = ({ label, color, active, onPress }: FilterChipProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      active
        ? [s.chipActive, { backgroundColor: color, borderWidth: 0, shadowColor: color }]
        : s.chipInactive,
    ]}
  >
    <Text style={active ? s.chipTextActive : s.chipTextInactive}>{label}</Text>
  </TouchableOpacity>
);

// ── NewestBanner ────────────────────────────────────────────
const NewestBanner = () => (
  <View style={s.newestBanner}>
    <Clock size={12} color={COLORS.amber} />
    <Text style={s.newestBannerText}>MỚI NHẤT</Text>
  </View>
);

// ── Main Screen ─────────────────────────────────────────────
const ExperimentLogScreen = () => {
  const navigation = useNavigation<any>();

  const [data, setData] = useState<any[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [nameSearch, setNameSearch] = useState('');
  const [methodSearch, setMethodSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('');

  const [committedFilters, setCommittedFilters] = useState<FilterParams>({
    nameSearchTerm: '',
    methodNameSearchTerm: '',
    status: '',
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce text inputs
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setCommittedFilters(prev => ({
        ...prev,
        nameSearchTerm: nameSearch,
        methodNameSearchTerm: methodSearch,
      }));
    }, DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [nameSearch, methodSearch]);

  // Status applies immediately
  useEffect(() => {
    setCommittedFilters(prev => ({ ...prev, status: activeStatus }));
  }, [activeStatus]);

  // ── Fetch ───────────────────────────────────────────────
  const fetchLogs = useCallback(
    async (pageNo: number, replace: boolean, filters: FilterParams) => {
      if (replace) setLoading(true);
      try {
        const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
        const url = buildUrl(cleanUrl, pageNo, filters);
        const res = await fetch(url);
        const json = await res.json();
        const fetched: any[] = json.data ?? [];
        // Sort newest first before storing
        setData(prev => replace ? sortByNewest(fetched) : sortByNewest([...prev, ...fetched]));
        setTotalCount(json.totalCount ?? 0);
        setHasMore(pageNo < (json.pageCount ?? 1));
        setPage(pageNo);
      } catch (e) {
        console.error('Lỗi fetch log:', e);
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
      const res = await fetch(`${cleanUrl}/api/experiment-logs?pageNo=1&pageSize=200`);
      const json = await res.json();
      setAllData(json.data ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchAllForMetrics(); }, []);
  useEffect(() => { fetchLogs(1, true, committedFilters); }, [committedFilters]);

  // ── Derived ─────────────────────────────────────────────
  const metricsData = allData.length ? allData : data;

  const isFiltering =
    committedFilters.nameSearchTerm ||
    committedFilters.methodNameSearchTerm ||
    committedFilters.status;

  // ── Handlers ────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    setNameSearch('');
    setMethodSearch('');
    setActiveStatus('');
    setCommittedFilters({ nameSearchTerm: '', methodNameSearchTerm: '', status: '' });
    fetchAllForMetrics();
  };

  const handleClearAll = () => {
    setNameSearch('');
    setMethodSearch('');
    setActiveStatus('');
  };

  // ── List Header ─────────────────────────────────────────
  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>

      {/* ── Metrics ── */}
      <View style={s.metricsRow}>
        {/* Total */}
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.total.bg }]}>
          <BookOpen size={20} color={METRIC_CARDS.total.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.total.textColor }]}>
            {metricsData.length || totalCount}
          </Text>
          <Text style={s.metricLabel}>Tổng{'\n'}nhật ký</Text>
        </View>

        {/* In-progress */}
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.inProgress.bg }]}>
          <Activity size={20} color={METRIC_CARDS.inProgress.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.inProgress.textColor }]}>
            {metricsData.filter(i => normalizeStatus(i.status) === 'inprogress').length}
          </Text>
          <Text style={s.metricLabel}>Đang{'\n'}thực hiện</Text>
        </View>

        {/* Completed */}
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.completed.bg }]}>
          <CheckCircle2 size={20} color={METRIC_CARDS.completed.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.completed.textColor }]}>
            {metricsData.filter(i => normalizeStatus(i.status) === 'completed').length}
          </Text>
          <Text style={s.metricLabel}>Hoàn{'\n'}thành</Text>
        </View>

        {/* Failed / Cancelled */}
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.failed.bg }]}>
          <XCircle size={20} color={METRIC_CARDS.failed.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.failed.textColor }]}>
            {metricsData.filter(i =>
              ['destroyed', 'cancelled', 'failed'].includes(normalizeStatus(i.status)),
            ).length}
          </Text>
          <Text style={s.metricLabel}>Thất bại{'\n'}/ Hủy</Text>
        </View>
      </View>

      {/* ── Search inputs ── */}
      <View style={s.searchWrapper}>
        <View style={[s.searchBox, nameSearch ? s.searchBoxActive : s.searchBoxDefault]}>
          <Search size={15} color={nameSearch ? COLORS.primary : COLORS.placeholder} />
          <TextInput
            value={nameSearch}
            onChangeText={setNameSearch}
            placeholder="Tìm theo tên nhật ký..."
            placeholderTextColor={COLORS.placeholder}
            style={s.searchInput}
          />
          {nameSearch ? (
            <TouchableOpacity onPress={() => setNameSearch('')} activeOpacity={0.7}>
              <X size={15} color={COLORS.placeholder} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[s.searchBox, methodSearch ? s.searchBoxActive : s.searchBoxDefault]}>
          <Search size={15} color={methodSearch ? COLORS.primary : COLORS.placeholder} />
          <TextInput
            value={methodSearch}
            onChangeText={setMethodSearch}
            placeholder="Tìm theo tên phương pháp..."
            placeholderTextColor={COLORS.placeholder}
            style={s.searchInput}
          />
          {methodSearch ? (
            <TouchableOpacity onPress={() => setMethodSearch('')} activeOpacity={0.7}>
              <X size={15} color={COLORS.placeholder} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Status filter chips ── */}
      <View style={s.filterScroll}>
        <View style={s.filterHeader}>
          <Filter size={14} color={COLORS.primary} />
          <Text style={s.filterHeaderText}>Lọc theo trạng thái</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScrollContent}
        >
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

      {/* ── Result row ── */}
      <View style={s.resultRow}>
        <Text style={styles.sectionTitle}>Danh sách nhật ký</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isFiltering ? (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.8} style={s.clearBtn}>
              <X size={11} color={COLORS.red} />
              <Text style={s.clearBtnText}>Xóa lọc</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={s.resultCount}>{totalCount} kết quả</Text>
        </View>
      </View>
    </View>
  );

  // ── Render item ──────────────────────────────────────────
  // data is already sorted newest-first; index 0 is always the newest
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isNewest = index === 0;
    return (
      <>
        {isNewest && <NewestBanner />}
        <View style={isNewest ? s.newestItemWrapper : undefined}>
          <ExperimentLogItem
            item={item}
            index={index}
            onPress={() =>
              navigation.navigate('ExperimentLogDetail', { experimentLogId: item.id })
            }
          />
        </View>
      </>
    );
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
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
        <Text style={styles.headerTitle}>Nhật Ký</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={ListHeader}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.listSeparator} />}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>Không tìm thấy nhật ký nào.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={() => {
            if (hasMore && !loading) fetchLogs(page + 1, false, committedFilters);
          }}
          onEndReachedThreshold={0.3}
        />
      )}

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default ExperimentLogScreen;