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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Asset, launchImageLibrary } from 'react-native-image-picker';
import { API_URL } from '@env';

import { CustomTabBar } from '../../components/CustomTabBar';
import {
  translateDiseaseIncidentStatusVi,
  translateSampleStageStatusVi,
  translateSampleStatusVi,
} from '../../utils/sampleTranslations';
import { sampleDetailStyles as styles } from './sampleDetailStyles';

const cleanBaseUrl = String(API_URL).trim().replace(/\/+$/, '');
const DISEASE_PAGE_SIZE = 30;

interface SampleStageDefinition {
  id?: number | string;
  name?: string;
  order?: number;
  description?: string;
  minDurationDays?: number;
  maxDurationDays?: number;
}

interface StageRequirementDefinition {
  id?: string;
  minValue?: number | null;
  maxValue?: number | null;
  expectedValue?: number | string | null;
  sampleRequirementDefinitionDto?: {
    id?: string;
    name?: string;
    unit?: string;
  };
}

interface LogDetailDto {
  id?: string;
  measuredValue?: number | string | null;
  isMatch?: boolean | null;
  stageRequirementDefinitionDto?: StageRequirementDefinition;
}

interface SampleStageDto {
  id?: string;
  startAt?: string;
  status?: string;
  sampleStageDefinition?: SampleStageDefinition;
  logDetailDtos?: LogDetailDto[];
  latestImageUrl?: string;
}

interface SampleDetail {
  id: string;
  name: string;
  experimentLogId: string;
  currentSampleStage: string;
  notes: string;
  reason: string;
  createdDate: string | null;
  createdBy: string;
  updatedDate: string | null;
  updatedBy: string;
  executionDate: string | null;
  status: string;
  initialCondition: string;
  sampleStageDto: SampleStageDto[];
}

interface DiseaseIncidentItem {
  id: string;
  sampleStageId: string;
  sampleName: string;
  diseaseName: string;
  status: string;
  aiConfidence: number | null;
  reviewNote: string;
}

interface AnalysisState {
  diseaseName: string;
  confidence: number | null;
  isHealthy: boolean;
}

interface StageProgressRow {
  id: string;
  stageName: string;
  stageOrder: number;
  status: string;
  startAt: string;
  isCurrent: boolean;
}

interface ReportRow {
  id: string;
  characteristicName: string;
  expectedText: string;
  measuredText: string;
  matchText: string;
  isMatch: boolean;
}

const toText = (value?: string | number | null, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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

const parseJsonSafely = (raw: string) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const fetchJsonByFallback = async (urls: string[]) => {
  let lastError = '';

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = await parseErrorMessage(res, `HTTP ${res.status}`);
        continue;
      }

      const raw = await res.text();
      return parseJsonSafely(raw);
    } catch (e: any) {
      lastError = String(e?.message || 'Không thể kết nối');
    }
  }

  throw new Error(lastError || 'Không thể tải dữ liệu');
};

const parseListResponse = (raw: any) => {
  const source = raw?.data ?? raw?.value?.data ?? raw?.value ?? raw ?? [];
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.items)) return source.items;
  if (Array.isArray(source?.results)) return source.results;
  return [];
};

const normalizeSampleDetail = (raw: any): SampleDetail => {
  const source = raw?.data ?? raw ?? {};

  return {
    id: String(source?.id ?? ''),
    name: toText(source?.name, ''),
    experimentLogId: toText(source?.experimentLogId, ''),
    currentSampleStage: toText(source?.currentSampleStage, ''),
    notes: toText(source?.notes, ''),
    reason: toText(source?.reason, ''),
    createdDate: source?.createdDate ?? null,
    createdBy: toText(source?.createdBy, ''),
    updatedDate: source?.updatedDate ?? null,
    updatedBy: toText(source?.updatedBy, ''),
    executionDate: source?.executionDate ?? null,
    status: toText(source?.status, ''),
    initialCondition: toText(source?.initialCondition, ''),
    sampleStageDto: Array.isArray(source?.sampleStageDto)
      ? source.sampleStageDto
      : [],
  };
};

const normalizeUsersMap = (raw: any) => {
  const users = parseListResponse(raw);
  const map = new Map<string, string>();

  users.forEach((item: any) => {
    const id = toText(item?.id, '');
    if (!id) return;

    const name =
      toText(item?.fullName, '') ||
      toText(item?.displayName, '') ||
      toText(item?.userName, '') ||
      toText(item?.name, '');

    map.set(id, name || id);
  });

  return map;
};

