import axios from 'axios';
import { API_URL } from '@env';

const apiClient = axios.create({
  baseURL: API_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Tự động đính kèm Token (nếu có) vào mọi request gửi đi
apiClient.interceptors.request.use(
  async (config) => {
    // Thêm logic lấy JWT token ở đây nếu cần thiết
    // ví dụ: const token = await AsyncStorage.getItem('userToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;