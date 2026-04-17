import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import {
  ArrowLeft,
  ChevronDown,
  PlusCircle,
  SendHorizontal,
  Sparkles,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Asset, launchImageLibrary } from 'react-native-image-picker';
import { API_URL } from '@env';

import { CustomTabBar } from '../../components/CustomTabBar';
import { QuickMenu } from '../../components/QuickMenu';
import { createMonitoringLogStyles as styles } from './createReportStyles';

const cleanBaseUrl = String(API_URL).trim().replace(/\/+$/, '');

interface OptionItem {
  id: string;
  name: string;
}

interface SampleItem {
  id: string;
  name: string;
  experimentLogId: string;
  currentSampleStage: string;
  status: string;
}

interface SampleDetailState {
  notes: string;
}

interface StageRequirementItem {
  id: string;
  characteristicName: string;
  unit: string;
  minValue?: number | null;
  maxValue?: number | null;
  expectedValue?: number | string | null;
}

interface SampleStageDto {
  id?: string;
  status?: string;
  sampleStageDefinition?: {
    id?: number | string;
    name?: string;
    order?: number;
  };
  logDetailDtos?: any[];
}

interface StageSelection {
  sampleStageId: string;
  sampleStageDefinitionId: string;
  stageName: string;
  measuredValueMap: Record<string, string>;
}

interface AnalysisResultState {
  analyticResultId: string;
  diseaseId: string;
  diseaseName: string;
}

interface ExistingLogState {
  id: string;
  name: string;
  notes: string;
  sampleStageId: string;
  analyticResultId: string;
  diseaseId: string;
  status: string;
  rejectionReason: string;
  measuredValueMap: Record<string, string>;
}

const toText = (value?: string | number | null, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
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

const parseListResponse = (raw: any): any[] => {
  const source = raw?.data ?? raw ?? [];
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.items)) return source.items;
  if (Array.isArray(source?.results)) return source.results;
  return [];
};

const normalizeSamples = (raw: any): SampleItem[] => {
  return parseListResponse(raw)
    .map((item: any) => ({
      id: String(item?.id ?? ''),
      name: toText(item?.name, ''),
      experimentLogId: toText(item?.experimentLogId, ''),
      currentSampleStage: toText(item?.currentSampleStage, ''),
      status: toText(item?.status, ''),
    }))
    .filter(item => !!item.id && !!item.name);
};

const normalizeExperimentLogs = (raw: any): OptionItem[] => {
  return parseListResponse(raw)
    .map((item: any) => {
      const id = item?.id;
      if (!id) return null;

      return {
        id: String(id),
        name: toText(item?.name, `#${id}`),
      };
    })
    .filter(Boolean) as OptionItem[];
};

const normalizeStageRequirements = (raw: any): StageRequirementItem[] => {
  return parseListResponse(raw)
    .map((item: any) => {
      const definition =
        item?.sampleRequirementDefinitionDto ??
        item?.stageRequirementDefinitionDto?.sampleRequirementDefinitionDto;
      const id = item?.id ?? item?.stageRequirementDefinitionDto?.id;
      if (!id) return null;

      return {
        id: String(id),
        characteristicName: toText(
          definition?.name ?? item?.characteristicName ?? item?.name,
        ),
        unit: toText(definition?.unit ?? item?.unit, '-'),
        minValue:
          item?.minValue ?? item?.stageRequirementDefinitionDto?.minValue,
        maxValue:
          item?.maxValue ?? item?.stageRequirementDefinitionDto?.maxValue,
        expectedValue:
          item?.expectedValue ??
          item?.stageRequirementDefinitionDto?.expectedValue,
      };
    })
    .filter(Boolean) as StageRequirementItem[];
};