const normalizeExperimentLogMap = (raw: any) => {
  const logs = parseListResponse(raw);
  const map = new Map<string, string>();

  logs.forEach((item: any) => {
    const id = toText(item?.id, '');
    if (!id) return;
    map.set(id, toText(item?.name, id));
  });

  return map;
};

const normalizeDiseaseIncidents = (raw: any): DiseaseIncidentItem[] => {
  return parseListResponse(raw).map((item: any) => ({
    id: String(item?.id ?? ''),
    sampleStageId: String(item?.sampleStageId ?? ''),
    sampleName: toText(item?.sampleName, ''),
    diseaseName: toText(item?.diseaseName, 'Không rõ bệnh'),
    status: toText(item?.status, ''),
    aiConfidence: item?.aiConfidence ?? null,
    reviewNote: toText(item?.reviewNote, ''),
  }));
};

const getExpectedValueText = (item?: StageRequirementDefinition) => {
  const minValue = item?.minValue;
  const maxValue = item?.maxValue;
  const expectedValue = item?.expectedValue;

  const hasMin = minValue !== undefined && minValue !== null;
  const hasMax = maxValue !== undefined && maxValue !== null;

  if (hasMin && hasMax) return `${minValue} - ${maxValue}`;
  if (expectedValue !== undefined && expectedValue !== null) return String(expectedValue);
  return 'N/A';
};

const getSampleStatusBadgeStyle = (status?: string) => {
  if (status === 'Created') return styles.badgeCreated;
  if (status === 'InProgressed') return styles.badgeInProgressed;
  if (status === 'Completed') return styles.badgeCompleted;
  if (status === 'ExecutedBecauseOfDisease') return styles.badgeExecutedBecauseOfDisease;
  if (status === 'ConvertedToSeedling') return styles.badgeConvertedToSeedling;
  return styles.badgeDefault;
};

const getIncidentStatusStyle = (status?: string) => {
  if (status === 'AIDetected') return styles.incidentAIDetected;
  if (status === 'UnderReview') return styles.incidentUnderReview;
  if (status === 'Confirmed') return styles.incidentConfirmed;
  if (status === 'Dismissed') return styles.incidentDismissed;
  return styles.incidentDefault;
};

const canReviewIncident = (status?: string) => status === 'AIDetected' || status === 'UnderReview';

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

const SampleInfo = ({
  sample,
  currentStageLabel,
  createdByName,
  updatedByName,
  experimentLogName,
}: {
  sample: SampleDetail;
  currentStageLabel: string;
  createdByName: string;
  updatedByName: string;
  experimentLogName: string;
}) => (
  <SectionCard title="Thông tin cơ bản">
    <Text style={styles.cardTitle}>{toText(sample.name, 'N/A')}</Text>
    <View style={[styles.statusBadge, getSampleStatusBadgeStyle(sample.status)]}>
      <Text style={styles.statusBadgeText}>{translateSampleStatusVi(sample.status)}</Text>
    </View>

    <InfoRow label="Giai đoạn hiện tại" value={currentStageLabel} />
    <InfoRow label="Nhật ký thí nghiệm" value={experimentLogName} />
    <InfoRow label="Người tạo" value={createdByName} />
    <InfoRow label="Ngày tạo" value={formatDate(sample.createdDate)} />
    <InfoRow label="Người cập nhật" value={updatedByName} />
    <InfoRow label="Ngày cập nhật" value={formatDate(sample.updatedDate)} />
    <InfoRow label="Điều kiện ban đầu" value={toText(sample.initialCondition, 'N/A')} />
    <InfoRow label="Ghi chú" value={toText(sample.notes, 'N/A')} isLast />
  </SectionCard>
);

