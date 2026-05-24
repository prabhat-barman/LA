import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getItem, setItem } from '../utils/secureStorage';
import apiClient from '../services/apiClient';
import { logger } from '../services/logger';
import { API_ENDPOINTS } from '../config/apiConfig';

export interface User {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  image?: string;
  imageFile?: { uri: string; type?: string; name?: string; fileName?: string };
  timezone?: string;
  location?: string;
  country?: string;
  language?: string;
  score?: number | string;
  country_citizenship?: string;
  country_residence?: string;
  lang?: string;
  exam_date?: string | null;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => Promise<void>;
  updateExamDate: (examDate: string) => Promise<void>;
  clearUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data from local secure storage
  const loadUser = useCallback(async () => {
    try {
      const cachedStr = await getItem('user_data');
      if (cachedStr) {
        const data = JSON.parse(cachedStr);
        const normalizedData = {
          ...data,
          language: data.language || data.lang || 'English - UK',
          location: data.location || data.country_citizenship || data.country_residence || data.country || '',
        };
        setUser(normalizedData);
      }
    } catch (err) {
      logger.warn('Failed to load user from secure storage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch fresh user profile from backend
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USER_PROFILE);
      const data = response.data?.user || response.data?.data?.user || response.data?.data || response.data;
      if (data) {
        // Normalize fields for UI compatibility
        const normalizedData = {
          ...data,
          language: data.language || data.lang || 'English - UK',
          location: data.location || data.country_citizenship || data.country_residence || data.country || '',
        };
        setUser(normalizedData);
        await setItem('user_data', JSON.stringify(normalizedData));
      }
    } catch (err) {
      logger.warn('Failed to refresh user profile from API:', err);
    }
  }, []);

  // Save changes locally and sync with backend endpoints
  const updateUser = useCallback(async (updatedFields: Partial<User>) => {
    try {
      // 1. Optimistic local update
      const optimisticFields = { ...updatedFields };
      if (updatedFields.imageFile) {
        optimisticFields.image = updatedFields.imageFile.uri;
      }
      const updatedUser = { ...user, ...optimisticFields };
      setUser(updatedUser);
      await setItem('user_data', JSON.stringify(updatedUser));

      // 2. Prepare payload for the server with keys matching backend requirements
      const payload: any = {
        first_name: updatedFields.first_name !== undefined ? updatedFields.first_name : user?.first_name || '',
        last_name: updatedFields.last_name !== undefined ? updatedFields.last_name : user?.last_name || '',
        email: updatedFields.email !== undefined ? updatedFields.email : user?.email || '',
        phone: updatedFields.phone !== undefined ? updatedFields.phone : (user?.phone || user?.phone_number || ''),
        timezone: updatedFields.timezone !== undefined ? updatedFields.timezone : user?.timezone || '',
        
        // Mapped backend fields
        lang: updatedFields.language !== undefined ? updatedFields.language : user?.language || user?.lang || 'English - UK',
        score: updatedFields.score !== undefined ? updatedFields.score : user?.score || '79+',
        country_citizenship: updatedFields.location !== undefined ? updatedFields.location : user?.location || user?.country_citizenship || user?.country || '',
        country_residence: updatedFields.location !== undefined ? updatedFields.location : user?.location || user?.country_residence || user?.country || '',
      };

      // 3. Post to saveUser endpoint (as FormData if imageFile is present)
      let requestData: any = payload;
      if (updatedFields.imageFile) {
        const formData = new FormData();
        formData.append('first_name', payload.first_name);
        formData.append('last_name', payload.last_name);
        formData.append('email', payload.email);
        formData.append('phone', payload.phone);
        formData.append('timezone', payload.timezone);
        formData.append('lang', payload.lang);
        formData.append('score', String(payload.score));
        formData.append('country_citizenship', payload.country_citizenship);
        formData.append('country_residence', payload.country_residence);
        formData.append('image', {
          uri: updatedFields.imageFile.uri,
          name: updatedFields.imageFile.fileName || updatedFields.imageFile.name || 'profile.jpg',
          type: updatedFields.imageFile.type || 'image/jpeg',
        } as any);
        requestData = formData;
      }

      await apiClient.post(API_ENDPOINTS.USER_PROFILE_UPDATE, requestData);

      // 4. Additionally, keep names updated in name-specific endpoint
      if (updatedFields.first_name !== undefined || updatedFields.last_name !== undefined) {
        try {
          await apiClient.post(API_ENDPOINTS.UPDATE_NAME, {
            first_name: payload.first_name,
            last_name: payload.last_name,
          });
        } catch (nameErr) {
          logger.warn('Silent update-name failed:', nameErr);
        }
      }

      // 5. Refresh from server to sync state
      await refreshUser();
    } catch (err: any) {
      logger.error(err, 'Failed to update user details');
      if (err && err.response) {
        logger.warn('API Error response', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers,
        });
      }
      if (err && err.config) {
        logger.warn('API Error request', {
          url: err.config.url,
          data: err.config.data,
        });
      }
      // Revert from storage on failure
      await loadUser();
      throw err;
    }
  }, [user, loadUser, refreshUser]);

  // Persist exam date via dedicated endpoint and keep local state in sync
  const updateExamDate = useCallback(async (examDate: string) => {
    const previous = user;
    try {
      const optimisticUser = { ...(user || {}), exam_date: examDate };
      setUser(optimisticUser);
      await setItem('user_data', JSON.stringify(optimisticUser));

      await apiClient.post(API_ENDPOINTS.UPDATE_EXAM_DATE, {
        exam_date: examDate,
      });

      await refreshUser();
    } catch (err: any) {
      logger.error(err, 'Failed to update exam date');
      if (previous) {
        setUser(previous);
        await setItem('user_data', JSON.stringify(previous));
      }
      throw err;
    }
  }, [user, refreshUser]);

  // Clear context state on logout
  const clearUser = useCallback(async () => {
    setUser(null);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Propagate the user identifier to Crashlytics so crash reports are
  // grouped per-user. No-op when Firebase is not yet linked. We use the
  // numeric id when available and fall back to email so anonymized
  // installs still group cleanly.
  useEffect(() => {
    if (!user) return;
    const id = user.id != null ? String(user.id) : user.email ?? '';
    if (id) logger.setUserId(id);
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    loading,
    loadUser,
    refreshUser,
    updateUser,
    updateExamDate,
    clearUser,
  }), [user, loading, loadUser, refreshUser, updateUser, updateExamDate, clearUser]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
