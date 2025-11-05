
export interface AttendanceRecord {
  id: string;
  email: string;
  timestamp: string;
  photoDataUrl: string;
  latitude: number;
  longitude: number;
  address: string;
}

export enum AppStep {
  IDLE = 'IDLE',
  CAPTURING_PHOTO = 'CAPTURING_PHOTO',
  CONFIRMING = 'CONFIRMING',
}