const buildExpectedRangeText = (item: StageRequirementItem) => {
  const hasMin = item.minValue !== null && item.minValue !== undefined;
  const hasMax = item.maxValue !== null && item.maxValue !== undefined;
  const hasExpected =
    item.expectedValue !== null && item.expectedValue !== undefined;

  if (hasMin && hasMax) return `${item.minValue} - ${item.maxValue}`;
  if (hasExpected) return String(item.expectedValue);
  return 'N/A';
};

const fieldRequired = (value: string) => String(value || '').trim().length > 0;

const parseMeasuredValuesFromSampleStage = (
  stage?: SampleStageDto,
): Record<string, string> => {
  const map: Record<string, string> = {};
  (stage?.logDetailDtos ?? []).forEach((item: any) => {
    const requirementId =
      item?.stageRequirementDefinitionDto?.id ??
      item?.stageRequirementDefinitionId;
    if (!requirementId) return;
    map[String(requirementId)] = String(item?.measuredValue ?? '');
  });
  return map;
};

const pickCurrentStageFromSampleDetail = (
  sampleDetail: any,
): StageSelection | null => {
  const stages = (sampleDetail?.sampleStageDto ?? []) as SampleStageDto[];
  if (!Array.isArray(stages) || stages.length === 0) return null;

  const currentStageName = String(sampleDetail?.currentSampleStage ?? '')
    .trim()
    .toLowerCase();
  let selected = stages.find(
    stage =>
      String(stage?.sampleStageDefinition?.name ?? '')
        .trim()
        .toLowerCase() === currentStageName,
  );

  if (!selected) {
    selected = stages.find(
      stage => String(stage?.status ?? '').toLowerCase() === 'inprogress',
    );
  }

  if (!selected) {
    selected = [...stages].sort(
      (a, b) =>
        Number(b?.sampleStageDefinition?.order ?? -1) -
        Number(a?.sampleStageDefinition?.order ?? -1),
    )[0];
  }

  const sampleStageId = toText(selected?.id, '');
  const sampleStageDefinitionId = toText(
    selected?.sampleStageDefinition?.id,
    '',
  );

  if (!sampleStageId || !sampleStageDefinitionId) return null;

  return {
    sampleStageId,
    sampleStageDefinitionId,
    stageName: toText(
      selected?.sampleStageDefinition?.name,
      toText(sampleDetail?.currentSampleStage, 'N/A'),
    ),
    measuredValueMap: parseMeasuredValuesFromSampleStage(selected),
  };
};

const normalizeStatusLabel = (status?: string) => {
  if (!String(status || '').trim()) return 'Tạo mới';
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'rejected') return 'Bị từ chối';
  if (normalized === 'waitingforapproval') return 'Đang chờ duyệt';
  if (normalized === 'approved') return 'Đã duyệt';
  if (normalized === 'created' || normalized === 'draft') return 'Bản nháp';
  return toText(status, 'Bản nháp');
};

const isRejectedLike = (status?: string) =>
  String(status || '').toLowerCase() === 'rejected';
const isDraftLike = (status?: string) => {
  const normalized = String(status || '').toLowerCase();
  return (
    normalized === 'created' ||
    normalized === 'draft' ||
    normalized === 'pending' ||
    normalized === 'template'
  );
};

const extractMonitoringLogId = (rawText: string, json: any): string => {
  const fromJson = json?.data?.id ?? json?.id;
  if (fromJson) return String(fromJson);

  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  const match = String(rawText || '').match(uuidRegex);
  return match?.[0] ?? '';
};

const extractAnalysisResult = (json: any): AnalysisResultState | null => {
  const source = json?.data ?? json ?? {};

  const analyticResultId =
    source?.analyticResultId ??
    source?.analyticResult?.id ??
    source?.analyticResultDto?.id;

  const diseaseId =
    source?.diseaseId ?? source?.disease?.id ?? source?.diseaseDto?.id;

  if (
    !analyticResultId ||
    diseaseId === null ||
    diseaseId === undefined ||
    diseaseId === ''
  )
    return null;

  return {
    analyticResultId: String(analyticResultId),
    diseaseId: String(diseaseId),
    diseaseName: toText(
      source?.diseaseName ?? source?.disease?.name ?? source?.diseaseDto?.name,
      '',
    ),
  };
};

