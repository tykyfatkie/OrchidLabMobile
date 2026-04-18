import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, CheckCircle2, CircleX } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL } from '@env';

import { CustomTabBar } from '../../components/CustomTabBar';
import { translateMatchResultVi, translateMonitoringMetricVi, translateMonitoringTermVi } from '../../utils/monitoringTranslations';
import { translateStatusVi } from '../../utils/statusTranslations';
import { reportDetailStyles as styles } from './reportDetailStyles';

const cleanBaseUrl = String(API_URL).trim().replace(/\/+$/, '');

const ANALYTIC_KEYS = [
  'anthracnose',
  'bacterialWilt',
  'blackrot',
  'brownspots',
  'moldBacterial',
  'moldFungus',
  'softRot',
  'stemRot',
  'witheredYellowRoot',
  'oxidation',
  'virus',
  'healthy',
] as const;

type AnalyticKey = (typeof ANALYTIC_KEYS)[number];

type AnalyticResult = Record<AnalyticKey, number | string | null | undefined>;

interface MonitoringLogDetailItem {
  id?: string;
  characteristicName?: string;
  measuredValue?: number | string | null;
  unit?: string | null;
  expectedMinValue?: number | null;
  expectedMaxValue?: number | null;
  expectedValue?: number | string | null;
  isMatch?: boolean | null;
}

interface MonitoringLogDetail {
  id?: string;
  name?: string;
  sampleName?: string;
  sampleStageDefinitionName?: string;
  status?: string;
  createdBy?: string;
  createdDate?: string | null;
  diseaseName?: string | null;
  analyticResult?: AnalyticResult;
  details?: MonitoringLogDetailItem[];
  imageUrls?: string[];
  rejectionReason?: string | null;
  rejectedDate?: string | null;
}

const toText = (value?: string | number | null, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
};

