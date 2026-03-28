import { create } from 'zustand';

interface AttendanceRecord {
  id: number;
  checkInTime: string;
  checkOutTime: string | null;
  workHours: string | null;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  geoFenceStatus: boolean;
  distanceFromOffice: number | null;
}

interface AttendanceState {
  currentRecord: AttendanceRecord | null;
  history: AttendanceRecord[];
  stats: {
    totalCheckins: number;
    averageHours: string;
    geoFenceCompliance: string;
    lateArrivals: number;
  } | null;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  setCurrentRecord: (record: AttendanceRecord | null) => void;
  setHistory: (history: AttendanceRecord[]) => void;
  setStats: (stats: any) => void;
  setIsCheckingIn: (checkingIn: boolean) => void;
  setIsCheckingOut: (checkingOut: boolean) => void;
  addRecord: (record: AttendanceRecord) => void;
  updateRecord: (record: AttendanceRecord) => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  currentRecord: null,
  history: [],
  stats: null,
  isCheckingIn: false,
  isCheckingOut: false,
  setCurrentRecord: (record) => set({ currentRecord: record }),
  setHistory: (history) => set({ history }),
  setStats: (stats) => set({ stats }),
  setIsCheckingIn: (checkingIn) => set({ isCheckingIn: checkingIn }),
  setIsCheckingOut: (checkingOut) => set({ isCheckingOut: checkingOut }),
  addRecord: (record) => {
    const { history } = get();
    set({ history: [record, ...history] });
  },
  updateRecord: (updatedRecord) => {
    const { history } = get();
    const updatedHistory = history.map(record =>
      record.id === updatedRecord.id ? updatedRecord : record
    );
    set({ history: updatedHistory });
    
    // Also update current record if it matches
    const { currentRecord } = get();
    if (currentRecord && currentRecord.id === updatedRecord.id) {
      set({ currentRecord: updatedRecord });
    }
  },
}));