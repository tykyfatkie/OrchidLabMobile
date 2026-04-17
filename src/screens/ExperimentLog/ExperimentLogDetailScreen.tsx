import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, AlertCircle, CheckCircle2, FileText } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_URL } from '@env';

import { CustomTabBar } from '../../components/CustomTabBar';
import { QuickMenu } from '../../components/QuickMenu';
import { translateStatusVi } from '../../utils/statusTranslations';
import { experimentLogDetailStyles as styles } from './experimentLogDetailStyles';

const cleanBaseUrl = String(API_URL).trim().replace(/\/+$/, '');

interface TraitItem {
  id?: string;
  name?: string;
  value?: string | number | null;
  unit?: string | null;
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
  stageDefinition?: {
    name?: string;
  } | null;
  materials?: StageSystemItem[];
  chemicals?: StageSystemItem[];
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
  currentStageOrder?: number | null;
  assignedTo?: string;
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

const normalizeExperimentLog = (raw: any): ExperimentLogDetail => {
  const source = raw?.data ?? raw ?? {};
  const seedling = source.seedling ?? {};
  const method = source.method ?? {};
  const batch = source.batch ?? {};

  const methodStages = (method.methodStages ?? source.methodStages ?? []).map((stage: any) => ({
    id: stage.id,
    order: stage.order,
    durationDays: stage.durationsDays ?? stage.durationDays,
    stageDefinition: {
      name: stage.stageDefinition?.name,
    },
    materials: stage.materials ?? [],
    chemicals: stage.chemicals ?? [],
  }));

  return {
    id: source.id,
    name: source.name,
    status: source.status,
    currentStageOrder: source.currentStageOrder ?? method.currentStageOrder ?? null,
    assignedTo: source.assignedTo ?? source.assignedToName,
    startDate: source.startDate,
    endDate: source.endDate,
    batchName: source.batchName ?? batch.name,
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
  };
};

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

const SampleListSeparator = () => <View style={styles.section} />;

const StatusBadge = ({ status }: { status?: string }) => (
  <View style={[styles.statusTag, getStatusStyle(status)]}>
    <Text style={styles.statusText}>{translateStatusVi(status)}</Text>
  </View>
);

const ExperimentHeader = ({ detail }: { detail: ExperimentLogDetail }) => (
  <View style={styles.section}>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{toText(detail.name)}</Text>
      <StatusBadge status={detail.status} />

      {/* <InfoRow label="Người phụ trách" value={detail.assignedTo} /> */}
      <InfoRow
        label="Thời gian"
        value={`${formatDate(detail.startDate)} -> ${formatDate(detail.endDate)}`}
      />
      <InfoRow label="Lô nuôi cấy" value={detail.batchName} />
      <InfoRow label="Phòng lab" value={detail.labRoomName} isLast />
    </View>
  </View>
);

const SeedlingInfo = ({ detail }: { detail: ExperimentLogDetail }) => {
  const traits = detail.traits ?? [];

  return (
    <SectionCard title="Thông tin cây giống">
      <InfoRow label="Tên địa phương" value={detail.localName} />
      <InfoRow label="Tên khoa học" value={detail.scientificName} italicValue />
      <InfoRow label="Mô tả" value={detail.description} />
      <InfoRow label="Parent A - Tên địa phương" value={detail.parentALocalName} />
      <InfoRow label="Parent A - Tên khoa học" value={detail.parentAScientificName} italicValue isLast={traits.length === 0} />

      {traits.length > 0 ? (
        <View>
          <Text style={styles.cardSubTitle}>Traits</Text>
          {traits.map((trait, index) => {
            const rowValue = `${toText(trait.value, '-')} ${toText(trait.unit, '')}`.trim();
            const isLast = index === traits.length - 1;
            return <InfoRow key={trait.id ?? `${index}`} label={toText(trait.name)} value={rowValue} isLast={isLast} />;
          })}
        </View>
      ) : null}
    </SectionCard>
  );
};

const MethodStages = ({ method, currentStageOrder }: { method?: ExperimentMethod; currentStageOrder?: number | null }) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const stages = useMemo(() => (method?.methodStages ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [method?.methodStages]);

  const toggleStage = (stageKey: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [stageKey]: !prev[stageKey],
    }));
  };

  return (
    <SectionCard title="Phương pháp & giai đoạn">
      <InfoRow label="Tên phương pháp" value={method?.name} />
      <InfoRow label="Mô tả" value={method?.description} />
      <InfoRow label="Tổng thời lượng" value={`${toText(method?.totalDurationDays ?? 0)} ngày`} isLast={stages.length === 0} />

      {stages.length > 0 ? <Text style={styles.cardSubTitle}>Các giai đoạn</Text> : null}
      {stages.map((stage, index) => {
        const stageKey = stage.id ?? `${stage.order ?? index + 1}`;
        const stageOrder = stage.order ?? index + 1;
        const isCurrentStage = currentStageOrder != null && stageOrder === currentStageOrder;
        const isPastStage = currentStageOrder != null && stageOrder < currentStageOrder;
        const isUpcomingStage = currentStageOrder != null && stageOrder > currentStageOrder;
        const expanded = !!expandedMap[stageKey];

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
            <View style={styles.stageTop}>
              <View style={styles.stageOrderBubble}>
                <Text style={styles.stageOrderText}>{stageOrder}</Text>
              </View>

              <View style={styles.stageTitleWrap}>
                <Text style={styles.stageName}>{toText(stage.stageDefinition?.name)}</Text>
                <Text style={styles.stageMeta}>Thời lượng: {toText(stage.durationDays ?? 0)} ngày</Text>
              </View>

              {isCurrentStage ? <View style={styles.stageCurrentPill}><Text style={styles.stageCurrentPillText}>Đang thực hiện</Text></View> : null}
            </View>

            <TouchableOpacity style={styles.expandAction} onPress={() => toggleStage(stageKey)} activeOpacity={0.85}>
              <Text style={styles.expandActionText}>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</Text>
            </TouchableOpacity>

            {expanded ? (
              <View style={styles.stageDivider}>
                <Text style={styles.systemTitle}>Materials</Text>
                {(stage.materials ?? []).length > 0 ? (
                  (stage.materials ?? []).map((material, materialIndex) => (
                    <Text key={material.id ?? `${stageKey}-m-${materialIndex}`} style={styles.systemLine}>
                      - {toText(material.name)} ({toText(material.unit)})
                    </Text>
                  ))
                ) : (
                  <Text style={styles.systemLine}>- Không có dữ liệu</Text>
                )}

                <Text style={styles.systemTitle}>Chemicals</Text>
                {(stage.chemicals ?? []).length > 0 ? (
                  (stage.chemicals ?? []).map((chemical, chemicalIndex) => (
                    <Text key={chemical.id ?? `${stageKey}-c-${chemicalIndex}`} style={styles.systemLine}>
                      - {toText(chemical.name)} ({toText(chemical.concentrationUnit)})
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

const SampleList = ({ samples }: { samples: SampleItem[] }) => {
  const renderSampleItem = ({ item }: { item: SampleItem }) => {
    const isActive = String(item.status || '').toLowerCase() === 'inprogress';

    return (
      <View style={[styles.sampleCard, isActive && styles.sampleCardActive]}>
        <View style={styles.sampleTopRow}>
          <Text style={styles.sampleTitle}>{toText(item.name)}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.sampleMeta}>Giai đoạn hiện tại: {toText(item.currentSampleStage)}</Text>
        <Text style={styles.sampleMeta}>Ngày thực hiện: {formatDate(item.executionDate)}</Text>
        {item.notes ? <Text style={styles.sampleMeta}>Ghi chú: {item.notes}</Text> : null}
      </View>
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

const ResultSection = ({ detail }: { detail: ExperimentLogDetail }) => (
  <SectionCard title="Kết quả & kết luận">
    <View>
      <View>
        <View style={styles.stageTop}>
          <CheckCircle2 size={16} color="#1F3D2F" />
          <Text style={styles.systemTitle}> Kết luận</Text>
        </View>
        <Text style={[styles.bodyText, styles.bodyTextSpacing]}>{toText(detail.conclusion)}</Text>
      </View>

      <View style={styles.stageDivider}>
        <View style={styles.stageTop}>
          <AlertCircle size={16} color="#1F3D2F" />
          <Text style={styles.systemTitle}> Vấn đề phát sinh</Text>
        </View>
        <Text style={[styles.bodyText, styles.bodyTextSpacing]}>{toText(detail.issues)}</Text>
      </View>

      <View style={styles.stageDivider}>
        <View style={styles.stageTop}>
          <FileText size={16} color="#1F3D2F" />
          <Text style={styles.systemTitle}> Khuyến nghị</Text>
        </View>
        <Text style={[styles.bodyText, styles.bodyTextSpacing]}>{toText(detail.recommendations)}</Text>
      </View>
    </View>
  </SectionCard>
);

const ExperimentLogDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const experimentLogId = route.params?.experimentLogId as string | undefined;

  const [detail, setDetail] = useState<ExperimentLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!experimentLogId) {
      const message = 'Không tìm thấy experimentLogId để tải chi tiết nhật ký.';
      setError(message);
      setLoading(false);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${cleanBaseUrl}/api/experiment-logs/${experimentLogId}`);
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
      const normalized = normalizeExperimentLog(json);
      setDetail(normalized);
    } catch (e: any) {
      const message = String(e?.message || 'Không thể kết nối tới máy chủ');
      setError(message);
      Alert.alert('Lỗi tải dữ liệu', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [experimentLogId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
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
            <TouchableOpacity style={styles.primaryButton} onPress={fetchDetail}>
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const samples = detail?.samples ?? [];

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

      <QuickMenu />

      <View style={styles.headerWrap}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <ArrowLeft size={18} color="#1F3D2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết nhật ký</Text>
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
          <ExperimentHeader detail={detail ?? {}} />

          <SectionCard title="Mục tiêu & ghi chú">
            <Text style={styles.bodyText}>{toText(detail?.objective)}</Text>
            <Text style={[styles.bodyText, styles.bodyTextSpacing]}>{toText(detail?.notes)}</Text>
            {detail?.reason ? <Text style={[styles.bodyText, styles.bodyTextSpacing]}>Lý do: {detail.reason}</Text> : null}
          </SectionCard>

          <SeedlingInfo detail={detail ?? {}} />

          <MethodStages method={detail?.method} currentStageOrder={detail?.currentStageOrder ?? null} />

          <SectionCard title="Thông tin lô nuôi cấy">
            <InfoRow label="Tên lô" value={detail?.batchName} />
            <InfoRow label="Phòng lab" value={detail?.labRoomName} />
            <InfoRow
              label="Kích thước"
              value={`${toText(detail?.batchSize?.width ?? 0)} x ${toText(detail?.batchSize?.height ?? 0)} ${toText(detail?.batchSize?.unit, '')}`.trim()}
            />
            <InfoRow label="Trạng thái lô" value={translateStatusVi(detail?.batchStatus)} isLast />
          </SectionCard>

          <SampleList samples={samples} />

          <ResultSection detail={detail ?? {}} />
        </ScrollView>
      )}

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default ExperimentLogDetailScreen;