const StageProgress = ({ rows }: { rows: StageProgressRow[] }) => (
  <SectionCard title="Tiến trình giai đoạn">
    {rows.length === 0 ? (
      <Text style={styles.mutedText}>Không có dữ liệu giai đoạn.</Text>
    ) : (
      rows.map((row, index) => {
        const isLast = index === rows.length - 1;
        return (
          <View key={row.id} style={[styles.timelineRow, isLast && styles.timelineRowLast]}>
            <View style={styles.timelineDotWrap}>
              <View style={[styles.timelineDot, row.isCurrent && styles.timelineDotCurrent]} />
              {!isLast ? <View style={styles.timelineLine} /> : null}
            </View>

            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, row.isCurrent && styles.timelineTitleCurrent]}>
                {row.stageOrder}. {row.stageName}
              </Text>
              <Text style={styles.timelineMeta}>
                {translateSampleStageStatusVi(row.status)} • Bắt đầu: {formatDate(row.startAt)}
              </Text>
            </View>
          </View>
        );
      })
    )}
  </SectionCard>
);

const ReportTable = ({ rows }: { rows: ReportRow[] }) => (
  <SectionCard title="Báo cáo giai đoạn hiện tại">
    {rows.length === 0 ? (
      <Text style={styles.mutedText}>Chưa có chỉ số theo dõi cho giai đoạn này.</Text>
    ) : (
      <>
        <View style={styles.reportHeader}>
          <Text style={[styles.reportHeaderText, styles.reportCellName]}>Chỉ tiêu</Text>
          <Text style={[styles.reportHeaderText, styles.reportCellExpected]}>Kỳ vọng</Text>
          <Text style={[styles.reportHeaderText, styles.reportCellMeasured]}>Đo được</Text>
          <Text style={[styles.reportHeaderText, styles.reportCellMatch]}>Kết quả</Text>
        </View>

        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          return (
            <View key={row.id} style={[styles.reportRow, isLast && styles.reportRowLast]}>
              <Text style={[styles.reportNameText, styles.reportCellName]}>{row.characteristicName}</Text>
              <Text style={[styles.reportValueText, styles.reportCellExpected]}>{row.expectedText}</Text>
              <Text style={[styles.reportValueText, styles.reportCellMeasured]}>{row.measuredText}</Text>
              <Text
                style={[
                  styles.reportValueText,
                  styles.reportCellMatch,
                  row.isMatch ? styles.matchYes : styles.matchNo,
                ]}
              >
                {row.matchText}
              </Text>
            </View>
          );
        })}
      </>
    )}
  </SectionCard>
);

const ImageGallery = ({ images }: { images: { id: string; url: string; label: string }[] }) => (
  <SectionCard title="Hình ảnh giai đoạn hiện tại">
    {images.length === 0 ? (
      <Text style={styles.mutedText}>Chưa có hình ảnh cho giai đoạn hiện tại.</Text>
    ) : (
      <View style={styles.imageGrid}>
        {images.map((item) => (
          <View key={item.id} style={styles.imageItem}>
            <Image source={{ uri: item.url }} style={styles.image} resizeMode="cover" />
            <Text style={styles.imageCaption}>{item.label}</Text>
          </View>
        ))}
      </View>
    )}
  </SectionCard>
);

const AnalysisSection = ({
  selectedImage,
  analysis,
  analyzing,
  onPickImage,
}: {
  selectedImage: Asset | null;
  analysis: AnalysisState | null;
  analyzing: boolean;
  onPickImage: () => void;
}) => (
  <SectionCard title="Phân tích AI">
    <TouchableOpacity
      style={[styles.uploadButton, analyzing && styles.uploadButtonDisabled]}
      activeOpacity={0.85}
      onPress={onPickImage}
      disabled={analyzing}
    >
      <Text style={styles.uploadButtonText}>{analyzing ? 'Đang phân tích...' : 'Tải ảnh để phân tích bệnh'}</Text>
    </TouchableOpacity>

    {selectedImage?.uri ? <Image source={{ uri: selectedImage.uri }} style={styles.analysisPreview} /> : null}

    {analysis ? (
      <View style={styles.analysisResultCard}>
        <Text style={styles.analysisResultTitle}>Kết quả phân tích</Text>
        <Text style={styles.analysisResultText}>Bệnh: {analysis.diseaseName}</Text>
        <Text style={styles.analysisResultText}>
          Độ tin cậy: {analysis.confidence !== null ? `${analysis.confidence}%` : 'N/A'}
        </Text>
        <Text style={styles.analysisResultText}>
          Đánh giá: {analysis.isHealthy ? 'Mẫu khỏe mạnh' : 'Phát hiện dấu hiệu bệnh'}
        </Text>
      </View>
    ) : null}
  </SectionCard>
);

