import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { ArrowLeft, CalendarDays, Camera, CircleCheck, CircleDashed, ImagePlus, UserRound, X } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { API_URL } from '@env';

import { CustomTabBar } from '../../components/CustomTabBar';
import { taskDetailStyles as styles } from './taskDetailStyles';
import { translateChecklistStatusVi, translateTaskStatusVi } from '../../utils/statusTranslations';
import { useAuth } from '../../context/AuthContext';

interface TaskAttribute {
  chemicalName: string | null;
  materialName: string | null;
  unit: string | null;
  value: number | string | null;
}

interface CheckListItem {
  id: string;
  name: string;
  description: string | null;
  order: number;
  expectedUnit: string | null;
  expectedMinValue: number | null;
  expectedMaxValue: number | null;
  status: string;
  measurementUnit?: string | null;
  measuredValue?: number | string | null;
  mesuredValue?: number | string | null;
  evidenceImageUrls?: string[];
}

interface TaskDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  createdBy: string | null;
  createdDate: string | null;
  taskAttributes: TaskAttribute[] | null;
  taskCheckList: {
    id: string;
    checkListItemDtos: CheckListItem[];
  } | null;
}

interface ItemDraftState {
  measuredValue: string;
  measurementUnit: string;
  selectedImages: Asset[];
  editing: boolean; // thêm flag để kiểm soát hiển thị form
}

const getTaskStatusStyle = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'template') return styles.statusTemplate;
  if (normalized === 'inprogress' || normalized === 'assigned' || normalized === 'reworkrequired') {
    return styles.statusInProgress;
  }
  if (normalized === 'completedintime' || normalized === 'completedouttime') return styles.statusDone;
  return styles.statusPending;
};

const getChecklistStatusStyle = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'inprogress') return styles.statusInProgress;
  if (normalized === 'complete') return styles.statusDone;
  if (normalized === 'failed') return styles.statusPending;
  return styles.statusPending;
};

const isChecklistCompleteStatus = (status: string) => {
  return status.toLowerCase() === 'complete';
};

const getExpectedText = (item: CheckListItem) => {
  const unit = item.expectedUnit ? ` ${item.expectedUnit}` : '';
  if (item.expectedMinValue !== null && item.expectedMaxValue !== null) {
    return `${item.expectedMinValue} - ${item.expectedMaxValue}${unit}`;
  }
  if (item.expectedMinValue !== null) return `>= ${item.expectedMinValue}${unit}`;
  if (item.expectedMaxValue !== null) return `<= ${item.expectedMaxValue}${unit}`;
  return 'Không yêu cầu đo';
};

const formatDate = (iso: string | null) => {
  if (!iso || iso.startsWith('0001-01-01')) return 'N/A';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return `${parsed.getDate().toString().padStart(2, '0')}/${(parsed.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${parsed.getFullYear()}`;
};

const cleanBaseUrl = String(API_URL).trim().replace(/\/+$/, '');

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

const parseMeasuredValue = (input: string) => {
  const trimmed = input.trim();
  const num = Number(trimmed);
  if (!Number.isNaN(num)) return num;
  return trimmed;
};

const TaskDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accessToken } = useAuth();
  const taskId = route.params?.taskId as string | undefined;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [checkItems, setCheckItems] = useState<CheckListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftMap, setDraftMap] = useState<Record<string, ItemDraftState>>({});
  const [startingItemId, setStartingItemId] = useState<string | null>(null);
  const [activeModalItemId, setActiveModalItemId] = useState<string | null>(null);
  const [completingItemId, setCompletingItemId] = useState<string | null>(null);

  const getAuthHeaders = useCallback(
    (withJsonContentType?: boolean) => {
      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (withJsonContentType) headers['Content-Type'] = 'application/json';
      return headers;
    },
    [accessToken],
  );

  const fetchDetail = useCallback(async () => {
    if (!taskId) {
      setError('Không tìm thấy taskId để tải chi tiết công việc.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${cleanBaseUrl}/api/tasks/${taskId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, 'Không thể tải chi tiết công việc');
        throw new Error(message);
      }
      const raw = await res.text();
      const json = raw ? JSON.parse(raw) : null;
      setTask(json as TaskDetail);
      const fetchedItems = (json?.taskCheckList?.checkListItemDtos ?? []) as CheckListItem[];
      setCheckItems(fetchedItems.sort((a, b) => a.order - b.order));
    } catch (e: any) {
      setError(String(e?.message || 'Không thể kết nối tới máy chủ'));
    } finally {
      setLoading(false);
    }
  }, [taskId, getAuthHeaders]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const isRequestApprovalEnabled = useMemo(() => {
    if (checkItems.length === 0) return false;
    return checkItems.every((item) => isChecklistCompleteStatus(item.status));
  }, [checkItems]);

  const activeModalItem = useMemo(
    () => checkItems.find((item) => item.id === activeModalItemId) ?? null,
    [activeModalItemId, checkItems],
  );

  const getItemDraft = useCallback(
    (item: CheckListItem): ItemDraftState => {
      if (item.id in draftMap) return draftMap[item.id];
      return {
        measuredValue: String(item.measuredValue ?? item.mesuredValue ?? ''),
        measurementUnit: item.measurementUnit ?? '',
        selectedImages: [],
        editing: false,
      };
    },
    [draftMap],
  );

  const updateDraft = useCallback((itemId: string, next: Partial<ItemDraftState>) => {
    setDraftMap((prev) => {
      const current = prev[itemId] ?? {
        measuredValue: '',
        measurementUnit: '',
        selectedImages: [],
        editing: false,
      };
      return { ...prev, [itemId]: { ...current, ...next } };
    });
  }, []);

  const handleStartItem = useCallback(
    async (itemId: string) => {
      if (!taskId) return;
      setStartingItemId(itemId);
      try {
        const res = await fetch(`${cleanBaseUrl}/api/tasks/${taskId}/checklist-items/${itemId}`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          const message = await parseErrorMessage(res, `Không thể bắt đầu checklist item (HTTP ${res.status})`);
          throw new Error(message);
        }
        setCheckItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, status: 'InProgress' } : item)),
        );
        // Tự động mở form sau khi bắt đầu
        updateDraft(itemId, { editing: true, measuredValue: '', measurementUnit: '', selectedImages: [] });
      } catch (e: any) {
        Alert.alert('Lỗi', String(e?.message || 'Không thể bắt đầu checklist item'));
      } finally {
        setStartingItemId(null);
      }
    },
    [taskId, getAuthHeaders, updateDraft],
  );

  // Hủy: ẩn form, giữ nguyên status InProgress
  const handleCancelEdit = useCallback((itemId: string) => {
    setDraftMap((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const handleOpenEvidenceModal = useCallback(
    (item: CheckListItem) => {
      const draft = getItemDraft(item);
      if (!draft.measuredValue.trim()) {
        Alert.alert('Thiếu dữ liệu', 'Vui lòng nhập giá trị đo trước khi hoàn thành.');
        return;
      }
      setActiveModalItemId(item.id);
    },
    [getItemDraft],
  );

  const appendAssets = useCallback(
    (itemId: string, assets?: Asset[]) => {
      if (!assets || assets.length === 0) return;
      updateDraft(itemId, {
        selectedImages: [...(draftMap[itemId]?.selectedImages ?? []), ...assets.filter((a) => !!a.uri)],
      });
    },
    [draftMap, updateDraft],
  );

  const handleTakePhoto = useCallback(() => {
    if (!activeModalItemId) return;
    launchCamera({ mediaType: 'photo', saveToPhotos: false }, (result) => {
      if (result.didCancel) return;
      if (result.errorMessage) { Alert.alert('Lỗi', result.errorMessage); return; }
      appendAssets(activeModalItemId, result.assets);
    });
  }, [activeModalItemId, appendAssets]);

  const handlePickFromGallery = useCallback(() => {
    if (!activeModalItemId) return;
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 0 }, (result) => {
      if (result.didCancel) return;
      if (result.errorMessage) { Alert.alert('Lỗi', result.errorMessage); return; }
      appendAssets(activeModalItemId, result.assets);
    });
  }, [activeModalItemId, appendAssets]);

  const handleRemoveSelectedImage = useCallback(
    (itemId: string, indexToRemove: number) => {
      const current = draftMap[itemId]?.selectedImages ?? [];
      updateDraft(itemId, { selectedImages: current.filter((_, idx) => idx !== indexToRemove) });
    },
    [draftMap, updateDraft],
  );

  const uploadEvidenceImage = useCallback(
    async (asset: Asset) => {
      if (!taskId || !asset.uri) throw new Error('Dữ liệu ảnh không hợp lệ');
      const form = new FormData();
      form.append('image', {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        name: asset.fileName ?? `evidence_${Date.now()}.jpg`,
      } as any);
      form.append('targetType', 'Task');
      form.append('targetId', taskId);
      const res = await fetch(`${cleanBaseUrl}/api/images`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: form,
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, 'Upload ảnh thất bại');
        throw new Error(message);
      }
      const raw = await res.text();
      if (!raw) return '';
      try {
        const json = JSON.parse(raw);
        return String(json?.url || json?.value || json?.imageUrl || '');
      } catch {
        return raw;
      }
    },
    [taskId, getAuthHeaders],
  );

  const handleCompleteItem = useCallback(async () => {
    if (!taskId || !activeModalItem) return;
    const draft = getItemDraft(activeModalItem);
    if (!draft.measuredValue.trim()) {
      Alert.alert('Thiếu dữ liệu', 'measuredValue là bắt buộc.');
      return;
    }
    if (draft.selectedImages.length === 0) {
      Alert.alert('Thiếu minh chứng', 'Vui lòng thêm ít nhất 1 ảnh trước khi hoàn thành.');
      return;
    }
    setCompletingItemId(activeModalItem.id);
    try {
      const uploadedUrls: string[] = [];
      for (const image of draft.selectedImages) {
        const imageUrl = await uploadEvidenceImage(image);
        if (imageUrl) uploadedUrls.push(imageUrl);
      }
      const payload = {
        measurementUnit: draft.measurementUnit.trim() || null,
        measuredValue: parseMeasuredValue(draft.measuredValue),
      };
      const completeRes = await fetch(
        `${cleanBaseUrl}/api/tasks/${taskId}/checklist-items/${activeModalItem.id}/update-actual-value`,
        { method: 'PUT', headers: getAuthHeaders(true), body: JSON.stringify(payload) },
      );
      if (!completeRes.ok) {
        const message = await parseErrorMessage(completeRes, 'Không thể hoàn thành checklist item');
        throw new Error(message);
      }
      setCheckItems((prev) =>
        prev.map((item) =>
          item.id === activeModalItem.id
            ? {
                ...item,
                status: 'Complete',
                measurementUnit: payload.measurementUnit,
                measuredValue: payload.measuredValue as string | number,
                evidenceImageUrls: uploadedUrls,
              }
            : item,
        ),
      );
      // Xóa draft sau khi hoàn thành
      setDraftMap((prev) => {
        const next = { ...prev };
        delete next[activeModalItem.id];
        return next;
      });
      setActiveModalItemId(null);
      Alert.alert('Thành công', 'Checklist item đã được hoàn thành.');
    } catch (e: any) {
      Alert.alert('Lỗi', String(e?.message || 'Không thể hoàn thành checklist item'));
    } finally {
      setCompletingItemId(null);
    }
  }, [activeModalItem, getItemDraft, taskId, uploadEvidenceImage, getAuthHeaders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <ImageBackground source={require('../../assets/images/background.jpg')} style={styles.bg} resizeMode="cover">
          <LinearGradient colors={['rgba(223,231,223,0.85)', 'rgba(242,246,242,0.85)']} style={styles.bgGradient} />
        </ImageBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1F3D2F" />
          <Text style={styles.loadingText}>Đang tải chi tiết công việc...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !task) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <ImageBackground source={require('../../assets/images/background.jpg')} style={styles.bg} resizeMode="cover">
          <LinearGradient colors={['rgba(223,231,223,0.85)', 'rgba(242,246,242,0.85)']} style={styles.bgGradient} />
        </ImageBackground>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Không có dữ liệu task.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDetail} activeOpacity={0.85}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ImageBackground source={require('../../assets/images/background.jpg')} style={styles.bg} resizeMode="cover">
        <LinearGradient colors={['rgba(223,231,223,0.85)', 'rgba(242,246,242,0.85)']} style={styles.bgGradient} />
      </ImageBackground>

      <View style={styles.headerWrap}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={20} color="#1F3D2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết công việc</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
          <View style={styles.card}>
            <Text style={styles.taskTitle}>{task.name}</Text>
            <Text style={styles.taskDescription}>{task.description || 'Không có mô tả'}</Text>
            <Text style={styles.metaText}>Task ID: {task.id || 'N/A'}</Text>
            <View style={styles.rowBetween}>
              <View style={[styles.statusTag, getTaskStatusStyle(task.status)]}>
                <Text style={styles.statusText}>{translateTaskStatusVi(task.status || 'Unknown')}</Text>
              </View>
            </View>
            <Text style={styles.metaText}>Người tạo: {task.createdBy || 'N/A'}</Text>
            <Text style={styles.metaText}>Ngày tạo: {formatDate(task.createdDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hóa chất & Nguyên vật liệu cần sử dụng</Text>
          <View style={styles.card}>
            {(task.taskAttributes ?? []).length === 0 ? (
              <Text style={styles.emptyText}>Không có hóa chất hoặc nguyên vật liệu nào.</Text>
            ) : (
              (task.taskAttributes ?? []).map((attr, idx) => {
                const name = attr.chemicalName || attr.materialName || 'N/A';
                const value = attr.value !== null ? String(attr.value) : 'N/A';
                const unit = attr.unit ? ` ${attr.unit}` : '';
                return (
                  <View
                    key={`${name}-${idx}`}
                    style={[
                      styles.attributeRow,
                      idx === (task.taskAttributes?.length ?? 0) - 1 ? styles.attributeRowLast : null,
                    ]}
                  >
                    <Text style={styles.attributeName}>{name}</Text>
                    <Text style={styles.attributeValue}>{`${value}${unit}`}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiêu chí đánh giá (Checklist)</Text>
          <View style={styles.card}>
            {checkItems.length === 0 ? (
              <Text style={styles.emptyText}>Không có checklist.</Text>
            ) : (
              checkItems.map((item) => {
                const isDone = isChecklistCompleteStatus(item.status);
                const isInProgress = item.status?.toLowerCase() === 'inprogress';
                const draft = getItemDraft(item);
                // Form chỉ hiện khi đang InProgress VÀ editing = true
                const showEditor = isInProgress && draft.editing;

                return (
                  <View key={item.id} style={styles.checklistItem}>
                    <View style={styles.checklistTop}>
                      <View style={styles.orderBubble}>
                        <Text style={styles.orderText}>{item.order}</Text>
                      </View>
                      <Text style={styles.checklistName}>{item.name}</Text>
                      {isDone ? (
                        <CircleCheck size={18} color="#4E8B62" />
                      ) : (
                        <CircleDashed size={18} color="#D08A27" />
                      )}
                    </View>
                    <Text style={styles.checklistMeta}>Mốc đo: {getExpectedText(item)}</Text>
                    <View style={styles.checklistStatusRow}>
                      <Text style={styles.checklistMeta}>Trạng thái:</Text>
                      <View style={[styles.statusTag, styles.checklistStatusTag, getChecklistStatusStyle(item.status)]}>
                        <Text style={styles.statusText}>{translateChecklistStatusVi(item.status || 'Pending')}</Text>
                      </View>
                    </View>

                    {item.status.toLowerCase() === 'pending' && (
                      <TouchableOpacity
                        style={[styles.primaryButton, styles.checklistActionSpacing]}
                        onPress={() => handleStartItem(item.id)}
                        activeOpacity={0.85}
                        disabled={startingItemId === item.id}
                      >
                        {startingItemId === item.id ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Bắt đầu</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Nút mở form khi InProgress nhưng chưa editing */}
                    {isInProgress && !showEditor && (
                      <TouchableOpacity
                        style={[styles.primaryButton, styles.checklistActionSpacing]}
                        onPress={() => updateDraft(item.id, { editing: true })}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.primaryButtonText}>Nhập kết quả</Text>
                      </TouchableOpacity>
                    )}

                    {showEditor && (
                      <View style={styles.editorWrap}>
                        <Text style={styles.inputLabel}>Measured Value *</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="decimal-pad"
                          placeholder="Nhập giá trị đo"
                          placeholderTextColor="#6C7F73"
                          value={draft.measuredValue}
                          onChangeText={(value) => updateDraft(item.id, { measuredValue: value })}
                        />
                        <Text style={styles.inputLabel}>Measurement Unit (tùy chọn)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ví dụ: pH, mg/L"
                          placeholderTextColor="#6C7F73"
                          value={draft.measurementUnit}
                          onChangeText={(value) => updateDraft(item.id, { measurementUnit: value })}
                        />
                        <View style={styles.rowActions}>
                          <TouchableOpacity
                            style={[styles.secondaryButton, styles.actionHalf]}
                            onPress={() => handleCancelEdit(item.id)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.secondaryButtonText}>Hủy</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.primaryButton, styles.actionHalf]}
                            onPress={() => handleOpenEvidenceModal(item)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.primaryButtonText}>Hoàn thành</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {isDone && (
                      <View style={styles.completeInfoWrap}>
                        <Text style={styles.checklistMeta}>
                          Measured: {String(item.measuredValue ?? item.mesuredValue ?? 'N/A')}
                          {item.measurementUnit ? ` ${item.measurementUnit}` : ''}
                        </Text>
                        {(item.evidenceImageUrls ?? []).length > 0 ? (
                          <View style={styles.evidenceGrid}>
                            {(item.evidenceImageUrls ?? []).map((url, idx) => (
                              <Image key={`${item.id}-evidence-${idx}`} source={{ uri: url }} style={styles.evidenceImage} />
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.checklistMeta}>Chưa có ảnh minh chứng.</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.requestApprovalButton, !isRequestApprovalEnabled ? styles.requestApprovalButtonDisabled : null]}
            disabled={!isRequestApprovalEnabled}
            onPress={() => Alert.alert('Sẵn sàng', 'Tất cả checklist item đã hoàn thành, bạn có thể gửi duyệt.')}
            activeOpacity={0.9}
          >
            <Text style={[styles.requestApprovalText, !isRequestApprovalEnabled ? styles.requestApprovalTextDisabled : null]}>
              Yêu cầu duyệt
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.checklistTop}>
              <UserRound size={16} color="#1F3D2F" />
              <Text style={[styles.checklistName, styles.systemTitleText]}>Thông tin hệ thống</Text>
            </View>
            <View style={[styles.checklistTop, styles.systemRow]}>
              <CalendarDays size={16} color="#1F3D2F" />
              <Text style={[styles.checklistMeta, styles.systemMetaText]}>
                Cập nhật lần cuối: {formatDate(task.createdDate)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={!!activeModalItem}
        onRequestClose={() => (completingItemId ? null : setActiveModalItemId(null))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Minh Chứng</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setActiveModalItemId(null)}
                disabled={!!completingItemId}
                activeOpacity={0.8}
              >
                <X size={18} color="#1F3D2F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>Thêm ảnh trước khi hoàn thành checklist item.</Text>
            {activeModalItem ? (
              <>
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.actionHalf]}
                    onPress={handleTakePhoto}
                    activeOpacity={0.85}
                    disabled={!!completingItemId}
                  >
                    <Camera size={16} color="#1F3D2F" />
                    <Text style={styles.secondaryButtonText}>Chụp ảnh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.actionHalf]}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.85}
                    disabled={!!completingItemId}
                  >
                    <ImagePlus size={16} color="#1F3D2F" />
                    <Text style={styles.secondaryButtonText}>Thư viện</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Ảnh đã chọn</Text>
                  <Text style={styles.previewCount}>{getItemDraft(activeModalItem).selectedImages.length} ảnh</Text>
                </View>
                <View style={styles.evidenceGrid}>
                  {getItemDraft(activeModalItem).selectedImages.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa chọn ảnh.</Text>
                  ) : (
                    getItemDraft(activeModalItem).selectedImages.map((asset, idx) => (
                      <View key={`${asset.uri}-${idx}`} style={styles.selectedImageWrap}>
                        <Image source={{ uri: asset.uri }} style={styles.evidenceImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveSelectedImage(activeModalItem.id, idx)}
                          disabled={!!completingItemId}
                          activeOpacity={0.8}
                        >
                          <X size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.modalSubmitSpacing]}
                  onPress={handleCompleteItem}
                  activeOpacity={0.88}
                  disabled={!!completingItemId}
                >
                  {completingItemId ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Upload và Hoàn thành</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <CustomTabBar />
    </SafeAreaView>
  );
};

export default TaskDetailScreen;