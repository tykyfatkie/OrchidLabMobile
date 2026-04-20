/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { ArrowLeft, AlertCircle, CheckCircle2, FileText } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL } from '@env';

import { CustomTabBar } from '../../components/CustomTabBar';
import { translateStatusVi } from '../../utils/statusTranslations';
import { experimentLogDetailStyles as styles } from './experimentLogDetailStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cleanBaseUrl = String(API_URL).trim().replace(/\/+$/, '');

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem('@access_token'); 
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
};

interface TraitItem {
  id?: string;
  name?: string;
  value?: string | number | null;
  unit?: string | null;
}

interface Chemical {
  id?: string;
  name?: string;
  concentrationUnit?: string | null;
  category?: string | null;
}

interface Material {
  id?: string;
  name?: string;
  unit?: string | null;
  category?: string | null;
}

interface StageChemical {
  chemical?: Chemical;
}

interface StageMaterial {
  material?: Material;
}

interface StageSystemItem {
  id?: string;
  name?: string;
  unit?: string | null;
  concentrationUnit?: string | null;
}

interface MethodStage {
  id?: string;
  order?: number;
  durationDays?: number;
  durationsDays?: number;
  stageDefinition?: {
    name?: string;
    description?: string;
  } | null;
  materials?: StageSystemItem[];
  chemicals?: StageSystemItem[];
  stageChemicals?: StageChemical[];
  stageMaterials?: StageMaterial[];
  isSampleGenerated?: boolean;
}

interface ExperimentMethod {
  name?: string;
  description?: string;
  totalDurationDays?: number;
  methodStages?: MethodStage[];
}

interface BatchSize {
  width?: number | null;
  height?: number | null;
  unit?: string | null;
}

interface SampleItem {
  id?: string;
  name?: string;
  currentSampleStage?: string;
  status?: string;
  executionDate?: string | null;
  notes?: string | null;
}

interface ExperimentLogDetail {
  id?: string;
  name?: string;
  status?: string;
  batchId?: number;
  currentStageOrder?: number | null;
  assignedTo?: string;
  createdBy?: string;
  startDate?: string | null;
  endDate?: string | null;
  batchName?: string;
  labRoomName?: string;
  objective?: string;
  notes?: string;
  reason?: string | null;
  localName?: string;
  scientificName?: string;
  description?: string;
  parentALocalName?: string;
  parentAScientificName?: string;
  traits?: TraitItem[];
  method?: ExperimentMethod;
  batchSize?: BatchSize | null;
  batchStatus?: string;
  samples?: SampleItem[];
  conclusion?: string;
  issues?: string;
  recommendations?: string;
  expectedSampleCount?: number;
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

const normalizeStatus = (status?: string) => String(status ?? '').toLowerCase();

const getStatusStyle = (status?: string) => {
  const n = normalizeStatus(status);

  if (['completedintime', 'completedouttime', 'approved', 'done', 'completed'].includes(n)) {
    return styles.statusDone;
  }
  if (['inprogress', 'assigned'].includes(n)) {
    return styles.statusInProgress;
  }
  if (['waitingforapproval', 'waitingforchangestage'].includes(n)) {
    return styles.statusWaiting;
  }
  if (['created', 'template', 'pending'].includes(n)) {
    return styles.statusCreated;
  }
  if (['destroyed', 'failed', 'cancelled'].includes(n)) {
    return styles.statusDestroyed;
  }
  return styles.statusDefault;
};

const normalizeExperimentLog = (raw: any): ExperimentLogDetail => {
  const source = raw?.data ?? raw ?? {};
  const seedling = source.seedling ?? {};
  const method = source.method ?? {};
  const batch = source.batch ?? {};

  const methodStages = (method.methodStages ?? source.methodStages ?? []).map((stage: any) => ({
    id: stage.id,
    order: stage.order,
    durationDays: stage.durationsDays ?? stage.durationDays,
    durationsDays: stage.durationsDays ?? stage.durationDays,
    stageDefinition: {
      name: stage.stageDefinition?.name,
      description: stage.stageDefinition?.description,
    },
    materials: stage.materials ?? [],
    chemicals: stage.chemicals ?? [],
    stageChemicals: stage.stageChemicals ?? [],
    stageMaterials: stage.stageMaterials ?? [],
    isSampleGenerated: stage.isSampleGenerated ?? false,
  }));

  return {
    id: source.id,
    name: source.name,
    status: source.status,
    batchId: source.batchId ?? batch.id ?? null,
    currentStageOrder: source.currentStageOrder ?? method.currentStageOrder ?? null,
    assignedTo: source.assignedTo ?? source.assignedToName,
    createdBy: source.createdBy ?? source.create_by,
    startDate: source.startDate,
    endDate: source.endDate,
    batchName: source.batchName ?? batch.name ?? batch.batchName,
    labRoomName: source.labRoomName ?? batch.labRoomName,
    objective: source.objective,
    notes: source.notes,
    reason: source.reason,
    localName: source.localName ?? seedling.localName,
    scientificName: source.scientificName ?? seedling.scientificName,
    description: source.description ?? seedling.description,
    parentALocalName: source.parentALocalName ?? seedling.parentALocalName,
    parentAScientificName: source.parentAScientificName ?? seedling.parentAScientificName,
    traits: source.traits ?? seedling.traits ?? [],
    method: {
      name: method.name,
      description: method.description,
      totalDurationDays: method.totalDurationDays ?? source.totalDurationDays,
      methodStages,
    },
    batchSize: source.batchSize ?? batch.batchSize ?? null,
    batchStatus: source.batchStatus ?? batch.status,
    samples: source.samples ?? [],
    conclusion: source.conclusion,
    issues: source.issues,
    recommendations: source.recommendations,
    expectedSampleCount: source.expectedSampleCount,
  };
};

// =============================================================================
// SHARED SMALL COMPONENTS
// =============================================================================

interface InfoRowProps {
  label: string;
  value?: string | number | null;
  italicValue?: boolean;
  isLast?: boolean;
}

const InfoRow = ({ label, value, italicValue, isLast }: InfoRowProps) => (
  <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, italicValue && styles.scientificName]}>{toText(value)}</Text>
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