const DiseaseIncidentList = ({
  incidents,
  filterStatus,
  onChangeFilter,
  onReview,
  updatingIncidentId,
}: {
  incidents: DiseaseIncidentItem[];
  filterStatus: string;
  onChangeFilter: (status: string) => void;
  onReview: (item: DiseaseIncidentItem, isConfirmed: boolean) => void;
  updatingIncidentId: string;
}) => {
  const options = [
    { label: 'Tất cả', value: '' },
    { label: 'AI phát hiện', value: 'AIDetected' },
    { label: 'Đang xem xét', value: 'UnderReview' },
    { label: 'Đã xác nhận', value: 'Confirmed' },
    { label: 'Đã loại bỏ', value: 'Dismissed' },
  ];

  return (
    <SectionCard title="Danh sách sự cố bệnh">
      <View style={styles.chipContainer}>
        {options.map((option) => {
          const isActive = option.value === filterStatus;
          return (
            <TouchableOpacity
              key={option.value || 'all'}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onChangeFilter(option.value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {incidents.length === 0 ? (
        <Text style={styles.mutedText}>Không có sự cố bệnh theo bộ lọc hiện tại.</Text>
      ) : (
        incidents.map((item) => {
          const reviewing = updatingIncidentId === item.id;
          const allowReview = canReviewIncident(item.status);
          return (
            <View key={item.id} style={styles.incidentItem}>
              <View style={styles.incidentTop}>
                <Text style={styles.incidentName} numberOfLines={1}>{item.diseaseName}</Text>
                <View style={[styles.incidentStatusBadge, getIncidentStatusStyle(item.status)]}>
                  <Text style={styles.incidentStatusText}>{translateDiseaseIncidentStatusVi(item.status)}</Text>
                </View>
              </View>

              <Text style={styles.incidentMeta}>
                AI confidence: {item.aiConfidence !== null ? `${item.aiConfidence}%` : 'N/A'}
              </Text>
              <Text style={styles.incidentMeta}>Ghi chú: {toText(item.reviewNote, 'Chưa có ghi chú')}</Text>

              {allowReview ? (
                <View style={styles.incidentActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => onReview(item, true)}
                    activeOpacity={0.85}
                    disabled={reviewing}
                  >
                    <Text style={styles.actionButtonText}>{reviewing ? 'Đang xử lý...' : 'Xác nhận'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dismissButton]}
                    onPress={() => onReview(item, false)}
                    activeOpacity={0.85}
                    disabled={reviewing}
                  >
                    <Text style={styles.actionButtonText}>{reviewing ? 'Đang xử lý...' : 'Loại bỏ'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </SectionCard>
  );
};

const SampleDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const sampleId = route.params?.sampleId as string | undefined;

  const [sample, setSample] = useState<SampleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [experimentLogMap, setExperimentLogMap] = useState<Map<string, string>>(new Map());
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());

  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [incidentFilterStatus, setIncidentFilterStatus] = useState('');
  const [incidents, setIncidents] = useState<DiseaseIncidentItem[]>([]);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [updatingIncidentId, setUpdatingIncidentId] = useState('');

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const stageProgressRows = useMemo<StageProgressRow[]>(() => {
    if (!sample) return [];

    const stageRows = [...(sample.sampleStageDto ?? [])]
      .sort((a, b) => Number(a?.sampleStageDefinition?.order ?? 0) - Number(b?.sampleStageDefinition?.order ?? 0))
      .map((item) => ({
        id: String(item?.id ?? `${item?.sampleStageDefinition?.order ?? 0}`),
        stageName: toText(item?.sampleStageDefinition?.name, 'N/A'),
        stageOrder: Number(item?.sampleStageDefinition?.order ?? 0),
        status: toText(item?.status, ''),
        startAt: toText(item?.startAt, ''),
        isCurrent: false,
      }));

    const currentLower = sample.currentSampleStage.trim().toLowerCase();
    let currentIndex = stageRows.findIndex((item) => item.stageName.trim().toLowerCase() === currentLower);
    if (currentIndex < 0) {
      currentIndex = stageRows.findIndex((item) => item.status === 'InProgressed');
    }
    if (currentIndex < 0 && stageRows.length > 0) {
      currentIndex = stageRows.length - 1;
    }

    return stageRows.map((item, index) => ({ ...item, isCurrent: index === currentIndex }));
  }, [sample]);

  const latestStage = useMemo(() => {
    if (!sample) return null;

    const byOrder = [...(sample.sampleStageDto ?? [])].sort(
      (a, b) => Number(a?.sampleStageDefinition?.order ?? 0) - Number(b?.sampleStageDefinition?.order ?? 0),
    );
    const currentLower = sample.currentSampleStage.trim().toLowerCase();

    let stage = byOrder.find(
      (item) => String(item?.sampleStageDefinition?.name ?? '').trim().toLowerCase() === currentLower,
    );
    if (!stage) {
      stage = byOrder.find((item) => item?.status === 'InProgressed');
    }
    return stage ?? byOrder[byOrder.length - 1] ?? null;
  }, [sample]);

  const currentStageLabel = useMemo(() => {
    const fromStage = toText(latestStage?.sampleStageDefinition?.name, '');
    if (fromStage) return fromStage;
    return toText(sample?.currentSampleStage, 'N/A');
  }, [latestStage, sample?.currentSampleStage]);

  const reportRows = useMemo<ReportRow[]>(() => {
    const details = latestStage?.logDetailDtos ?? [];
    return details.map((item, index) => {
      const requirement = item?.stageRequirementDefinitionDto;
      const characteristicName =
        requirement?.sampleRequirementDefinitionDto?.name ||
        `Chỉ tiêu ${index + 1}`;
      const measuredValue = item?.measuredValue;
      const measuredUnit = requirement?.sampleRequirementDefinitionDto?.unit;
      const measuredText =
        measuredValue !== undefined && measuredValue !== null
          ? `${measuredValue} ${toText(measuredUnit, '').trim()}`.trim()
          : 'N/A';

      const isMatch = !!item?.isMatch;
      return {
        id: String(item?.id ?? `${index}`),
        characteristicName,
        expectedText: getExpectedValueText(requirement),
        measuredText,
        matchText: isMatch ? 'Đạt' : 'Không đạt',
        isMatch,
      };
    });
  }, [latestStage]);

  const latestImages = useMemo(() => {
    if (!latestStage) return [];

    const url = toText(latestStage?.latestImageUrl, '');
    if (!url) return [];

    return [
      {
        id: `${latestStage?.id || 'stage'}-latest-image`,
        url,
        label: `${toText(latestStage?.sampleStageDefinition?.name, 'Giai đoạn hiện tại')}`,
      },
    ];
  }, [latestStage]);

  const currentStageId = useMemo(() => toText(latestStage?.id, ''), [latestStage]);
  const currentStageStatus = useMemo(() => toText(latestStage?.status, ''), [latestStage?.status]);

  const canDestroySample = useMemo(() => {
    if (!sample) return false;
    const neverExecuted = !sample.executionDate;
    const stageInProgress = currentStageStatus === 'InProgressed';
    return neverExecuted && stageInProgress;
  }, [sample, currentStageStatus]);

  const mapUserName = useCallback(
    (userIdOrName: string) => {
      if (!userIdOrName) return 'N/A';
      return userMap.get(userIdOrName) ?? userIdOrName;
    },
    [userMap],
  );

  const filteredIncidents = useMemo(() => {
    if (!incidentFilterStatus) return incidents;
    return incidents.filter((item) => item.status === incidentFilterStatus);
  }, [incidentFilterStatus, incidents]);

  const fetchIncidents = useCallback(
    async (experimentLogId: string) => {
      if (!experimentLogId) {
        setIncidents([]);
        return;
      }

      setIncidentLoading(true);
      try {
        const queryBase = [`pageSize=${DISEASE_PAGE_SIZE}`, `experimentLogId=${encodeURIComponent(experimentLogId)}`];

        const json = await fetchJsonByFallback([
          `${cleanBaseUrl}/api/disease-incidents?pageNo=1&${queryBase.join('&')}`,
          `${cleanBaseUrl}/api/disease-incidents?pageNo=0&${queryBase.join('&')}`,
          `${cleanBaseUrl}/api/disease-incidents?experimentLogId=${encodeURIComponent(experimentLogId)}`,
        ]);

        setIncidents(normalizeDiseaseIncidents(json));
      } catch (e: any) {
        Alert.alert('Lỗi tải dữ liệu', String(e?.message || 'Không thể tải danh sách sự cố bệnh'));
      } finally {
        setIncidentLoading(false);
      }
    },
    [],
  );

  const fetchPageData = useCallback(async () => {
    if (!sampleId) {
      setError('Không tìm thấy sampleId để tải chi tiết mẫu vật.');
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const sampleRes = await fetch(`${cleanBaseUrl}/api/samples/${sampleId}`);

      if (!sampleRes.ok) {
        throw new Error(await parseErrorMessage(sampleRes, `Không thể tải chi tiết mẫu vật (HTTP ${sampleRes.status})`));
      }

      const sampleRaw = await sampleRes.text();

      const sampleData = normalizeSampleDetail(parseJsonSafely(sampleRaw));
      setSample(sampleData);

      try {
        const logsJson = await fetchJsonByFallback([
          `${cleanBaseUrl}/api/experiment-logs?pageNo=1&pageSize=200`,
          `${cleanBaseUrl}/api/experiment-logs?pageNo=0&pageSize=200`,
          `${cleanBaseUrl}/api/experiment-logs`,
        ]);
        setExperimentLogMap(normalizeExperimentLogMap(logsJson));
      } catch {
        setExperimentLogMap(new Map());
      }

      try {
        const usersJson = await fetchJsonByFallback([
          `${cleanBaseUrl}/api/user?pageNo=1&pageSize=200`,
          `${cleanBaseUrl}/api/user?pageNo=0&pageSize=200`,
          `${cleanBaseUrl}/api/user`,
        ]);
        setUserMap(normalizeUsersMap(usersJson));
      } catch {
        setUserMap(new Map());
      }

      if (sampleData.experimentLogId) {
        await fetchIncidents(sampleData.experimentLogId);
      } else {
        setIncidents([]);
      }
    } catch (e: any) {
      const message = String(e?.message || 'Không thể kết nối tới máy chủ');
      setError(message);
      Alert.alert('Lỗi tải dữ liệu', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchIncidents, sampleId]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPageData();
  };

  const pickImageAndAnalyze = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    });

    const asset = result.assets?.[0] ?? null;
    if (!asset?.uri) return;

    setSelectedImage(asset);
    setAnalyzing(true);

    try {
      const form = new FormData();
      form.append('image', {
        uri: asset.uri,
        name: asset.fileName || `analysis-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      } as any);

      const res = await fetch(`${cleanBaseUrl}/api/monitoring-log/analysis`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Phân tích AI thất bại (HTTP ${res.status})`));
      }

      const raw = await res.text();
      const json = parseJsonSafely(raw);
      const source = json?.data ?? json ?? {};
      const diseaseName = toText(source?.diseaseName ?? source?.disease?.name, 'Healthy');
      const confidenceRaw = source?.confidence ?? source?.aiConfidence ?? source?.percentage;
      const confidence = confidenceRaw === undefined || confidenceRaw === null ? null : Number(confidenceRaw);
      const isHealthy = String(diseaseName).trim().toLowerCase() === 'healthy';

      setAnalysis({
        diseaseName,
        confidence: Number.isNaN(confidence as number) ? null : confidence,
        isHealthy,
      });

      if (!isHealthy && currentStageId && sample?.experimentLogId) {
        await fetchIncidents(sample.experimentLogId);
      }
    } catch (e: any) {
      Alert.alert('Lỗi phân tích', String(e?.message || 'Không thể phân tích ảnh'));
    } finally {
      setAnalyzing(false);
    }
  };

  const reviewIncident = async (item: DiseaseIncidentItem, isConfirmed: boolean) => {
    const previous = incidents;
    const nextStatus = isConfirmed ? 'Confirmed' : 'Dismissed';
    const nextNote = isConfirmed ? 'Xác nhận bởi kỹ thuật viên.' : 'Loại bỏ bởi kỹ thuật viên.';

    setUpdatingIncidentId(item.id);
    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === item.id
          ? {
              ...incident,
              status: nextStatus,
              reviewNote: nextNote,
            }
          : incident,
      ),
    );

    try {
      const res = await fetch(`${cleanBaseUrl}/api/disease-incidents/${item.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isConfirmed,
          note: nextNote,
        }),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Cập nhật đánh giá thất bại (HTTP ${res.status})`));
      }

      if (sample?.experimentLogId) {
        await fetchIncidents(sample.experimentLogId);
      }
    } catch (e: any) {
      setIncidents(previous);
      Alert.alert('Lỗi cập nhật', String(e?.message || 'Không thể cập nhật trạng thái sự cố'));
    } finally {
      setUpdatingIncidentId('');
    }
  };

  const destroySample = async () => {
    const trimmedReason = deleteReason.trim();
    if (!trimmedReason) {
      Alert.alert('Thiếu lý do', 'Vui lòng nhập lý do tiêu hủy mẫu vật.');
      return;
    }

    if (!sampleId) return;

    setDeleting(true);
    try {
      const res = await fetch(`${cleanBaseUrl}/api/samples/${sampleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: trimmedReason }),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Tiêu hủy mẫu vật thất bại (HTTP ${res.status})`));
      }

      setDeleteModalVisible(false);
      setDeleteReason('');
      Alert.alert('Thành công', 'Mẫu vật đã được tiêu hủy do bệnh.');
      fetchPageData();
    } catch (e: any) {
      Alert.alert('Lỗi thao tác', String(e?.message || 'Không thể tiêu hủy mẫu vật'));
    } finally {
      setDeleting(false);
    }
  };

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
            <TouchableOpacity style={styles.primaryButton} onPress={fetchPageData}>
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const createdByName = sample ? mapUserName(sample.createdBy) : 'N/A';
  const updatedByName = sample ? mapUserName(sample.updatedBy) : 'N/A';
  const experimentLogName = sample
    ? experimentLogMap.get(sample.experimentLogId) ?? sample.experimentLogId ?? 'N/A'
    : 'N/A';

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
        <Text style={styles.headerTitle}>Chi tiết mẫu vật</Text>
        <View style={styles.backButton} pointerEvents="none" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1F3D2F" />
        </View>
      ) : error && !sample ? (
        renderErrorFallback()
      ) : sample ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F3D2F" />}
          showsVerticalScrollIndicator={false}
        >
          <SampleInfo
            sample={sample}
            currentStageLabel={currentStageLabel}
            createdByName={createdByName}
            updatedByName={updatedByName}
            experimentLogName={experimentLogName}
          />

          <StageProgress rows={stageProgressRows} />
          <ReportTable rows={reportRows} />
          <ImageGallery images={latestImages} />

          <AnalysisSection
            selectedImage={selectedImage}
            analysis={analysis}
            analyzing={analyzing}
            onPickImage={pickImageAndAnalyze}
          />

          <DiseaseIncidentList
            incidents={filteredIncidents}
            filterStatus={incidentFilterStatus}
            onChangeFilter={setIncidentFilterStatus}
            onReview={reviewIncident}
            updatingIncidentId={updatingIncidentId}
          />

          {incidentLoading ? (
            <SectionCard title="Đồng bộ dữ liệu sự cố">
              <Text style={styles.mutedText}>Đang tải danh sách sự cố bệnh...</Text>
            </SectionCard>
          ) : null}

          <SectionCard title="Hành động">
            <TouchableOpacity
              style={[styles.dangerButton, !canDestroySample && styles.dangerButtonDisabled]}
              activeOpacity={0.85}
              disabled={!canDestroySample}
              onPress={() => setDeleteModalVisible(true)}
            >
              <Text style={styles.dangerButtonText}>Tiêu hủy mẫu vật</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Điều kiện: mẫu chưa bị tiêu hủy trước đó và trạng thái giai đoạn hiện tại là Đang thực hiện.
            </Text>
          </SectionCard>
        </ScrollView>
      ) : null}

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Xác nhận tiêu hủy mẫu vật</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lý do tiêu hủy"
              placeholderTextColor="#6F857A"
              value={deleteReason}
              onChangeText={setDeleteReason}
              multiline
              editable={!deleting}
            />

            <View style={styles.modalActions}>
              <View style={styles.actionHalf}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (deleting) return;
                    setDeleteModalVisible(false);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Hủy</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionHalf}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.primaryDangerButton]}
                  activeOpacity={0.85}
                  onPress={destroySample}
                  disabled={deleting}
                >
                  <Text style={styles.primaryButtonText}>{deleting ? 'Đang xử lý...' : 'Xác nhận'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default SampleDetailScreen;