const extractExistingLogState = (raw: any): ExistingLogState | null => {
  const source = raw?.data ?? raw ?? {};
  const id = source?.id;
  if (!id) return null;

  const details =
    source?.logDetails ?? source?.monitoringLogDetails ?? source?.details ?? [];
  const measuredValueMap: Record<string, string> = {};

  (details ?? []).forEach((item: any) => {
    const requirementId =
      item?.stageRequirementDefinitionId ??
      item?.stageRequirementDefinitionDto?.id;
    if (!requirementId) return;
    measuredValueMap[String(requirementId)] = String(item?.measuredValue ?? '');
  });

  return {
    id: String(id),
    name: toText(source?.name, ''),
    notes: toText(source?.notes, ''),
    sampleStageId: toText(source?.sampleStageId, ''),
    analyticResultId: toText(source?.analyticResultId, ''),
    diseaseId: toText(source?.diseaseId, ''),
    status: toText(source?.status, ''),
    rejectionReason: toText(source?.rejectionReason, ''),
    measuredValueMap,
  };
};

const extractSampleDetailState = (raw: any): SampleDetailState => {
  const source = raw?.data ?? raw ?? {};
  return {
    notes: toText(source?.notes, ''),
  };
};

const CreateReportScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const monitoringLogId = route.params?.monitoringLogId as string | undefined;

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [experimentLogs, setExperimentLogs] = useState<OptionItem[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [sampleNotes, setSampleNotes] = useState('');
  const [currentSampleStageId, setCurrentSampleStageId] = useState('');
  const [_currentSampleStageDefinitionId, setCurrentSampleStageDefinitionId] =
    useState('');
  const [currentSampleStageName, setCurrentSampleStageName] = useState('');

  const [stageRequirements, setStageRequirements] = useState<
    StageRequirementItem[]
  >([]);
  const [measuredValueMap, setMeasuredValueMap] = useState<
    Record<string, string>
  >({});

  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResultState | null>(null);

  const [createdLogId, setCreatedLogId] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [pickerVisible, setPickerVisible] = useState(false);

  const selectedSample = useMemo(
    () => samples.find(item => item.id === selectedSampleId) ?? null,
    [samples, selectedSampleId],
  );

  const selectedExperimentLogName = useMemo(() => {
    if (!selectedSample?.experimentLogId) return '';
    return (
      experimentLogs.find(item => item.id === selectedSample.experimentLogId)
        ?.name ?? ''
    );
  }, [experimentLogs, selectedSample?.experimentLogId]);

  const canPatchSubmit =
    !!createdLogId && (isDraftLike(logStatus) || isRejectedLike(logStatus));
  const canResubmit = isRejectedLike(logStatus) && !!createdLogId;
  const isEditingExisting = !!createdLogId;

  const fetchInitialData = useCallback(async () => {
    setError('');
    setLoading(true);

    try {
      const [samplesRes, logsRes] = await Promise.all([
        fetch(`${cleanBaseUrl}/api/samples?pageNo=1&pageSize=1000`),
        fetch(`${cleanBaseUrl}/api/experiment-logs?pageNo=1&pageSize=1000`),
      ]);

      if (!samplesRes.ok) {
        const message = await parseErrorMessage(
          samplesRes,
          `Không thể tải danh sách mẫu (HTTP ${samplesRes.status})`,
        );
        throw new Error(message);
      }

      if (!logsRes.ok) {
        const message = await parseErrorMessage(
          logsRes,
          `Không thể tải danh sách experiment log (HTTP ${logsRes.status})`,
        );
        throw new Error(message);
      }

      const samplesRaw = await samplesRes.text();
      const logsRaw = await logsRes.text();

      const allSamples = normalizeSamples(parseJsonSafely(samplesRaw));
      const filteredSamples = allSamples.filter(item => {
        const normalized = item.status.toLowerCase();
        return normalized === 'inprogress' || normalized === 'inprogressed';
      });

      const logs = normalizeExperimentLogs(parseJsonSafely(logsRaw));

      setSamples(filteredSamples);
      setExperimentLogs(logs);

      if (filteredSamples.length === 0) {
        setError('Không có mẫu ở trạng thái InProgress để tạo báo cáo.');
      }
    } catch (e: any) {
      const message = String(e?.message || 'Không thể tải dữ liệu ban đầu');
      setError(message);
      Alert.alert('Lỗi tải dữ liệu', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchExistingLogDetail = useCallback(async () => {
    if (!monitoringLogId) return;

    try {
      const res = await fetch(
        `${cleanBaseUrl}/api/monitoring-log/${monitoringLogId}`,
      );
      if (!res.ok) {
        const message = await parseErrorMessage(
          res,
          `Không thể tải chi tiết báo cáo (HTTP ${res.status})`,
        );
        throw new Error(message);
      }

      const raw = await res.text();
      const json = parseJsonSafely(raw);
      const state = extractExistingLogState(json);
      if (!state) return;

      setCreatedLogId(state.id);
      setName(state.name);
      setNotes(state.notes);
      setCurrentSampleStageId(state.sampleStageId);
      setLogStatus(state.status);
      setRejectionReason(state.rejectionReason);
      setMeasuredValueMap(state.measuredValueMap);

      if (state.analyticResultId && state.diseaseId) {
        setAnalysisResult({
          analyticResultId: state.analyticResultId,
          diseaseId: state.diseaseId,
          diseaseName: '',
        });
      }
    } catch (e: any) {
      const message = String(e?.message || 'Không thể tải log để chỉnh sửa');
      Alert.alert('Lỗi tải log', message);
    }
  }, [monitoringLogId]);

  const fetchSampleDetailAndRequirements = useCallback(
    async (sampleId: string) => {
      if (!sampleId) {
        setStageRequirements([]);
        setSampleNotes('');
        setCurrentSampleStageId('');
        setCurrentSampleStageDefinitionId('');
        setCurrentSampleStageName('');
        setMeasuredValueMap({});
        setAnalysisResult(null);
        return;
      }

      setDetailLoading(true);

      try {
        const sampleRes = await fetch(
          `${cleanBaseUrl}/api/samples/${sampleId}`,
        );
        if (!sampleRes.ok) {
          const message = await parseErrorMessage(
            sampleRes,
            `Không thể tải chi tiết sample (HTTP ${sampleRes.status})`,
          );
          throw new Error(message);
        }

        const sampleRaw = await sampleRes.text();
        const sampleJson = parseJsonSafely(sampleRaw);
        const sampleState = extractSampleDetailState(sampleJson);

        const stage = pickCurrentStageFromSampleDetail(sampleJson);
        if (!stage) {
          throw new Error('Không xác định được giai đoạn hiện tại của sample.');
        }

        setSampleNotes(sampleState.notes);

        setCurrentSampleStageId(stage.sampleStageId);
        setCurrentSampleStageDefinitionId(stage.sampleStageDefinitionId);
        setCurrentSampleStageName(stage.stageName);

        const reqRes = await fetch(
          `${cleanBaseUrl}/api/stage-requirement-definition?pageNo=1&pageSize=1000&sampleStageId=${stage.sampleStageDefinitionId}`,
        );

        if (!reqRes.ok) {
          const message = await parseErrorMessage(
            reqRes,
            `Không thể tải quy cách giám sát (HTTP ${reqRes.status})`,
          );
          throw new Error(message);
        }

        const reqRaw = await reqRes.text();
        const requirements = normalizeStageRequirements(
          parseJsonSafely(reqRaw),
        );

        setStageRequirements(requirements);
        setMeasuredValueMap(() => {
          const next: Record<string, string> = {};
          requirements.forEach(item => {
            next[item.id] = stage.measuredValueMap[item.id] ?? '';
          });
          return next;
        });

        setAnalysisResult(null);
        setSelectedImage(null);
      } catch (e: any) {
        const message = String(e?.message || 'Không thể tải quy cách giám sát');
        setStageRequirements([]);
        setSampleNotes('');
        setMeasuredValueMap({});
        setCurrentSampleStageId('');
        setCurrentSampleStageDefinitionId('');
        setCurrentSampleStageName('');
        Alert.alert('Lỗi tải dữ liệu sample', message);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchExistingLogDetail();
  }, [fetchExistingLogDetail]);

  useEffect(() => {
    fetchSampleDetailAndRequirements(selectedSampleId);
  }, [fetchSampleDetailAndRequirements, selectedSampleId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
    if (monitoringLogId) fetchExistingLogDetail();
    if (selectedSampleId) fetchSampleDetailAndRequirements(selectedSampleId);
  };

  const onPickImage = () => {
    try {
      launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, response => {
        if (response.didCancel || !response.assets?.length) return;
        const asset = response.assets[0];
        if (!asset.uri) return;
        setSelectedImage(asset);
      });
    } catch {
      Alert.alert(
        'Thiếu Native Module',
        'Vui lòng build lại app để dùng thư viện chọn ảnh.',
      );
    }
  };

  const onAnalyze = async () => {
    if (!selectedImage?.uri) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng chọn ảnh để phân tích.');
      return;
    }

    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type ?? 'image/jpeg',
        name: selectedImage.fileName ?? 'analysis.jpg',
      } as any);

      if (currentSampleStageId) {
        formData.append('sampleStageId', currentSampleStageId);
      }

      const res = await fetch(`${cleanBaseUrl}/api/monitoring-log/analysis`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const message = await parseErrorMessage(
          res,
          `Không thể phân tích bệnh (HTTP ${res.status})`,
        );
        throw new Error(message);
      }

      const raw = await res.text();
      const parsed = parseJsonSafely(raw);
      const analysis = extractAnalysisResult(parsed);

      if (!analysis) {
        throw new Error(
          'API phân tích không trả đủ analyticResultId hoặc diseaseId.',
        );
      }

      setAnalysisResult(analysis);
      Alert.alert('Thành công', 'Đã phân tích bệnh từ ảnh.');
    } catch (e: any) {
      const message = String(e?.message || 'Không thể phân tích bệnh');
      Alert.alert('Lỗi phân tích', message);
    } finally {
      setAnalyzing(false);
    }
  };

  const onChangeMeasuredValue = (id: string, value: string) => {
    setMeasuredValueMap(prev => ({ ...prev, [id]: value }));
  };

  const validateForm = () => {
    if (!fieldRequired(name)) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng nhập tên báo cáo.');
      return false;
    }

    if (!fieldRequired(selectedSampleId)) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng chọn sample.');
      return false;
    }

    if (!fieldRequired(currentSampleStageId)) {
      Alert.alert(
        'Thiếu dữ liệu',
        'Không xác định được giai đoạn hiện tại của sample.',
      );
      return false;
    }

    if (!analysisResult?.analyticResultId || !analysisResult?.diseaseId) {
      Alert.alert(
        'Thiếu dữ liệu',
        'Vui lòng phân tích bệnh trước khi tạo báo cáo.',
      );
      return false;
    }

    if (stageRequirements.length === 0) {
      Alert.alert(
        'Thiếu dữ liệu',
        'Không có quy cách giám sát để nhập đo lường.',
      );
      return false;
    }

    for (const requirement of stageRequirements) {
      const rawValue = String(measuredValueMap[requirement.id] ?? '').trim();
      if (!rawValue) {
        Alert.alert(
          'Thiếu dữ liệu',
          `Vui lòng nhập giá trị đo cho "${requirement.characteristicName}".`,
        );
        return false;
      }

      const measured = Number(rawValue);
      if (Number.isNaN(measured)) {
        Alert.alert(
          'Sai định dạng',
          `Giá trị đo của "${requirement.characteristicName}" phải là số.`,
        );
        return false;
      }
    }

    return true;
  };

  const uploadImageToMonitoringLog = async (monitoringId: string) => {
    if (!selectedImage?.uri || !monitoringId) return;

    try {
      const form = new FormData();
      form.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type ?? 'image/jpeg',
        name: selectedImage.fileName ?? 'monitoring-log.jpg',
      } as any);
      form.append('targetType', 'MonitoringLog');
      form.append('targetId', monitoringId);

      await fetch(`${cleanBaseUrl}/api/images`, {
        method: 'POST',
        body: form,
      });
    } catch {
      Alert.alert(
        'Thông báo',
        'Tạo báo cáo thành công nhưng upload ảnh chưa hoàn tất.',
      );
    }
  };

  const createLog = async (shouldSubmitImmediately: boolean) => {
    if (!validateForm()) return false;

    setSaving(true);

    try {
      const numericDiseaseId = Number(analysisResult?.diseaseId);
      if (Number.isNaN(numericDiseaseId)) {
        throw new Error('Giá trị diseaseId không hợp lệ từ kết quả phân tích.');
      }

      const payload = {
        name: name.trim(),
        sampleStageId: currentSampleStageId,
        analyticResultId: String(analysisResult?.analyticResultId),
        diseaseId: numericDiseaseId,
        notes: notes.trim(),
        logDetailsDtos: stageRequirements.map(item => ({
          stageRequirementDefinitionId: item.id,
          measuredValue: Number(String(measuredValueMap[item.id]).trim()),
        })),
        submitImmediately: shouldSubmitImmediately,
      };

      const res = await fetch(
        `${cleanBaseUrl}/api/monitoring-log?submitImmediately=${shouldSubmitImmediately}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const message = await parseErrorMessage(
          res,
          `Không thể tạo báo cáo (HTTP ${res.status})`,
        );
        throw new Error(message);
      }

      const raw = await res.text();
      const json = parseJsonSafely(raw);
      const newId = extractMonitoringLogId(raw, json);

      if (newId) {
        setCreatedLogId(newId);
      }

      const statusFromServer = String(
        json?.data?.status ?? json?.status ?? '',
      ).trim();
      setLogStatus(
        statusFromServer ||
          (shouldSubmitImmediately ? 'WaitingForApproval' : 'Created'),
      );
      setRejectionReason('');

      if (newId) {
        await uploadImageToMonitoringLog(newId);
      }

      Alert.alert(
        'Thành công',
        shouldSubmitImmediately
          ? 'Đã tạo và gửi duyệt báo cáo.'
          : 'Đã lưu báo cáo ở trạng thái nháp.',
      );
      return true;
    } catch (e: any) {
      const message = String(e?.message || 'Không thể tạo báo cáo');
      Alert.alert('Lỗi tạo báo cáo', message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitExistingLog = async (targetLogId: string) => {
    if (!targetLogId) {
      Alert.alert('Thiếu dữ liệu', 'Không tìm thấy id báo cáo để submit.');
      return false;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${cleanBaseUrl}/api/monitoring-log/${targetLogId}/submit`,
        {
          method: 'PATCH',
        },
      );

      if (!res.ok) {
        const message = await parseErrorMessage(
          res,
          `Không thể submit báo cáo (HTTP ${res.status})`,
        );
        throw new Error(message);
      }

      const raw = await res.text();
      const json = parseJsonSafely(raw);

      setLogStatus(
        String(json?.data?.status ?? json?.status ?? 'WaitingForApproval'),
      );
      setRejectionReason(
        String(json?.data?.rejectionReason ?? json?.rejectionReason ?? ''),
      );

      Alert.alert(
        'Thành công',
        canResubmit ? 'Đã gửi lại báo cáo.' : 'Đã submit báo cáo.',
      );
      return true;
    } catch (e: any) {
      const message = String(e?.message || 'Không thể submit báo cáo');
      Alert.alert('Lỗi submit', message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const onSaveDraft = async () => {
    if (isEditingExisting) {
      Alert.alert(
        'Lưu nháp mới',
        'Hiện tại hệ thống chưa hỗ trợ cập nhật bản nháp hiện có. Tiếp tục sẽ tạo một bản nháp mới.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Tiếp tục',
            onPress: async () => {
              await createLog(false);
            },
          },
        ],
      );
      return;
    }

    await createLog(false);
  };

  const onSubmit = async () => {
    if (canPatchSubmit) {
      await submitExistingLog(createdLogId);
      return;
    }

    await createLog(true);
  };

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
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={fetchInitialData}
            >
              <Text style={styles.primaryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const isActionLoading = saving || submitting || analyzing || detailLoading;

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ArrowLeft size={18} color="#1F3D2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo báo cáo</Text>
        <View style={styles.backButton} pointerEvents="none" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1F3D2F" />
        </View>
      ) : error && samples.length === 0 ? (
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Form nhập liệu</Text>
            <View style={styles.card}>
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Trạng thái hiện tại</Text>
                <Text style={styles.statusValue}>
                  {normalizeStatusLabel(logStatus)}
                </Text>
                {createdLogId ? (
                  <Text style={styles.statusSubText}>
                    Log ID: {createdLogId}
                  </Text>
                ) : null}
              </View>

              {rejectionReason ? (
                <View style={styles.rejectionCard}>
                  <Text style={styles.rejectionTitle}>Lý do từ chối</Text>
                  <Text style={styles.rejectionText}>{rejectionReason}</Text>
                </View>
              ) : null}

              <View style={styles.inputWrap}>
                <Text style={styles.label}>
                  Tên báo cáo <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập tên báo cáo"
                  placeholderTextColor="#6F857A"
                />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Ghi chú báo cáo</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Nhập ghi chú báo cáo (nếu có)"
                  placeholderTextColor="#6F857A"
                  multiline
                />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.label}>
                  Sample <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setPickerVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !selectedSample && styles.selectPlaceholder,
                    ]}
                  >
                    {selectedSample?.name ?? 'Chọn mẫu đang xử lý'}
                  </Text>
                  <ChevronDown size={18} color="#1F3D2F" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>Nhật ký thí nghiệm</Text>
                <TextInput
                  style={styles.input}
                  value={selectedExperimentLogName}
                  editable={false}
                  placeholder="Tự động từ mẫu"
                  placeholderTextColor="#6F857A"
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>Giai đoạn hiện tại</Text>
                <TextInput
                  style={styles.input}
                  value={currentSampleStageName}
                  editable={false}
                  placeholder="Tự động từ chi tiết mẫu"
                  placeholderTextColor="#6F857A"
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>Ghi chú mẫu (tham chiếu)</Text>
                <View style={[styles.readonlyNoteCard, styles.textarea]}>
                  <Text style={styles.readonlyNoteText}>
                    {sampleNotes || 'Không có ghi chú mẫu.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phân tích bệnh</Text>
            <View style={styles.card}>
              <View style={styles.analysisRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    styles.actionButton,
                    isActionLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={onPickImage}
                  disabled={isActionLoading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryButtonText}>Chọn ảnh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    styles.actionButton,
                    (!selectedImage || isActionLoading) &&
                      styles.submitButtonDisabled,
                  ]}
                  onPress={onAnalyze}
                  disabled={!selectedImage || isActionLoading}
                  activeOpacity={0.85}
                >
                  {analyzing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Sparkles size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.primaryButtonText}>Phân tích</Text>
                </TouchableOpacity>
              </View>

              {selectedImage?.uri ? (
                <View style={styles.analysisPreviewWrap}>
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.analysisPreviewImage}
                  />
                  <Text style={styles.analysisPreviewText}>
                    {toText(selectedImage.fileName, 'Ảnh đã chọn')}
                  </Text>
                </View>
              ) : null}

              {analysisResult ? (
                <View style={styles.analysisResultCard}>
                  <Text style={styles.analysisResultTitle}>Kết quả AI</Text>
                  <Text style={styles.analysisResultText}>
                    Disease:{' '}
                    {toText(
                      analysisResult.diseaseName,
                      analysisResult.diseaseId,
                    )}
                  </Text>
                  <Text style={styles.analysisResultText}>
                    Analytic Result ID: {analysisResult.analyticResultId}
                  </Text>
                </View>
              ) : (
                <Text style={styles.helperText}>
                  Cần phân tích ảnh để lấy mã bệnh và mã kết quả phân tích trước khi tạo báo cáo.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chi tiết nhật ký</Text>
            <View style={styles.card}>
              {!selectedSampleId ? (
                <Text style={styles.helperText}>
                  Chọn mẫu để tải yêu cầu của giai đoạn hiện tại.
                </Text>
              ) : detailLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="small" color="#1F3D2F" />
                </View>
              ) : stageRequirements.length === 0 ? (
                <Text style={styles.helperText}>
                  Không có yêu cầu cho giai đoạn hiện tại.
                </Text>
              ) : (
                stageRequirements.map(item => (
                  <View key={item.id} style={styles.requirementCard}>
                    <Text style={styles.requirementName}>
                      {item.characteristicName}
                    </Text>
                    <Text style={styles.requirementMeta}>
                      Đơn vị: {item.unit}
                    </Text>
                    <Text style={styles.requirementMeta}>
                      Khoảng kỳ vọng: {buildExpectedRangeText(item)}
                    </Text>

                    <View style={styles.requirementInputWrap}>
                      <Text style={styles.label}>
                        Giá trị đo <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={measuredValueMap[item.id] ?? ''}
                        onChangeText={value =>
                          onChangeMeasuredValue(item.id, value)
                        }
                        keyboardType="decimal-pad"
                        placeholder="Nhập giá trị đo"
                        placeholderTextColor="#6F857A"
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hành động</Text>
            <View style={styles.card}>
              <Text style={styles.helperText}>
                Lưu nháp: lưu báo cáo ở trạng thái nháp.
              </Text>
              <Text style={styles.helperText}>
                Gửi duyệt/Gửi lại: gửi báo cáo để duyệt.
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    styles.actionButton,
                    isActionLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={onSaveDraft}
                  activeOpacity={0.85}
                  disabled={isActionLoading}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isEditingExisting ? 'Lưu nháp (Mới)' : 'Lưu nháp'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    styles.actionButton,
                    isActionLoading && styles.submitButtonDisabled,
                  ]}
                  onPress={onSubmit}
                  activeOpacity={0.85}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : canResubmit ? (
                    <SendHorizontal size={16} color="#FFFFFF" />
                  ) : (
                    <PlusCircle size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.primaryButtonText}>
                    {canResubmit ? 'Gửi lại' : 'Gửi duyệt'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditingExisting ? (
                <Text style={styles.helperText}>
                  Bạn đang sửa báo cáo đã tồn tại. Lưu nháp sẽ tạo bản nháp mới;
                  Gửi duyệt/Gửi lại sẽ gửi báo cáo hiện tại.
                </Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn mẫu đang xử lý</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={samples}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isActive = item.id === selectedSampleId;

                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      isActive && styles.optionRowActive,
                    ]}
                    onPress={() => {
                      setSelectedSampleId(item.id);
                      setPickerVisible(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.optionEmpty}>
                  Không có mẫu phù hợp để chọn.
                </Text>
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default CreateReportScreen;
