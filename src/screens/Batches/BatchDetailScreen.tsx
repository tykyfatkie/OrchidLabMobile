import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL } from '@env';

import { CustomTabBar } from '../../components/CustomTabBar';
import { QuickMenu } from '../../components/QuickMenu';
import { translateStatusVi } from '../../utils/statusTranslations';
import { translateBatchUnitVi } from '../../utils/batchTranslations';
import { batchDetailStyles as styles } from './batchDetailStyles';

const cleanBaseUrl = String(API_URL).trim().replace(/\/+$/, '');

type BatchStatus = 'Ready' | 'InUse' | 'Cleaning' | 'Maintenance' | 'Inactive';

interface BatchDetail {
  id: string;
  batchName: string;
  status: BatchStatus | string;
  labRoomName: string;
  batchSizeWidth: number | string | null;
  batchSizeHeight: number | string | null;
  widthUnit: string | null;
  heightUnit: string | null;
}

const toText = (value?: string | number | null, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeBatchDetail = (raw: any): BatchDetail => {
  const source = raw?.data ?? raw ?? {};

  return {
    id: String(source?.id ?? ''),
    batchName: toText(source?.batchName, 'N/A'),
    status: toText(source?.status, 'Inactive'),
    labRoomName: toText(source?.labRoomName, 'N/A'),
    batchSizeWidth: source?.batchSizeWidth ?? null,
    batchSizeHeight: source?.batchSizeHeight ?? null,
    widthUnit: source?.widthUnit ?? null,
    heightUnit: source?.heightUnit ?? null,
  };
};

const parseErrorMessage = async (res: Response, fallback: string) => {
  const raw = await res.text();
  if (!raw) return fallback;

  try {
    const json = JSON.parse(raw);
    return json?.detail || json?.message || fallback;
  } catch {
    return raw;
  }
};

const getStatusBadgeStyle = (status?: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'ready') return styles.badgeReady;
  if (normalized === 'inuse') return styles.badgeInUse;
  if (normalized === 'cleaning') return styles.badgeCleaning;
  if (normalized === 'maintenance') return styles.badgeMaintenance;
  if (normalized === 'inactive') return styles.badgeInactive;
  return styles.badgeDefault;
};

interface InfoRowProps {
  label: string;
  value?: string | number | null;
  isLast?: boolean;
}

const InfoRow = ({ label, value, isLast }: InfoRowProps) => (
  <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{toText(value)}</Text>
  </View>
);

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard = ({ title, children }: SectionCardProps) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

const BatchDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const batchId = route.params?.batchId as string | number | undefined;

  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchBatchDetail = useCallback(async () => {
    if (!batchId) {
      setError('Không tìm thấy batchId để tải chi tiết lô nuôi.');
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${cleanBaseUrl}/api/batches/${batchId}`);
      if (!res.ok) {
        const message = await parseErrorMessage(res, `Không thể tải chi tiết lô nuôi (HTTP ${res.status})`);
        throw new Error(message);
      }

      const raw = await res.text();
      const json = raw ? JSON.parse(raw) : {};
      setDetail(normalizeBatchDetail(json));
    } catch (e: any) {
      const message = String(e?.message || 'Không thể kết nối tới máy chủ');
      setError(message);
      Alert.alert('Lỗi tải dữ liệu', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatchDetail();
  }, [fetchBatchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatchDetail();
  };

  const sizeText = useMemo(() => {
    if (!detail) return 'N/A';

    const widthValue = toText(detail.batchSizeWidth);
    const heightValue = toText(detail.batchSizeHeight);
    const widthUnit = translateBatchUnitVi(detail.widthUnit);
    const heightUnit = translateBatchUnitVi(detail.heightUnit);

    return `${widthValue} ${widthUnit} x ${heightValue} ${heightUnit}`;
  }, [detail]);

  const canMarkAsReady = String(detail?.status || '').toLowerCase() !== 'ready';

  const renderErrorFallback = () => (
    <View style={styles.center}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
        <Text style={styles.errorText}>{toText(error)}</Text>

        <View style={styles.errorActions}>
          <View style={styles.actionHalf}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionHalf}>
            <TouchableOpacity style={styles.primaryButton} onPress={fetchBatchDetail}>
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ImageBackground
        source={require('../../assets/images/background.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(223,231,223,0.85)', 'rgba(242,246,242,0.85)']}
          style={styles.bgGradient}
        />
      </ImageBackground>

      <View style={styles.headerWrap}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <ArrowLeft size={18} color="#1F3D2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết lô nuôi</Text>
        <View style={styles.backButton} pointerEvents="none" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1F3D2F" />
        </View>
      ) : error && !detail ? (
        renderErrorFallback()
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F3D2F" />}
          showsVerticalScrollIndicator={false}
        >
          <SectionCard title="Thông tin cơ bản">
            <Text style={styles.cardTitle}>{toText(detail?.batchName)}</Text>
            <View style={[styles.statusBadge, getStatusBadgeStyle(detail?.status)]}>
              <Text style={styles.statusBadgeText}>{translateStatusVi(detail?.status)}</Text>
            </View>

            <InfoRow label="Phòng lab" value={detail?.labRoomName} isLast />
          </SectionCard>

          <SectionCard title="Kích thước lô nuôi">
            <InfoRow label="Kích thước" value={sizeText} />
            <InfoRow
              label="Đơn vị"
              value={`${translateBatchUnitVi(detail?.widthUnit)} / ${translateBatchUnitVi(detail?.heightUnit)}`}
              isLast
            />
          </SectionCard>

          {canMarkAsReady ? (
            <SectionCard title="Hành động">
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => Alert.alert('Thông báo', 'Tính năng cập nhật trạng thái sẽ được hỗ trợ ở bước sau.')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Đánh dấu là đã sẵn sàng</Text>
              </TouchableOpacity>
            </SectionCard>
          ) : null}
        </ScrollView>
      )}

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default BatchDetailScreen;