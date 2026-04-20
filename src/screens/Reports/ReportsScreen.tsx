/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FileBarChart2,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  X,
  Plus,
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { ReportItem } from '../../components/ReportItem';
import { QuickMenu } from '../../components/QuickMenu';
import {
  reportStyles as s,
  COLORS,
  STATUS_FILTERS,
  METRIC_CARDS,
} from './ReportStyles';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 500;

const normalizeStatus = (status?: string) => String(status ?? '').toLowerCase();

const sortByNewest = (items: any[]): any[] =>
  [...items].sort(
    (a, b) =>
      new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime(),
  );

const buildUrl = (base: string, pageNo: number, nameSearch: string, status: string): string => {
  const params = new URLSearchParams();
  params.set('pageNo', String(pageNo));
  params.set('pageSize', String(PAGE_SIZE));
  if (nameSearch.trim()) params.set('nameSearchTerm', nameSearch.trim());
  if (status) params.set('Status', status);
  return `${base}/api/monitoring-log?${params.toString()}`;
};

// ── FilterChip ───────────────────────────────────────────────
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
    style={active ? [s.chipActive, { backgroundColor: color }] : s.chipInactive}
  >
    <Text style={active ? s.chipTextActive : s.chipTextInactive}>{label}</Text>
  </TouchableOpacity>
);

// ── NewestBanner ─────────────────────────────────────────────
const NewestBanner = () => (
  <View style={s.newestBanner}>
    <Clock size={12} color={COLORS.amber} />
    <Text style={s.newestBannerText}>MỚI NHẤT</Text>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────
const ReportsScreen = () => {
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
  const [committedName, setCommittedName] = useState('');
  const [committedStatus, setCommittedStatus] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce name search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setCommittedName(nameSearch);
    }, DEBOUNCE_MS);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [nameSearch]);

  // Status applies immediately
  useEffect(() => {
    setCommittedStatus(activeStatus);
  }, [activeStatus]);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchReports = useCallback(
    async (pageNo: number, replace: boolean, name: string, status: string) => {
      if (replace) setLoading(true);
      try {
        const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
        const url = buildUrl(cleanUrl, pageNo, name, status);
        const res = await fetch(url);
        const json = await res.json();
        const fetched: any[] = json.data ?? [];
        setData(prev => replace ? sortByNewest(fetched) : sortByNewest([...prev, ...fetched]));
        setTotalCount(json.totalCount ?? 0);
        setHasMore(pageNo < (json.pageCount ?? 1));
        setPage(pageNo);
      } catch (e) {
        console.error('Lỗi fetch report:', e);
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
      const res = await fetch(`${cleanUrl}/api/monitoring-log?pageNo=1&pageSize=200`);
      const json = await res.json();
      setAllData(json.data ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchAllForMetrics(); }, []);

  useEffect(() => {
    fetchReports(1, true, committedName, committedStatus);
  }, [committedName, committedStatus]);

  // ── Derived ──────────────────────────────────────────────────
  const metricsData = allData.length ? allData : data;
  const isFiltering = committedName || committedStatus;

  const waitingCount = metricsData.filter(
    i => normalizeStatus(i.status) === 'waitingforapproval',
  ).length;
  const approvedCount = metricsData.filter(
    i => normalizeStatus(i.status) === 'approved',
  ).length;
  const rejectedCount = metricsData.filter(i =>
    ['rejected', 'declinedbytechnician', 'reworkrequired'].includes(normalizeStatus(i.status)),
  ).length;

  // ── Handlers ─────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    setNameSearch('');
    setActiveStatus('');
    setCommittedName('');
    setCommittedStatus('');
    fetchAllForMetrics();
  };

  const handleClearAll = () => {
    setNameSearch('');
    setActiveStatus('');
  };

  // ── List Header ──────────────────────────────────────────────
  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>

      {/* ── Metrics ── */}
      <View style={s.metricsRow}>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.total.bg }]}>
          <FileBarChart2 size={20} color={METRIC_CARDS.total.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.total.textColor }]}>
            {metricsData.length || totalCount}
          </Text>
          <Text style={s.metricLabel}>Tổng{'\n'}báo cáo</Text>
        </View>

        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.waiting.bg }]}>
          <Clock size={20} color={METRIC_CARDS.waiting.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.waiting.textColor }]}>
            {waitingCount}
          </Text>
          <Text style={s.metricLabel}>Chờ{'\n'}duyệt</Text>
        </View>

        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.approved.bg }]}>
          <CheckCircle2 size={20} color={METRIC_CARDS.approved.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.approved.textColor }]}>
            {approvedCount}
          </Text>
          <Text style={s.metricLabel}>Đã{'\n'}duyệt</Text>
        </View>

        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.rejected.bg }]}>
          <XCircle size={20} color={METRIC_CARDS.rejected.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.rejected.textColor }]}>
            {rejectedCount}
          </Text>
          <Text style={s.metricLabel}>Từ chối{'\n'}/ Làm lại</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrapper}>
        <View style={[s.searchBox, nameSearch ? s.searchBoxActive : s.searchBoxDefault]}>
          <Search size={15} color={nameSearch ? COLORS.primary : COLORS.placeholder} />
          <TextInput
            value={nameSearch}
            onChangeText={setNameSearch}
            placeholder="Tìm theo tên báo cáo..."
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
        <Text style={styles.sectionTitle}>Danh sách báo cáo</Text>
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

  // ── Render item ──────────────────────────────────────────────
  // Sort newest-first; index 0 = newest
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isNewest = index === 0;
    return (
      <>
        {isNewest && <NewestBanner />}
        <View style={isNewest ? s.newestItemWrapper : undefined}>
          <ReportItem
            item={item}
            index={index}
            onPress={() => navigation.navigate('ReportDetail', { monitoringLogId: item.id })}
          />
        </View>
      </>
    );
  };

  // ── Render ───────────────────────────────────────────────────
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
        <Text style={styles.headerTitle}>Báo Cáo</Text>
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
              <Text style={s.emptyText}>Không tìm thấy báo cáo nào.</Text>
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
            if (hasMore && !loading) fetchReports(page + 1, false, committedName, committedStatus);
          }}
          onEndReachedThreshold={0.3}
        />
      )}

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

export default ReportsScreen;