const formatDate = (iso?: string | null) => {
  if (!iso || iso.startsWith('0001-01-01')) return 'N/A';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return `${parsed.getDate().toString().padStart(2, '0')}/${(parsed.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${parsed.getFullYear()}`;
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

const getStatusStyle = (status?: string) => {
  const normalized = String(status || '').toLowerCase();

  if (
    normalized === 'completedintime' ||
    normalized === 'completedouttime' ||
    normalized === 'approved' ||
    normalized === 'done' ||
    normalized === 'completed'
  ) {
    return styles.statusDone;
  }

  if (normalized === 'inprogress' || normalized === 'waitingforapproval' || normalized === 'assigned') {
    return styles.statusInProgress;
  }

  if (normalized === 'created' || normalized === 'template' || normalized === 'pending') {
    return styles.statusCreated;
  }

  return styles.statusDefault;
};

const normalizeLog = (raw: any): MonitoringLogDetail => {
  const source = raw?.data ?? raw ?? {};

  const detailsSource =
    source.monitoringLogDetails ||
    source.monitoringLogDetailDtos ||
    source.monitoringDetails ||
    source.logDetails ||
    source.details ||
    [];

  const details = (detailsSource ?? []).map((item: any) => {
    const stageRequirement = item.stageRequirementDefinitionDto;
    const sampleRequirement = stageRequirement?.sampleRequirementDefinitionDto;

    return {
      id: item.id,
      characteristicName:
        sampleRequirement?.name ??
        item.sampleRequirementDefinitionDto?.name ??
        item.characteristicName ??
        item.characteristic?.name,
      measuredValue: item.measuredValue,
      unit: item.unit ?? sampleRequirement?.unit ?? item.characteristic?.unit,
      expectedMinValue: item.expectedMinValue ?? stageRequirement?.minValue,
      expectedMaxValue: item.expectedMaxValue ?? stageRequirement?.maxValue,
      expectedValue: item.expectedValue ?? stageRequirement?.expectedValue,
      isMatch: item.isMatch,
    };
  });

  const imageUrls =
    source.imageUrls ||
    source.images?.map((img: any) => img?.url).filter(Boolean) ||
    source.monitoringImages?.map((img: any) => img?.url).filter(Boolean) ||
    [];

  const analytic = source.analyticResult ?? source.analysis ?? source.diseaseAnalytics ?? source;

  return {
    id: source.id,
    name: source.name,
    sampleName: source.sampleName,
    sampleStageDefinitionName: source.sampleStageDefinitionName,
    status: source.status,
    createdBy: source.createdBy,
    createdDate: source.createdDate,
    diseaseName: source.diseaseName,
    analyticResult: {
      anthracnose: analytic.anthracnose,
      bacterialWilt: analytic.bacterialWilt,
      blackrot: analytic.blackrot,
      brownspots: analytic.brownspots,
      moldBacterial: analytic.moldBacterial,
      moldFungus: analytic.moldFungus,
      softRot: analytic.softRot,
      stemRot: analytic.stemRot,
      witheredYellowRoot: analytic.witheredYellowRoot,
      oxidation: analytic.oxidation,
      virus: analytic.virus,
      healthy: analytic.healthy,
    },
    details,
    imageUrls,
    rejectionReason: source.rejectionReason,
    rejectedDate: source.rejectedDate,
  };
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

const StatusBadge = ({ status }: { status?: string }) => (
  <View style={[styles.statusTag, getStatusStyle(status)]}>
    <Text style={styles.statusText}>{translateStatusVi(status)}</Text>
  </View>
);

const ReportDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const monitoringLogId = route.params?.monitoringLogId as string | undefined;

  const [detail, setDetail] = useState<MonitoringLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!monitoringLogId) {
      const message = 'Không tìm thấy monitoringLogId để tải chi tiết báo cáo.';
      setError(message);
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${cleanBaseUrl}/api/monitoring-log/${monitoringLogId}`);
      if (!res.ok) {
        const message = await parseErrorMessage(res, `Không thể tải chi tiết báo cáo (HTTP ${res.status})`);
        throw new Error(message);
      }

      const raw = await res.text();
      const json = raw ? JSON.parse(raw) : {};
      setDetail(normalizeLog(json));
    } catch (e: any) {
      const message = String(e?.message || 'Không thể kết nối tới máy chủ');
      setError(message);
      Alert.alert('Lỗi tải dữ liệu', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monitoringLogId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  const analyticEntries = useMemo(() => {
    const map: Partial<AnalyticResult> = detail?.analyticResult ?? {};
    return ANALYTIC_KEYS.map((key) => ({
      key,
      label: translateMonitoringMetricVi(key),
      value: map[key],
    }));
  }, [detail?.analyticResult]);

  const maxAnalyticValue = useMemo(() => {
    const values = analyticEntries
      .map((item) => Number(item.value))
      .filter((v) => !Number.isNaN(v));

    if (values.length === 0) return null;
    return Math.max(...values);
  }, [analyticEntries]);

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
            <TouchableOpacity style={styles.primaryButton} onPress={fetchDetail}>
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const logDetails = detail?.details ?? [];
  const images = detail?.imageUrls ?? [];

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
        <Text style={styles.headerTitle}>Chi tiết báo cáo</Text>
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
            <Text style={styles.cardTitle}>{toText(detail?.name)}</Text>
            <StatusBadge status={detail?.status} />
            <InfoRow label="Tên mẫu" value={detail?.sampleName} />
            <InfoRow label="Giai đoạn mẫu" value={detail?.sampleStageDefinitionName} />
            <InfoRow label="Người tạo" value={detail?.createdBy} />
            <InfoRow label="Ngày tạo" value={formatDate(detail?.createdDate)} />
            <InfoRow label="Bệnh phát hiện" value={detail?.diseaseName} isLast />
          </SectionCard>

          <SectionCard title="Kết quả phân tích">
            <View style={styles.analyticGrid}>
              {analyticEntries.map((item) => {
                const numericValue = Number(item.value);
                const isHigh =
                  maxAnalyticValue !== null &&
                  !Number.isNaN(numericValue) &&
                  numericValue === maxAnalyticValue &&
                  numericValue > 0;

                return (
                  <View key={item.key} style={styles.analyticItem}>
                    <View style={[styles.analyticCard, isHigh && styles.analyticCardHigh]}>
                      <Text style={styles.analyticName}>{item.label}</Text>
                      <Text style={styles.analyticValue}>{toText(item.value, '0')}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard title="Quy cách giám sát">
            {logDetails.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có dữ liệu đo chi tiết.</Text>
            ) : (
              logDetails.map((item, index) => {
                const hasRange = item.expectedMinValue !== null && item.expectedMinValue !== undefined && item.expectedMaxValue !== null && item.expectedMaxValue !== undefined;
                const hasExpectedValue = item.expectedValue !== null && item.expectedValue !== undefined;
                const expectedText = hasRange
                  ? `${item.expectedMinValue} - ${item.expectedMaxValue}`
                  : hasExpectedValue
                  ? String(item.expectedValue)
                  : 'N/A';

                return (
                  <View
                    key={item.id ?? `${index}`}
                    style={[
                      styles.logItem,
                      item.isMatch ? styles.logItemPass : styles.logItemFail,
                    ]}
                  >
                    <View style={styles.logItemMainRow}>
                      <View style={styles.logItemLeftCol}>
                        <Text style={styles.logItemTitle}>{translateMonitoringTermVi(item.characteristicName)}</Text>
                        <Text style={styles.logItemMeta}>Giá trị đo: {toText(item.measuredValue)} {toText(item.unit, '')}</Text>
                        <Text style={styles.logItemMeta}>Giá trị kỳ vọng: {expectedText}</Text>
                      </View>

                      <View style={styles.logItemRightCol}>
                        {item.isMatch ? (
                          <View style={styles.passTag}>
                            <View style={styles.resultTagRow}>
                              <CheckCircle2 size={12} color="#1F3D2F" />
                              <Text style={styles.passText}>{translateMatchResultVi(item.isMatch)}</Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.failTag}>
                            <View style={styles.resultTagRow}>
                              <CircleX size={12} color="#1F3D2F" />
                              <Text style={styles.failText}>{translateMatchResultVi(item.isMatch)}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="Hình ảnh">
            {images.length === 0 ? (
              <Text style={styles.emptyText}>Không có ảnh cho báo cáo này.</Text>
            ) : (
              <View style={styles.imageGrid}>
                {images.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.imageCell}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewImage(url)}>
                      <Image source={{ uri: url }} style={styles.imageThumb} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          {detail?.rejectionReason || detail?.rejectedDate ? (
            <SectionCard title="Thông tin từ chối">
              <InfoRow label="Lý do từ chối" value={detail?.rejectionReason} />
              <InfoRow label="Ngày từ chối" value={formatDate(detail?.rejectedDate)} isLast />
            </SectionCard>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalImageWrap}>
            {previewImage ? <Image source={{ uri: previewImage }} style={styles.modalImage} resizeMode="contain" /> : null}
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPreviewImage(null)}>
            <Text style={styles.modalCloseText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default ReportDetailScreen;