const SampleListSeparator = () => <View style={{ height: 10 }} />;

const StatusBadge = ({ status }: { status?: string }) => (
  <View style={[styles.statusTag, getStatusStyle(status)]}>
    <Text style={styles.statusText}>{translateStatusVi(status)}</Text>
  </View>
);

// =============================================================================
// CANCEL MODAL
// =============================================================================

interface CancelModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

const CancelModal = ({ visible, onClose, onConfirm, isLoading }: CancelModalProps) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Hủy thí nghiệm</Text>

          <Text style={styles.modalLabel}>
            Lý do hủy{' '}
            <Text style={{ color: '#DC2626' }}>*</Text>
          </Text>
          <TextInput
            style={styles.modalInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Nhập lý do hủy thí nghiệm..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.modalFooterRow}>
            <TouchableOpacity
              style={[styles.modalBtnSecondary, { flex: 1 }]}
              onPress={handleClose}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnSecondaryText}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtnPrimary,
                { flex: 1, backgroundColor: '#DC2626' },
                (!reason.trim() || isLoading) && styles.modalBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!reason.trim() || isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnPrimaryText}>
                {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// =============================================================================
// ACTION BUTTONS BAR
// =============================================================================

interface ActionButtonsProps {
  detail: ExperimentLogDetail;
  onStart: () => void;
  onCancel: () => void;
  isUpdatingStatus: boolean;
}

const ActionButtons = ({
  detail,
  onStart,
  onCancel,
  isUpdatingStatus,
}: ActionButtonsProps) => {
  const status = normalizeStatus(detail.status);

  const showStart = status === 'created';
  const showCancel = status === 'created';

  if (!showStart && !showCancel) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.actionRow}
      style={styles.actionRowWrap}
    >
      {showStart && (
        <TouchableOpacity
          style={styles.btnStart}
          onPress={onStart}
          disabled={isUpdatingStatus}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {isUpdatingStatus ? 'Đang xử lý...' : 'Bắt đầu'}
          </Text>
        </TouchableOpacity>
      )}

      {showCancel && (
        <TouchableOpacity
          style={styles.btnCancelAction}
          onPress={onCancel}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Hủy thí nghiệm</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// =============================================================================
// CHEMICALS & MATERIALS FOR CURRENT STAGE
// =============================================================================

interface ChemicalsAndMaterialsProps {
  currentStage?: MethodStage;
  currentStageName?: string;
}

const ChemicalsAndMaterials = ({ currentStage, currentStageName }: ChemicalsAndMaterialsProps) => {
  const stageChemicals = currentStage?.stageChemicals ?? [];
  const stageMaterials = currentStage?.stageMaterials ?? [];

  const chemGroups = stageChemicals.reduce<Record<string, Chemical[]>>((acc, sc) => {
    const cat = sc.chemical?.category ?? 'Khác';
    if (!acc[cat]) acc[cat] = [];
    if (sc.chemical) acc[cat].push(sc.chemical);
    return acc;
  }, {});

  const matGroups = stageMaterials.reduce<Record<string, Material[]>>((acc, sm) => {
    const cat = sm.material?.category ?? 'Khác';
    if (!acc[cat]) acc[cat] = [];
    if (sm.material) acc[cat].push(sm.material);
    return acc;
  }, {});

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Hóa chất & dụng cụ
        {currentStageName ? (
          <Text style={{ fontWeight: '600', fontSize: 13, opacity: 0.7 }}>
            {' '}({currentStageName})
          </Text>
        ) : null}
      </Text>

      <View style={styles.card}>
        {/* Chemicals */}
        <Text style={styles.chemSectionTitle}>
          Hóa chất ({stageChemicals.length})
        </Text>
        {stageChemicals.length === 0 ? (
          <Text style={styles.chemEmpty}>Không có hóa chất</Text>
        ) : (
          Object.entries(chemGroups).map(([cat, chems]) => (
            <View key={cat} style={styles.chemGroup}>
              <Text style={styles.chemCategory}>{cat}</Text>
              {chems.map((c, i) => (
                <View key={c.id ?? `c-${i}`} style={styles.chemItem}>
                  <View style={styles.chemDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chemItemName}>{toText(c.name)}</Text>
                    {c.concentrationUnit ? (
                      <Text style={styles.chemItemUnit}>{c.concentrationUnit}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        <View style={styles.stageDivider} />

        {/* Materials */}
        <Text style={[styles.chemSectionTitle, { marginTop: 12 }]}>
          Dụng cụ ({stageMaterials.length})
        </Text>
        {stageMaterials.length === 0 ? (
          <Text style={styles.chemEmpty}>Không có dụng cụ</Text>
        ) : (
          Object.entries(matGroups).map(([cat, mats]) => (
            <View key={cat} style={styles.chemGroup}>
              <Text style={styles.chemCategory}>{cat}</Text>
              {mats.map((m, i) => (
                <View key={m.id ?? `m-${i}`} style={styles.chemItem}>
                  <View style={styles.chemDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chemItemName}>{toText(m.name)}</Text>
                    {m.unit ? (
                      <Text style={styles.chemItemUnit}>{m.unit}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
};

// =============================================================================
// EXPERIMENT HEADER
// =============================================================================

const ExperimentHeader = ({
  detail,
  creator,
}: {
  detail: ExperimentLogDetail;
  creator?: string;
}) => (
  <View style={styles.section}>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{toText(detail.name)}</Text>
      <StatusBadge status={detail.status} />

      <InfoRow
        label="Thời gian"
        value={`${formatDate(detail.startDate)} → ${formatDate(detail.endDate)}`}
      />
      <InfoRow label="Lô nuôi cấy" value={detail.batchName} />
      <InfoRow label="Phòng lab" value={detail.labRoomName} />
      {detail.expectedSampleCount != null ? (
        <InfoRow label="Số mẫu mong muốn" value={detail.expectedSampleCount} />
      ) : null}
      <InfoRow label="Người tạo" value={creator ?? 'N/A'} isLast />
    </View>
  </View>
);

// =============================================================================
// SEEDLING INFO
// =============================================================================

const SeedlingInfo = ({ detail }: { detail: ExperimentLogDetail }) => {
  const traits = detail.traits ?? [];

  return (
    <SectionCard title="Thông tin cây giống">
      <InfoRow label="Tên địa phương" value={detail.localName} />
      <InfoRow label="Tên khoa học" value={detail.scientificName} italicValue />
      <InfoRow label="Mô tả" value={detail.description} />
      <InfoRow label="Parent A - Tên địa phương" value={detail.parentALocalName} />
      <InfoRow
        label="Parent A - Tên khoa học"
        value={detail.parentAScientificName}
        italicValue
        isLast={traits.length === 0}
      />

      {traits.length > 0 ? (
        <View>
          <Text style={styles.cardSubTitle}>Traits</Text>
          {traits.map((trait, index) => {
            const rowValue = `${toText(trait.value, '-')} ${toText(trait.unit, '')}`.trim();
            return (
              <InfoRow
                key={trait.id ?? `${index}`}
                label={toText(trait.name)}
                value={rowValue}
                isLast={index === traits.length - 1}
              />
            );
          })}
        </View>
      ) : null}
    </SectionCard>
  );
};

// =============================================================================
// METHOD STAGES
// =============================================================================

const MethodStages = ({
  method,
  currentStageOrder,
}: {
  method?: ExperimentMethod;
  currentStageOrder?: number | null;
}) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const stages = useMemo(
    () => (method?.methodStages ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [method?.methodStages],
  );

  const toggleStage = (stageKey: string) =>
    setExpandedMap((prev) => ({ ...prev, [stageKey]: !prev[stageKey] }));

  return (
    <SectionCard title="Phương pháp & giai đoạn">
      <InfoRow label="Tên phương pháp" value={method?.name} />
      <InfoRow label="Mô tả" value={method?.description} />
      <InfoRow
        label="Tổng thời lượng"
        value={`${toText(method?.totalDurationDays ?? 0)} ngày`}
        isLast={stages.length === 0}
      />

      {stages.length > 0 ? (
        <Text style={styles.cardSubTitle}>Các giai đoạn</Text>
      ) : null}

      {stages.map((stage, index) => {
        const stageKey = stage.id ?? `${stage.order ?? index + 1}`;
        const stageOrder = stage.order ?? index + 1;
        const isCurrentStage = currentStageOrder != null && stageOrder === currentStageOrder;
        const isPastStage = currentStageOrder != null && stageOrder < currentStageOrder;
        const isUpcomingStage = currentStageOrder != null && stageOrder > currentStageOrder;
        const expanded = !!expandedMap[stageKey];
        const duration = stage.durationsDays ?? stage.durationDays ?? 0;

        return (
          <View
            key={stageKey}
            style={[
              styles.stageCard,
              isPastStage && styles.stageCardPast,
              isCurrentStage && styles.stageCardCurrent,
              isUpcomingStage && styles.stageCardUpcoming,
            ]}
          >
            {/* Stage header row */}
            <View style={styles.stageTop}>
              <View style={styles.stageOrderBubble}>
                <Text style={styles.stageOrderText}>
                  {isPastStage ? '✓' : stageOrder}
                </Text>
              </View>

              <View style={styles.stageTitleWrap}>
                <Text style={styles.stageName}>
                  {toText(stage.stageDefinition?.name)}
                </Text>
                <Text style={styles.stageMeta}>
                  Thời lượng: {toText(duration)} ngày
                </Text>
              </View>

              {isCurrentStage ? (
                <View style={styles.stageCurrentPill}>
                  <Text style={styles.stageCurrentPillText}>Đang thực hiện</Text>
                </View>
              ) : null}
            </View>

            {/* isSampleGenerated tag */}
            <View style={styles.stageTagRow}>
              <View
                style={[
                  styles.isSampleTag,
                  stage.isSampleGenerated
                    ? styles.isSampleTagEnabled
                    : styles.isSampleTagDisabled,
                ]}
              >
                <Text style={styles.isSampleTagText}>
                  {stage.isSampleGenerated ? 'Sinh chồi' : 'Không sinh chồi'}
                </Text>
              </View>
            </View>

            {/* Expand toggle */}
            <TouchableOpacity
              style={styles.expandAction}
              onPress={() => toggleStage(stageKey)}
              activeOpacity={0.85}
            >
              <Text style={styles.expandActionText}>
                {expanded ? 'Thu gọn' : 'Xem chi tiết'}
              </Text>
            </TouchableOpacity>

            {/* Expanded detail */}
            {expanded ? (
              <View style={styles.stageDivider}>
                <Text style={styles.systemTitle}>Materials</Text>
                {(stage.materials ?? []).length > 0 ? (
                  (stage.materials ?? []).map((mat, mi) => (
                    <Text key={mat.id ?? `${stageKey}-m-${mi}`} style={styles.systemLine}>
                      - {toText(mat.name)} ({toText(mat.unit)})
                    </Text>
                  ))
                ) : (
                  <Text style={styles.systemLine}>- Không có dữ liệu</Text>
                )}

                <Text style={styles.systemTitle}>Chemicals</Text>
                {(stage.chemicals ?? []).length > 0 ? (
                  (stage.chemicals ?? []).map((chem, ci) => (
                    <Text key={chem.id ?? `${stageKey}-c-${ci}`} style={styles.systemLine}>
                      - {toText(chem.name)} ({toText(chem.concentrationUnit)})
                    </Text>
                  ))
                ) : (
                  <Text style={styles.systemLine}>- Không có dữ liệu</Text>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </SectionCard>
  );
};

// =============================================================================
// SAMPLE LIST
// =============================================================================

interface SampleListProps {
  samples: SampleItem[];
  onPressSample?: (id: string) => void;
}

const SampleList = ({ samples, onPressSample }: SampleListProps) => {
  const renderSampleItem = ({ item }: { item: SampleItem }) => {
    const isActive = normalizeStatus(item.status) === 'inprogress';

    return (
      <TouchableOpacity
        style={[styles.sampleCard, isActive && styles.sampleCardActive]}
        onPress={() => item.id && onPressSample?.(item.id)}
        activeOpacity={0.82}
        disabled={!item.id || !onPressSample}
      >
        <View style={styles.sampleTopRow}>
          <Text style={styles.sampleTitle}>{toText(item.name)}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.sampleMeta}>
          Giai đoạn hiện tại: {toText(item.currentSampleStage)}
        </Text>
        <Text style={styles.sampleMeta}>
          Ngày thực hiện: {formatDate(item.executionDate)}
        </Text>
        {item.notes ? (
          <Text style={styles.sampleMeta}>Ghi chú: {item.notes}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mẫu nuôi cấy</Text>
      <FlatList
        data={samples}
        keyExtractor={(item, index) => item.id ?? `${index}`}
        renderItem={renderSampleItem}
        ItemSeparatorComponent={SampleListSeparator}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có mẫu nào cho nhật ký này.</Text>
          </View>
        }
      />
    </View>
  );
};

// =============================================================================
// RESULT SECTION
// =============================================================================

const ResultSection = ({ detail }: { detail: ExperimentLogDetail }) => (
  <SectionCard title="Kết quả & kết luận">
    <View>
      <View style={styles.stageTop}>
        <CheckCircle2 size={16} color="#1F3D2F" />
        <Text style={styles.systemTitle}> Kết luận</Text>
      </View>
      <Text style={[styles.bodyText, styles.bodyTextSpacing]}>
        {toText(detail.conclusion)}
      </Text>

      <View style={styles.stageDivider}>
        <View style={styles.stageTop}>
          <AlertCircle size={16} color="#1F3D2F" />
          <Text style={styles.systemTitle}> Vấn đề phát sinh</Text>
        </View>
        <Text style={[styles.bodyText, styles.bodyTextSpacing]}>
          {toText(detail.issues)}
        </Text>
      </View>

      <View style={styles.stageDivider}>
        <View style={styles.stageTop}>
          <FileText size={16} color="#1F3D2F" />
          <Text style={styles.systemTitle}> Khuyến nghị</Text>
        </View>
        <Text style={[styles.bodyText, styles.bodyTextSpacing]}>
          {toText(detail.recommendations)}
        </Text>
      </View>
    </View>
  </SectionCard>
);

// =============================================================================
// MAIN SCREEN
// =============================================================================

const ExperimentLogDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const experimentLogId = route.params?.experimentLogId as string | undefined;

  // ── Data state ─────────────────────────────────────────────
  const [detail, setDetail] = useState<ExperimentLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [creator, setCreator] = useState('');

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!experimentLogId) {
      const msg = 'Không tìm thấy experimentLogId để tải chi tiết nhật ký.';
      setError(msg);
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await authFetch(`${cleanBaseUrl}/api/experiment-logs/${experimentLogId}`);
      if (!res.ok) {
        const messageText = await res.text();
        let parsedMessage = `Không thể tải chi tiết nhật ký (HTTP ${res.status})`;
        if (messageText) {
          try {
            const parsed = JSON.parse(messageText);
            parsedMessage = parsed?.detail || parsed?.message || parsedMessage;
          } catch {
            parsedMessage = messageText;
          }
        }
        throw new Error(parsedMessage);
      }

      const raw = await res.text();
      const json = raw ? JSON.parse(raw) : {};
      setDetail(normalizeExperimentLog(json));
    } catch (e: any) {
      const msg = String(e?.message || 'Không thể kết nối tới máy chủ');
      setError(msg);
      Alert.alert('Lỗi tải dữ liệu', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [experimentLogId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    const createdBy = detail?.createdBy;
    if (!createdBy) return;

    fetch(`${cleanBaseUrl}/api/user/${createdBy}`)
      .then((r) => r.json())
      .then((data) => {
        const userData = data?.value ?? data;
        setCreator(userData?.name ?? '');
      })
      .catch(() => {});
  }, [detail?.createdBy]);

  const handleStart = async () => {
    if (!experimentLogId) return;
    setIsUpdatingStatus(true);
    try {
      const res = await authFetch(
        `${cleanBaseUrl}/api/experiment-logs/${experimentLogId}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'InProgress' }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDetail((prev) => (prev ? { ...prev, status: 'InProgress' } : prev));
    } catch (e: any) {
      const msg = String(e?.message || 'Không thể bắt đầu thí nghiệm');
      Alert.alert('Lỗi', msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!experimentLogId) return;
    setIsCancelling(true);
    try {
      const res = await authFetch(
        `${cleanBaseUrl}/api/experiment-logs/${experimentLogId}/cancel`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: experimentLogId, reason }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDetail((prev) => (prev ? { ...prev, status: 'Failed' } : prev));
      setIsCancelModalOpen(false);
    } catch (e: any) {
      const msg = String(e?.message || 'Không thể hủy thí nghiệm');
      Alert.alert('Lỗi', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Navigation ──────────────────────────────────────────────
  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  const handlePressSample = (sampleId: string) => {
    navigation.navigate('SampleDetail', { sampleId });
  };

  // ── Error fallback ──────────────────────────────────────────
  const renderErrorFallback = () => (
    <View style={styles.center}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
        <Text style={styles.errorText}>{toText(error)}</Text>
        <View style={styles.errorActions}>
          <View style={styles.actionHalf}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
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

  // ── Derived values ──────────────────────────────────────────
  const samples = detail?.samples ?? [];
  const currentStage = detail?.method?.methodStages?.find(
    (s) => s.order === detail?.currentStageOrder,
  );
  const currentStageName = currentStage?.stageDefinition?.name;

  // ── Render ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* Background */}
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

      {/* Modals */}
      <CancelModal
        visible={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancel}
        isLoading={isCancelling}
      />

      {/* Page header */}
      <View style={styles.headerWrap}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ArrowLeft size={18} color="#1F3D2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết nhật ký</Text>
        <View style={{ width: 36 }} pointerEvents="none" />
      </View>

      {/* Action buttons bar (visible only when data is loaded) */}
      {!loading && detail ? (
        <ActionButtons
          detail={detail}
          onStart={async () => { await handleStart(); }}
          onCancel={() => setIsCancelModalOpen(true)}
          isUpdatingStatus={isUpdatingStatus}
        />
      ) : null}

      {/* Main content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1F3D2F" />
        </View>
      ) : error && !detail ? (
        renderErrorFallback()
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1F3D2F"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <ExperimentHeader detail={detail ?? {}} creator={creator} />

          <SectionCard title="Mục tiêu & ghi chú">
            <Text style={styles.bodyText}>{toText(detail?.objective)}</Text>
            <Text style={[styles.bodyText, styles.bodyTextSpacing]}>
              {toText(detail?.notes)}
            </Text>
            {detail?.reason ? (
              <Text style={[styles.bodyText, styles.bodyTextSpacing]}>
                Lý do: {detail.reason}
              </Text>
            ) : null}
          </SectionCard>

          <SeedlingInfo detail={detail ?? {}} />

          <MethodStages
            method={detail?.method}
            currentStageOrder={detail?.currentStageOrder ?? null}
          />

          <ChemicalsAndMaterials
            currentStage={currentStage}
            currentStageName={currentStageName}
          />

          <SectionCard title="Thông tin lô nuôi cấy">
            <InfoRow label="Tên lô" value={detail?.batchName} />
            <InfoRow label="Phòng lab" value={detail?.labRoomName} />
            <InfoRow
              label="Kích thước"
              value={`${toText(detail?.batchSize?.width ?? 0)} x ${toText(
                detail?.batchSize?.height ?? 0,
              )} ${toText(detail?.batchSize?.unit, '')}`.trim()}
            />
            <InfoRow
              label="Trạng thái lô"
              value={translateStatusVi(detail?.batchStatus)}
              isLast
            />
          </SectionCard>

          <SampleList samples={samples} onPressSample={handlePressSample} />

          <ResultSection detail={detail ?? {}} />
        </ScrollView>
      )}

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default ExperimentLogDetailScreen;