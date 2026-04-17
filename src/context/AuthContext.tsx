import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  roleId?: number;
  roleName?: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthReady: boolean;
  login: (userData: User, token?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedData: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Kiểm tra xem user đã đăng nhập từ lần mở app trước chưa
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('@user_data');
        const storedToken = await AsyncStorage.getItem('@access_token');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        if (storedToken) {
          setAccessToken(storedToken);
        }
      } catch (e) {
        console.error("Lỗi khi tải dữ liệu user", e);
      } finally {
        setIsAuthReady(true);
      }
    };
    loadUser();
  }, []);

  // Hàm gọi khi Đăng nhập thành công
  const login = async (userData: User, token?: string | null) => {
    setUser(userData);
    await AsyncStorage.setItem('@user_data', JSON.stringify(userData));

    const normalizedToken = token?.trim() || null;
    setAccessToken(normalizedToken);
    if (normalizedToken) {
      await AsyncStorage.setItem('@access_token', normalizedToken);
    } else {
      await AsyncStorage.removeItem('@access_token');
    }
  };

  // Hàm gọi khi Đăng xuất
  const logout = async () => {
    setUser(null);
    setAccessToken(null);
    await AsyncStorage.removeItem('@user_data');
    await AsyncStorage.removeItem('@access_token');
  };

  // Hàm gọi khi cập nhật trang Hồ sơ
  const updateUser = async (updatedData: User) => {
    setUser(updatedData);
    await AsyncStorage.setItem('@user_data', JSON.stringify(updatedData));
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthReady, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook tùy chỉnh để sử dụng cho tiện
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};