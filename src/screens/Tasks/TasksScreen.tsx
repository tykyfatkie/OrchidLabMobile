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
import { ClipboardList, ListChecks, CheckCircle2, Clock, Filter, Search, X } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { TaskItem } from '../../components/TaskItem';
import { QuickMenu } from '../../components/QuickMenu';
import { useAuth } from '../../context/AuthContext';
import { taskStyles as s, COLORS, STATUS_FILTERS, METRIC_CARDS } from './TaskStyles';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 500;

const normalizeStatus = (status?: string) => String(status ?? '').toLowerCase();

const sortByNewest = (items: any[]): any[] =>
  [...items].sort(
    (a, b) => new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime(),
  );

const buildUrl = (base: string, pageNo: number, search: string, status: string, technicianId?: string): string => {
  const params = new URLSearchParams();
  params.set('pageNumber', String(pageNo));
  params.set('pageSize', String(PAGE_SIZE));
  if (search.trim()) params.set('SearchTerm', search.trim());
  if (status) params.set('Status', status);
  if (technicianId) params.set('TechnicianId', technicianId);
  return `${base}/api/tasks?${params.toString()}`;
};

// ── FilterChip ───────────────────────────────────────────────
const FilterChip = ({ label, color, active, onPress }: any) => (
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
const TasksScreen = () => {
  const navigation = useNavigation<any>();
  const { user, accessToken } = useAuth();

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

  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  const fetchTasks = useCallback(
    async (pageNo: number, replace: boolean, search: string, status: string) => {
      if (replace) setLoading(true);
      try {
        const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
        const url = buildUrl(cleanUrl, pageNo, search, status, user?.id);
        const res = await fetch(url, { headers: authHeaders });
        const json = await res.json();
        const fetched: any[] = json.data ?? [];
        setData(prev => replace ? sortByNewest(fetched) : sortByNewest([...prev, ...fetched]));
        setTotalCount(json.totalCount ?? 0);
        setHasMore(pageNo < (json.pageCount ?? 1));
        setPage(pageNo);
      } catch (e) {
        console.error('Lỗi fetch tasks:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, accessToken],
  );

  const fetchAllForMetrics = useCallback(async () => {
    try {
      const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
      const url = `${cleanUrl}/api/tasks?pageNumber=1&pageSize=200${user?.id ? `&TechnicianId=${user.id}` : ''}`;
      const res = await fetch(url, { headers: authHeaders });
      const json = await res.json();
      setAllData(json.data ?? []);
    } catch (_) {}
  }, [user?.id, accessToken]);

  useEffect(() => { fetchAllForMetrics(); }, []);
  useEffect(() => { fetchTasks(1, true, committedSearch, committedStatus); }, [committedSearch, committedStatus]);

  const metricsData = allData.length ? allData : data;
  const isFiltering = committedSearch || committedStatus;

  const inProgressCount = metricsData.filter(i => normalizeStatus(i.status) === 'inprogress').length;
  const doneCount      = metricsData.filter(i => normalizeStatus(i.status) === 'done').length;

  const handleRefresh = () => {
    setRefreshing(true);
    setNameSearch('');
    setActiveStatus('');
    setCommittedSearch('');
    setCommittedStatus('');
    fetchAllForMetrics();
  };

  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>
      {/* Metrics */}
      <View style={s.metricsRow}>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.total.bg }]}>
          <ClipboardList size={20} color={METRIC_CARDS.total.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.total.textColor }]}>
            {metricsData.length || totalCount}
          </Text>
          <Text style={s.metricLabel}>Tổng{'\n'}công việc</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.inProgress.bg }]}>
          <Clock size={20} color={METRIC_CARDS.inProgress.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.inProgress.textColor }]}>
            {inProgressCount}
          </Text>
          <Text style={s.metricLabel}>Đang{'\n'}thực hiện</Text>
        </View>
        <View style={[s.metricCard, { backgroundColor: METRIC_CARDS.done.bg }]}>
          <CheckCircle2 size={20} color={METRIC_CARDS.done.iconColor} />
          <Text style={[s.metricValue, { color: METRIC_CARDS.done.textColor }]}>
            {doneCount}
          </Text>
          <Text style={s.metricLabel}>Hoàn{'\n'}thành</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrapper}>
        <View style={[s.searchBox, nameSearch ? s.searchBoxActive : s.searchBoxDefault]}>
          <Search size={15} color={nameSearch ? COLORS.primary : COLORS.placeholder} />
          <TextInput
            value={nameSearch}
            onChangeText={setNameSearch}
            placeholder="Tìm theo tên công việc..."
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
        <Text style={styles.sectionTitle}>Danh sách công việc</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isFiltering ? (
            <TouchableOpacity onPress={() => { setNameSearch(''); setActiveStatus(''); }} activeOpacity={0.8} style={s.clearBtn}>
              <X size={11} color={COLORS.red} />
              <Text style={s.clearBtnText}>Xóa lọc</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={s.resultCount}>{totalCount} kết quả</Text>
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
          <TaskItem
            item={item}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
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
        <Text style={styles.headerTitle}>Công Việc</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
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
              <Text style={s.emptyText}>Không tìm thấy công việc nào.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={() => { if (hasMore && !loading) fetchTasks(page + 1, false, committedSearch, committedStatus); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
      <CustomTabBar />
    </SafeAreaView>
  );
};

export default TasksScreen;