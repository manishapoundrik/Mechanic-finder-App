import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '@/lib/query-client';


export interface MechanicProfile {
  id: string;
  shopName: string;
  specialty: string;
  phone: string;
  status: string;
  rating: string;
  totalJobs: number;
  workingHours: string;
  latitude: string;
  longitude: string;
  address: string;
}

export interface UserData {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'customer' | 'mechanic';
  createdAt?: string;
  mechanic?: MechanicProfile | null;
}

interface AuthContextValue {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: UserData }>;
  register: (data: {
    email: string;
    password: string;
    username: string;
    fullName: string;
    phone?: string;
    role: 'customer' | 'mechanic';
    shopName?: string;
    specialty?: string;
    address?: string;
    workingHours?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string; username?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem('auth_token', token);
  } else {
    await SecureStore.setItemAsync('auth_token', token);
  }
}

async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('auth_token');
    }
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
}

async function removeToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem('auth_token');
  } else {
    await SecureStore.deleteItemAsync('auth_token');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await getToken();
      if (storedToken) {
        setToken(storedToken);
        const res = await apiRequest('GET', '/api/user/profile', undefined, storedToken);
        const profileData = await res.json();
        setUser(profileData);
      }
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<{ user: UserData }> {
    const res = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await res.json();
    await storeToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return { user: data.user };
  }

  async function register(regData: {
    email: string;
    password: string;
    username: string;
    fullName: string;
    phone?: string;
    role: 'customer' | 'mechanic';
    shopName?: string;
    specialty?: string;
    address?: string;
    workingHours?: string;
  }) {
    const res = await apiRequest('POST', '/api/auth/register', regData);
    const data = await res.json();
    await storeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await removeToken();
    setToken(null);
    setUser(null);
  }

  async function refreshProfile() {
    if (!token) return;
    try {
      const res = await apiRequest('GET', '/api/user/profile', undefined, token);
      const profileData = await res.json();
      setUser(profileData);
    } catch {
      // silent
    }
  }

  async function updateProfile(data: { fullName?: string; phone?: string; username?: string }) {
    if (!token) return;
    const res = await apiRequest('PUT', '/api/user/profile', data, token);
    const updated = await res.json();
    setUser((prev) => ({ ...prev!, ...updated }));
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      register,
      logout,
      refreshProfile,
      updateProfile,
    }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
