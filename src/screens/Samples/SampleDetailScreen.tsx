/* eslint-disable react-native/no-inline-styles */
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

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

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

/** Full analysis response — matches the web AnalysisResponse shape */
interface AnalysisResponse {
  stageName: string;
  disease: {
    name: string;
    code: string;
    description: string;
  };
  analyticResult: Record<string, number>;
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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
    sampleStageDto: Array.isArray(source?.sampleStageDto) ? source.sampleStageDto : [],
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

const canReviewIncident = (status?: string) =>
  status === 'AIDetected' || status === 'UnderReview';

/** Matches the web isHealthyAnalysis logic exactly */
const computeIsHealthy = (result: AnalysisResponse): boolean => {
  const diseaseCode = (result.disease?.code ?? '').toLowerCase();
  const diseaseName = (result.disease?.name ?? '').toLowerCase();
  if (
    diseaseCode.includes('healthy') ||
    diseaseName.includes('healthy') ||
    diseaseName.includes('khỏe')
  ) {
    return true;
  }
  const analyticResult = result.analyticResult ?? {};
  const nonHealthyValues = Object.entries(analyticResult)
    .filter(([key]) => key !== 'healthy')
    .map(([, value]) => value as number);
  const maxNonHealthy = nonHealthyValues.length > 0 ? Math.max(...nonHealthyValues) : 0;
  return (analyticResult.healthy ?? 0) >= maxNonHealthy;
};

const STAGE_NAME_MAP: Record<string, string> = {
  coppice: 'Chồi',
  tissue: 'Mầm',
  tree: 'Cây hoàn chỉnh',
};

const ANALYTIC_LABELS: { key: string; label: string }[] = [
  { key: 'healthy', label: 'Khỏe mạnh' },
  { key: 'anthracnose', label: 'Thán thư' },
  { key: 'bacterialWilt', label: 'Héo vi khuẩn' },
  { key: 'blackrot', label: 'Thối đen' },
  { key: 'brownspots', label: 'Đốm nâu' },
  { key: 'moldBacterial', label: 'Mốc vi khuẩn' },
  { key: 'moldFungus', label: 'Mốc nấm' },
  { key: 'softRot', label: 'Thối mềm' },
  { key: 'stemRot', label: 'Thối thân' },
  { key: 'witheredYellowRoot', label: 'Héo vàng rễ' },
  { key: 'oxidation', label: 'Oxy hóa' },
  { key: 'virus', label: 'Virus' },
];

// ─────────────────────────────────────────────
// Reusable sub-components (stateless)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Analysis section (upload button + image preview only)
// Full result now shown in AnalysisModal
// ─────────────────────────────────────────────

const AnalysisUploadSection = ({
  selectedImage,
  analyzing,
  onPickImage,
}: {
  selectedImage: Asset | null;
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
      <Text style={styles.uploadButtonText}>
        {analyzing ? 'Đang phân tích...' : 'Tải ảnh để phân tích bệnh'}
      </Text>
    </TouchableOpacity>
    {selectedImage?.uri ? (
      <Image source={{ uri: selectedImage.uri }} style={styles.analysisPreview} />
    ) : null}
  </SectionCard>
);

// ─────────────────────────────────────────────
// Disease Incident List
// ─────────────────────────────────────────────

const DiseaseIncidentList = ({
  incidents,
  filterStatus,
  onChangeFilter,
  onOpenReview,
  updatingIncidentId,
}: {
  incidents: DiseaseIncidentItem[];
  filterStatus: string;
  onChangeFilter: (status: string) => void;
  /** Opens the review modal instead of directly calling API */
  onOpenReview: (item: DiseaseIncidentItem) => void;
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
          const confidencePct =
            item.aiConfidence !== null
              ? `${(item.aiConfidence > 1 ? item.aiConfidence : item.aiConfidence * 100).toFixed(1)}%`
              : 'N/A';

          return (
            <View key={item.id} style={styles.incidentItem}>
              <View style={styles.incidentTop}>
                <Text style={styles.incidentName} numberOfLines={1}>
                  {item.diseaseName}
                </Text>
                <View style={[styles.incidentStatusBadge, getIncidentStatusStyle(item.status)]}>
                  <Text style={styles.incidentStatusText}>
                    {translateDiseaseIncidentStatusVi(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.incidentMeta}>
                AI confidence: {confidencePct}
              </Text>
              <Text style={styles.incidentMeta}>
                Ghi chú: {toText(item.reviewNote, 'Chưa có ghi chú')}
              </Text>

              {allowReview ? (
                <View style={styles.incidentActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => onOpenReview(item)}
                    activeOpacity={0.85}
                    disabled={reviewing}
                  >
                    <Text style={styles.actionButtonText}>
                      {reviewing ? 'Đang xử lý...' : 'Xem xét'}
                    </Text>
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

// ─────────────────────────────────────────────
// Modal: Full AI Analysis Result
// ─────────────────────────────────────────────

const AnalysisModal = ({
  visible,
  analysisResult,
  isHealthy,
  onClose,
  onDestroy,
  isDestroying,
}: {
  visible: boolean;
  analysisResult: AnalysisResponse | null;
  isHealthy: boolean;
  onClose: () => void;
  onDestroy: (reason: string) => Promise<void>;
  isDestroying: boolean;
}) => {
  const [showDestroyForm, setShowDestroyForm] = useState(false);
  const [destroyReason, setDestroyReason] = useState('');

  // Reset inner state each time modal opens
  useEffect(() => {
    if (visible) {
      setShowDestroyForm(false);
      setDestroyReason('');
    }
  }, [visible]);

  if (!analysisResult) return null;

  const stageName =
    STAGE_NAME_MAP[analysisResult.stageName] ?? analysisResult.stageName ?? 'N/A';

  const handleConfirmDestroy = async () => {
    const finalReason =
      destroyReason.trim() ||
      `Mẫu vật nhiễm ${analysisResult.disease?.name ?? 'bệnh không xác định'}`;
    await onDestroy(finalReason);
    setShowDestroyForm(false);
    setDestroyReason('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.sheetHeader}>
            <Text style={modalStyles.sheetTitle}>Kết quả phân tích AI</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={modalStyles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={modalStyles.sheetBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Summary row */}
            <View style={modalStyles.summaryRow}>
              <View style={modalStyles.summaryCell}>
                <Text style={modalStyles.summaryLabel}>Giai đoạn</Text>
                <Text style={modalStyles.summaryValue}>{stageName}</Text>
              </View>
              <View style={[modalStyles.summaryCell, { borderLeftWidth: 1, borderLeftColor: '#E6ECE6' }]}>
                <Text style={modalStyles.summaryLabel}>Tên bệnh</Text>
                <Text style={[modalStyles.summaryValue, { color: isHealthy ? '#2C7A46' : '#B14C4C' }]}>
                  {analysisResult.disease?.name ?? 'N/A'}
                </Text>
              </View>
            </View>

            {/* Disease description */}
            {!!analysisResult.disease?.description && (
              <View style={modalStyles.descBox}>
                <Text style={modalStyles.descLabel}>Mô tả bệnh</Text>
                <Text style={modalStyles.descText}>{analysisResult.disease.description}</Text>
              </View>
            )}

            {/* Healthy badge */}
            <View
              style={[
                modalStyles.healthBadge,
                isHealthy ? modalStyles.healthBadgeGreen : modalStyles.healthBadgeRed,
              ]}
            >
              <Text style={modalStyles.healthBadgeText}>
                {isHealthy ? '✓ Mẫu khỏe mạnh' : '✗ Phát hiện dấu hiệu bệnh'}
              </Text>
            </View>

            {/* Detailed analytic result */}
            <Text style={modalStyles.subTitle}>Kết quả phân tích chi tiết</Text>
            <View style={modalStyles.analyticGrid}>
              {ANALYTIC_LABELS.map(({ key, label }) => {
                const raw = analysisResult.analyticResult?.[key] ?? 0;
                // API may return 0–1 or 0–100; normalise to 0–100
                const pct = raw <= 1 ? raw * 100 : raw;
                const isHighlight = key !== 'healthy' && pct >= 50;
                return (
                  <View key={key} style={modalStyles.analyticItem}>
                    <Text style={modalStyles.analyticLabel}>{label}</Text>
                    <Text
                      style={[
                        modalStyles.analyticPct,
                        isHighlight && { color: '#B14C4C', fontWeight: '900' },
                        key === 'healthy' && { color: '#2C7A46' },
                      ]}
                    >
                      {pct.toFixed(1)}%
                    </Text>
                    {/* Mini progress bar */}
                    <View style={modalStyles.barTrack}>
                      <View
                        style={[
                          modalStyles.barFill,
                          {
                            width: `${Math.min(pct, 100)}%` as any,
                            backgroundColor:
                              key === 'healthy'
                                ? '#2C7A46'
                                : isHighlight
                                ? '#B14C4C'
                                : '#B0C4B4',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Destroy section — only when disease detected */}
            {!isHealthy && (
              <View style={modalStyles.destroyBox}>
                <Text style={modalStyles.destroyWarning}>
                  Mẫu vật có dấu hiệu bệnh. Bạn có thể tiêu hủy mẫu vật này.
                </Text>

                {!showDestroyForm ? (
                  <TouchableOpacity
                    style={modalStyles.destroyBtn}
                    activeOpacity={0.85}
                    onPress={() => setShowDestroyForm(true)}
                  >
                    <Text style={modalStyles.destroyBtnText}>Tiêu hủy mẫu vật</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Text style={modalStyles.destroyReasonLabel}>
                      Lý do tiêu hủy (có thể để trống)
                    </Text>
                    <TextInput
                      style={modalStyles.destroyInput}
                      placeholder={`Mặc định: Mẫu vật nhiễm ${analysisResult.disease?.name ?? ''}`}
                      placeholderTextColor="#9EB09F"
                      value={destroyReason}
                      onChangeText={setDestroyReason}
                      multiline
                      editable={!isDestroying}
                    />
                    <View style={modalStyles.destroyActions}>
                      <TouchableOpacity
                        style={[modalStyles.destroyActionBtn, { backgroundColor: '#E8EFE8', flex: 1 }]}
                        onPress={() => {
                          setShowDestroyForm(false);
                          setDestroyReason('');
                        }}
                        disabled={isDestroying}
                        activeOpacity={0.85}
                      >
                        <Text style={{ color: '#1F3D2F', fontWeight: '700', fontSize: 13 }}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[modalStyles.destroyActionBtn, { backgroundColor: '#A33D3D', flex: 1 }]}
                        onPress={handleConfirmDestroy}
                        disabled={isDestroying}
                        activeOpacity={0.85}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                          {isDestroying ? 'Đang xử lý...' : 'Xác nhận tiêu hủy'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={modalStyles.sheetFooter}>
            <TouchableOpacity style={modalStyles.closeFooterBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={modalStyles.closeFooterBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Modal: Review Disease Incident
// ─────────────────────────────────────────────

const ReviewIncidentModal = ({
  incident,
  visible,
  onClose,
  onSubmit,
  submitting,
}: {
  incident: DiseaseIncidentItem | null;
  visible: boolean;
  onClose: () => void;
  onSubmit: (isConfirmed: boolean, note: string) => Promise<void>;
  submitting: boolean;
}) => {
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [note, setNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (visible) {
      setIsConfirmed(true);
      setNote('');
      setReviewError('');
    }
  }, [visible]);

  if (!incident) return null;

  const confidencePct =
    incident.aiConfidence !== null
      ? `${(incident.aiConfidence > 1 ? incident.aiConfidence : incident.aiConfidence * 100).toFixed(1)}%`
      : 'N/A';

  const handleSubmit = async () => {
    setReviewError('');
    try {
      await onSubmit(isConfirmed, note.trim());
    } catch {
      setReviewError('Không thể cập nhật trạng thái sự cố. Vui lòng thử lại.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.modalTitle}>Xem xét sự cố bệnh</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 18, color: '#4F6658', fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Incident summary */}
          <View style={reviewModalStyles.summaryBox}>
            <Text style={reviewModalStyles.summaryText}>
              <Text style={{ fontWeight: '800' }}>Tên mẫu: </Text>
              {incident.sampleName || 'N/A'}
            </Text>
            <Text style={reviewModalStyles.summaryText}>
              <Text style={{ fontWeight: '800' }}>Tên bệnh: </Text>
              {incident.diseaseName}
            </Text>
            <Text style={reviewModalStyles.summaryText}>
              <Text style={{ fontWeight: '800' }}>AI confidence: </Text>
              {confidencePct}
            </Text>
          </View>

          {/* Decision radio */}
          <Text style={reviewModalStyles.fieldLabel}>Quyết định xem xét</Text>
          <TouchableOpacity
            style={reviewModalStyles.radioRow}
            onPress={() => setIsConfirmed(true)}
            activeOpacity={0.8}
          >
            <View style={[reviewModalStyles.radioOuter, isConfirmed && reviewModalStyles.radioOuterActive]}>
              {isConfirmed ? <View style={reviewModalStyles.radioInner} /> : null}
            </View>
            <Text style={reviewModalStyles.radioLabel}>Xác nhận — mẫu nhiễm bệnh thực sự</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={reviewModalStyles.radioRow}
            onPress={() => setIsConfirmed(false)}
            activeOpacity={0.8}
          >
            <View style={[reviewModalStyles.radioOuter, !isConfirmed && reviewModalStyles.radioOuterActive]}>
              {!isConfirmed ? <View style={reviewModalStyles.radioInner} /> : null}
            </View>
            <Text style={reviewModalStyles.radioLabel}>Loại bỏ — AI phát hiện nhầm</Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={[reviewModalStyles.fieldLabel, { marginTop: 12 }]}>Ghi chú (tuỳ chọn)</Text>
          <TextInput
            style={[styles.input, { minHeight: 72, marginBottom: 4 }]}
            placeholder="Nhập ghi chú xem xét..."
            placeholderTextColor="#6F857A"
            value={note}
            onChangeText={setNote}
            multiline
            editable={!submitting}
          />

          {!!reviewError && (
            <Text style={{ color: '#B14C4C', fontSize: 12, marginBottom: 6, fontWeight: '600' }}>
              {reviewError}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.modalActions}>
            <View style={styles.actionHalf}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onClose}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Hủy</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionHalf}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? 'Đang xử lý...' : 'Gửi xem xét'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%' as any,
    flexShrink: 1,
    overflow: 'hidden' as const,
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0EC',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900' as const,
    color: '#1F3D2F',
  },
  closeBtn: {
    fontSize: 18,
    color: '#4F6658',
    fontWeight: '700' as const,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#ECF0EC',
  },
  closeFooterBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8EFE8',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  closeFooterBtnText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1F3D2F',
  },
  summaryRow: {
    flexDirection: 'row' as const,
    borderWidth: 1,
    borderColor: '#E6ECE6',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden' as const,
    backgroundColor: '#F6FAF6',
  },
  summaryCell: {
    flex: 1,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#4F6658',
    fontWeight: '700' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#1F3D2F',
  },
  descBox: {
    borderRadius: 12,
    backgroundColor: '#F2F6F2',
    padding: 12,
    marginBottom: 12,
  },
  descLabel: {
    fontSize: 11,
    color: '#4F6658',
    fontWeight: '700' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#1F3D2F',
    fontWeight: '600' as const,
  },
  healthBadge: {
    alignSelf: 'flex-start' as const,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 16,
  },
  healthBadgeGreen: {
    backgroundColor: '#A3F7BF',
  },
  healthBadgeRed: {
    backgroundColor: '#FFEAEA',
  },
  healthBadgeText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#1F3D2F',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#1F3D2F',
    marginBottom: 10,
  },
  analyticGrid: {
    gap: 6,
    marginBottom: 16,
  },
  analyticItem: {
    backgroundColor: '#F6FAF6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  analyticLabel: {
    fontSize: 12,
    color: '#4F6658',
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  analyticPct: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1F3D2F',
    marginBottom: 4,
  },
  barTrack: {
    height: 4,
    backgroundColor: '#E8EFE8',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  destroyBox: {
    borderWidth: 1,
    borderColor: '#F0C4C4',
    backgroundColor: '#FFF6F6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  destroyWarning: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A2E2E',
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  destroyBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#A33D3D',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  destroyBtnText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  destroyReasonLabel: {
    fontSize: 12,
    color: '#4F6658',
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  destroyInput: {
    borderWidth: 1,
    borderColor: '#E2EAE2',
    borderRadius: 10,
    backgroundColor: '#FAFCFA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F3D2F',
    fontWeight: '600' as const,
    minHeight: 72,
    textAlignVertical: 'top' as const,
    marginBottom: 8,
  },
  destroyActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  destroyActionBtn: {
    height: 38,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};

const reviewModalStyles = {
  summaryBox: {
    backgroundColor: '#F6FAF6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1F3D2F',
    fontWeight: '600' as const,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#1F3D2F',
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
    marginBottom: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#B0C4B4',
    marginTop: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  radioOuterActive: {
    borderColor: '#1F3D2F',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1F3D2F',
  },
  radioLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#1F3D2F',
    fontWeight: '600' as const,
  },
};

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

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

  // AI analysis
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [destroyingFromAnalysis, setDestroyingFromAnalysis] = useState(false);

  // Disease incidents
  const [incidentFilterStatus, setIncidentFilterStatus] = useState('');
  const [incidents, setIncidents] = useState<DiseaseIncidentItem[]>([]);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [updatingIncidentId, setUpdatingIncidentId] = useState('');

  // Review incident modal
  const [reviewingIncident, setReviewingIncident] = useState<DiseaseIncidentItem | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Destroy sample modal (manual, by condition)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Confirmed-incident delete modal
  const [showConfirmDeleteByIncident, setShowConfirmDeleteByIncident] = useState(false);
  const [deleteReasonByIncident, setDeleteReasonByIncident] = useState('');
  const [deletingByIncident, setDeletingByIncident] = useState(false);

  // ── Derived values ──────────────────────────

  const isHealthy = useMemo(() => {
    if (!analysisResult) return true;
    return computeIsHealthy(analysisResult);
  }, [analysisResult]);

  const hasConfirmedIncident = useMemo(
    () => incidents.some((inc) => inc.status === 'Confirmed'),
    [incidents],
  );

  const stageProgressRows = useMemo<StageProgressRow[]>(() => {
    if (!sample) return [];
    const stageRows = [...(sample.sampleStageDto ?? [])]
      .sort(
        (a, b) =>
          Number(a?.sampleStageDefinition?.order ?? 0) -
          Number(b?.sampleStageDefinition?.order ?? 0),
      )
      .map((item) => ({
        id: String(item?.id ?? `${item?.sampleStageDefinition?.order ?? 0}`),
        stageName: toText(item?.sampleStageDefinition?.name, 'N/A'),
        stageOrder: Number(item?.sampleStageDefinition?.order ?? 0),
        status: toText(item?.status, ''),
        startAt: toText(item?.startAt, ''),
        isCurrent: false,
      }));

    const currentLower = sample.currentSampleStage.trim().toLowerCase();
    let currentIndex = stageRows.findIndex(
      (item) => item.stageName.trim().toLowerCase() === currentLower,
    );
    if (currentIndex < 0)
      currentIndex = stageRows.findIndex((item) => item.status === 'InProgressed');
    if (currentIndex < 0 && stageRows.length > 0) currentIndex = stageRows.length - 1;

    return stageRows.map((item, index) => ({ ...item, isCurrent: index === currentIndex }));
  }, [sample]);

  const latestStage = useMemo(() => {
    if (!sample) return null;
    const byOrder = [...(sample.sampleStageDto ?? [])].sort(
      (a, b) =>
        Number(a?.sampleStageDefinition?.order ?? 0) -
        Number(b?.sampleStageDefinition?.order ?? 0),
    );
    const currentLower = sample.currentSampleStage.trim().toLowerCase();
    let stage = byOrder.find(
      (item) =>
        String(item?.sampleStageDefinition?.name ?? '').trim().toLowerCase() === currentLower,
    );
    if (!stage) stage = byOrder.find((item) => item?.status === 'InProgressed');
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
        requirement?.sampleRequirementDefinitionDto?.name || `Chỉ tiêu ${index + 1}`;
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

  // ── Data fetching ───────────────────────────

  const fetchIncidents = useCallback(async (experimentLogId: string) => {
    if (!experimentLogId) {
      setIncidents([]);
      return;
    }
    setIncidentLoading(true);
    try {
      const queryBase = [
        `pageSize=${DISEASE_PAGE_SIZE}`,
        `experimentLogId=${encodeURIComponent(experimentLogId)}`,
      ];
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
  }, []);

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
        throw new Error(
          await parseErrorMessage(
            sampleRes,
            `Không thể tải chi tiết mẫu vật (HTTP ${sampleRes.status})`,
          ),
        );
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

  // ── Actions ─────────────────────────────────

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
    setAnalysisResult(null);

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
        throw new Error(
          await parseErrorMessage(res, `Phân tích AI thất bại (HTTP ${res.status})`),
        );
      }

      const raw = await res.text();
      const json = parseJsonSafely(raw);
      const source = json?.data ?? json ?? {};

      // Build full AnalysisResponse matching the web shape
      const normalized: AnalysisResponse = {
        stageName: toText(source?.stageName, ''),
        disease: {
          name: toText(source?.disease?.name ?? source?.diseaseName, 'Không xác định'),
          code: toText(source?.disease?.code ?? source?.diseaseCode, ''),
          description: toText(source?.disease?.description, ''),
        },
        analyticResult: source?.analyticResult ?? {},
      };

      setAnalysisResult(normalized);
      setShowAnalysisModal(true);

      // If disease found, refresh incidents
      const healthy = computeIsHealthy(normalized);
      if (!healthy && sample?.experimentLogId) {
        await fetchIncidents(sample.experimentLogId);
      }
    } catch (e: any) {
      Alert.alert('Lỗi phân tích', String(e?.message || 'Không thể phân tích ảnh'));
    } finally {
      setAnalyzing(false);
    }
  };

  const destroyFromAnalysis = async (reason: string) => {
    if (!sampleId) return;
    setDestroyingFromAnalysis(true);
    try {
      const res = await fetch(`${cleanBaseUrl}/api/samples/${sampleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        throw new Error(
          await parseErrorMessage(res, `Tiêu hủy mẫu vật thất bại (HTTP ${res.status})`),
        );
      }
      setShowAnalysisModal(false);
      Alert.alert('Thành công', 'Mẫu vật đã được tiêu hủy do bệnh.');
      fetchPageData();
    } catch (e: any) {
      Alert.alert('Lỗi thao tác', String(e?.message || 'Không thể tiêu hủy mẫu vật'));
      throw e; // Let modal handle UI reset
    } finally {
      setDestroyingFromAnalysis(false);
    }
  };

  const submitReview = async (isConfirmed: boolean, note: string) => {
    if (!reviewingIncident) return;
    const incidentId = reviewingIncident.id;
    setUpdatingIncidentId(incidentId);
    setReviewSubmitting(true);

    try {
      const nextStatus = isConfirmed ? 'Confirmed' : 'Dismissed';
      const nextNote =
        note || (isConfirmed ? 'Xác nhận bởi kỹ thuật viên.' : 'Loại bỏ bởi kỹ thuật viên.');

      // Optimistic update
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId ? { ...inc, status: nextStatus, reviewNote: nextNote } : inc,
        ),
      );

      const res = await fetch(`${cleanBaseUrl}/api/disease-incidents/${incidentId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isConfirmed, note: nextNote }),
      });

      if (!res.ok) {
        throw new Error(
          await parseErrorMessage(res, `Cập nhật đánh giá thất bại (HTTP ${res.status})`),
        );
      }

      setReviewingIncident(null);
      if (sample?.experimentLogId) {
        await fetchIncidents(sample.experimentLogId);
      }
    } catch (e: any) {
      // Revert on failure
      if (sample?.experimentLogId) await fetchIncidents(sample.experimentLogId);
      throw e;
    } finally {
      setReviewSubmitting(false);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmedReason }),
      });
      if (!res.ok) {
        throw new Error(
          await parseErrorMessage(res, `Tiêu hủy mẫu vật thất bại (HTTP ${res.status})`),
        );
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

  const destroySampleByConfirmedIncident = async () => {
    if (!sampleId) return;
    setDeletingByIncident(true);
    try {
      const res = await fetch(`${cleanBaseUrl}/api/samples/${sampleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: deleteReasonByIncident.trim() || 'Mẫu vật có sự cố bệnh đã được xác nhận.',
        }),
      });
      if (!res.ok) {
        throw new Error(
          await parseErrorMessage(res, `Tiêu hủy mẫu vật thất bại (HTTP ${res.status})`),
        );
      }
      setShowConfirmDeleteByIncident(false);
      setDeleteReasonByIncident('');
      Alert.alert('Thành công', 'Mẫu vật đã được tiêu hủy.');
      fetchPageData();
    } catch (e: any) {
      Alert.alert('Lỗi thao tác', String(e?.message || 'Không thể tiêu hủy mẫu vật'));
    } finally {
      setDeletingByIncident(false);
    }
  };

  // ── Error fallback ───────────────────────────

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

  // ── Derived display values ───────────────────

  const createdByName = sample ? mapUserName(sample.createdBy) : 'N/A';
  const updatedByName = sample ? mapUserName(sample.updatedBy) : 'N/A';
  const experimentLogName = sample
    ? experimentLogMap.get(sample.experimentLogId) ?? sample.experimentLogId ?? 'N/A'
    : 'N/A';

  // ── Render ───────────────────────────────────

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ArrowLeft size={18} color="#1F3D2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết mẫu vật</Text>
        <View style={{ width: 36 }} pointerEvents="none" />
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F3D2F" />
          }
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

          <AnalysisUploadSection
            selectedImage={selectedImage}
            analyzing={analyzing}
            onPickImage={pickImageAndAnalyze}
          />

          <DiseaseIncidentList
            incidents={filteredIncidents}
            filterStatus={incidentFilterStatus}
            onChangeFilter={setIncidentFilterStatus}
            onOpenReview={(item) => setReviewingIncident(item)}
            updatingIncidentId={updatingIncidentId}
          />

          {incidentLoading ? (
            <SectionCard title="Đồng bộ dữ liệu sự cố">
              <Text style={styles.mutedText}>Đang tải danh sách sự cố bệnh...</Text>
            </SectionCard>
          ) : null}

          <SectionCard title="Hành động">
            {/* Destroy button — confirmed incident path */}
            {hasConfirmedIncident && (
              <>
                <TouchableOpacity
                  style={[styles.dangerButton, { marginBottom: 8 }]}
                  activeOpacity={0.85}
                  onPress={() => setShowConfirmDeleteByIncident(true)}
                >
                  <Text style={styles.dangerButtonText}>Tiêu hủy (sự cố đã xác nhận)</Text>
                </TouchableOpacity>
                <Text style={[styles.helperText, { marginBottom: 14 }]}>
                  Có ít nhất một sự cố bệnh đã được xác nhận. Bạn có thể tiêu hủy mẫu vật.
                </Text>
              </>
            )}

            {/* Destroy button — manual condition path */}
            <TouchableOpacity
              style={[styles.dangerButton, !canDestroySample && styles.dangerButtonDisabled]}
              activeOpacity={0.85}
              disabled={!canDestroySample}
              onPress={() => setDeleteModalVisible(true)}
            >
              <Text style={styles.dangerButtonText}>Tiêu hủy mẫu vật</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Điều kiện: mẫu chưa bị tiêu hủy trước đó và trạng thái giai đoạn hiện tại là Đang
              thực hiện.
            </Text>
          </SectionCard>
        </ScrollView>
      ) : null}

      {/* ── Modals ── */}

      {/* AI Analysis Result Modal */}
      <AnalysisModal
        visible={showAnalysisModal}
        analysisResult={analysisResult}
        isHealthy={isHealthy}
        onClose={() => setShowAnalysisModal(false)}
        onDestroy={destroyFromAnalysis}
        isDestroying={destroyingFromAnalysis}
      />

      {/* Review Incident Modal */}
      <ReviewIncidentModal
        visible={!!reviewingIncident}
        incident={reviewingIncident}
        onClose={() => {
          if (!reviewSubmitting) setReviewingIncident(null);
        }}
        onSubmit={submitReview}
        submitting={reviewSubmitting}
      />

      {/* Confirmed-incident destroy modal */}
      <Modal
        visible={showConfirmDeleteByIncident}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmDeleteByIncident(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tiêu hủy mẫu vật (sự cố đã xác nhận)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập lý do tiêu hủy (tuỳ chọn)"
              placeholderTextColor="#6F857A"
              value={deleteReasonByIncident}
              onChangeText={setDeleteReasonByIncident}
              multiline
              editable={!deletingByIncident}
            />
            <View style={styles.modalActions}>
              <View style={styles.actionHalf}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (deletingByIncident) return;
                    setShowConfirmDeleteByIncident(false);
                    setDeleteReasonByIncident('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Hủy</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actionHalf}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.primaryDangerButton]}
                  activeOpacity={0.85}
                  onPress={destroySampleByConfirmedIncident}
                  disabled={deletingByIncident}
                >
                  <Text style={styles.primaryButtonText}>
                    {deletingByIncident ? 'Đang xử lý...' : 'Xác nhận'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual destroy modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
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
                  <Text style={styles.primaryButtonText}>
                    {deleting ? 'Đang xử lý...' : 'Xác nhận'}
                  </Text>
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