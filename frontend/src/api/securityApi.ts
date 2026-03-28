import api from '@services/api';
import { AxiosResponse } from 'axios';

export interface SecurityEvent {
  id: number;
  employee_id: number | null;
  event_type: string;
  timestamp: string;
  ip_address: string;
  device_info: string;
  details: string;
  severity: string;
  employee?: {
    employee_id: string;
    first_name: string;
    last_name: string;
  };
}

export interface LoginLog {
  id: number;
  employee_id: number;
  success: boolean;
  spoof_detected: boolean;
  spoof_confidence: number | null;
  challenge_passed: boolean | null;
  face_embedding: number[] | null;
  ip_address: string;
  device_info: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  error_details: string | null;
  timestamp: string;
  employee?: {
    employee_id: string;
    first_name: string;
    last_name: string;
  };
}

export interface SystemLog {
  id: number;
  service_name: string;
  log_level: string;
  message: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export const securityApi = {
  getSecurityEvents: async (limit: number = 50): Promise<AxiosResponse<SecurityEvent[]>> => {
    const response = await api.get(`/security/events?limit=${limit}`);
    return response;
  },

  getLoginLogs: async (limit: number = 50): Promise<AxiosResponse<LoginLog[]>> => {
    const response = await api.get(`/security/login-logs?limit=${limit}`);
    return response;
  },

  getSystemLogs: async (limit: number = 50): Promise<AxiosResponse<SystemLog[]>> => {
    const response = await api.get(`/security/system-logs?limit=${limit}`);
    return response;
  },

  getSpoofAttempts: async (limit: number = 50): Promise<AxiosResponse<LoginLog[]>> => {
    const response = await api.get(`/security/spoof-attempts?limit=${limit}`);
    return response;
  },

  getGeoFenceViolations: async (limit: number = 50): Promise<AxiosResponse<any[]>> => {
    const response = await api.get(`/security/geofence-violations?limit=${limit}`);
    return response;
  },
};