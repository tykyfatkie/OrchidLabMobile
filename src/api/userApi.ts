import apiClient from './apiClient'; 

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  role: string;
  createdDate?: string;
  updatedDate?: string;
}

export interface UpdateUserPayload {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
}

/** GET /api/user/{id} */
export async function fetchUserById(id: string): Promise<UserProfile> {
  // apiClient đã tự động xử lý BASE_URL và Token
  const res = await apiClient.get(`/api/user/${id}`); 
  return res.data.value as UserProfile; // Axios tự động parse JSON vào .data
}

/** POST /api/images/user — trả về URL string */
export async function uploadUserAvatar(file: {
  uri: string;
  type?: string;
  fileName?: string;
}): Promise<string> {
  const formData = new FormData();
  formData.append('image', {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: file.fileName || 'avatar.jpg',
  } as any);

  const res = await apiClient.post(`/api/images/user`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data; // Trả về chuỗi URL
}

/** PUT /api/user — cập nhật thông tin user */
export async function updateUser(payload: UpdateUserPayload): Promise<void> {
  await apiClient.put(`/api/user`, payload);
}