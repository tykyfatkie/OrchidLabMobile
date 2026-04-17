/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, ListChecks } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '@env';

import { styles } from '../../styles/styles';
import { CustomTabBar } from '../../components/CustomTabBar';
import { TaskItem } from '../../components/TaskItem';
import { QuickMenu } from '../../components/QuickMenu';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = API_URL;
const PAGE_SIZE = 10;

interface TaskListItem {
  id: string;
  name: string;
  description: string;
  stageId: number;
  status: string;
  expectedEndDate: string | null;
  technicianId?: string | null;
}

const TasksScreen = () => {
  const navigation = useNavigation<any>();
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<TaskListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchTasks = useCallback(async (pageNo: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const cleanUrl = String(BASE_URL).replace(/\/+$/, '');
      const url = `${cleanUrl}/api/tasks?pageNumber=${pageNo}&pageSize=${PAGE_SIZE}`;
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const json = await res.json();

      const fetchedData = (json.data ?? []) as TaskListItem[];
      const filteredData = fetchedData.filter((item) => item.technicianId === user?.id);

      setData(prev => replace ? filteredData : [...prev, ...filteredData]);
      setTotalCount(prev => replace ? filteredData.length : prev + filteredData.length);
      setHasMore(pageNo < (json.pageCount ?? 1));
    } catch (e) {
      console.error("Lỗi fetch tasks:", e);
    } finally {
      setLoading(false); setLoadingMore(false); setRefreshing(false);
    }
  }, [user?.id, accessToken]);

  useEffect(() => { fetchTasks(1, true); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchTasks(1, true);
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore) {
      const next = page + 1;
      setPage(next);
      fetchTasks(next, false);
    }
  };

  const ListHeader = () => (
    <View style={styles.listHeaderPadding}>
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { backgroundColor: '#FFFFFF' }]}>
          <ClipboardList size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>{totalCount}</Text>
          <Text style={styles.metricTitle}>Tổng số{"\n"}công việc</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#A3F7BF' }]}>
          <ListChecks size={20} color="#1F3D2F" />
          <Text style={styles.metricValue}>
            {data.filter(i => i.status === 'Template').length}
          </Text>
          <Text style={styles.metricTitle}>Công việc{"\n"}mẫu</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Danh sách công việc</Text>
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
        <Text style={styles.headerTitle}>Công Việc</Text>
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
            <TaskItem
              item={item}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F3D2F" />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#1F3D2F" style={{ marginVertical: 20 }} /> : null}
        />
      )}
      <CustomTabBar />
    </SafeAreaView>
  );
};

export default TasksScreen;