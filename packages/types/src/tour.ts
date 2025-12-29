export type TourStatus = 'created' | 'waiting' | 'live' | 'ended' | 'archived';

export interface Tour {
  id: string;
  operatorId: string;
  name: string;
  accessCode: string;
  status: TourStatus;
  maxGuests: number;
  livekitRoomName?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTourInput {
  name: string;
  operatorId: string;
  maxGuests?: number;
}

export interface UpdateTourInput {
  name?: string;
  status?: TourStatus;
  startedAt?: string;
  endedAt?: string;
}

export interface TourArchive {
  id: string;
  tourId: string;
  durationSeconds: number;
  guestCount: number;
  languages: string[];
  questionCount: number;
  operatorAudioUrl?: string;
  createdAt: string;
}

export interface TranscriptSegment {
  id: string;
  archiveId: string;
  speakerId: string;
  speakerName: string;
  speakerRole: 'operator' | 'guest';
  originalText: string;
  originalLanguage: string;
  translations: Record<string, string>;
  timestampMs: number;
  durationMs?: number;
  isQuestion: boolean;
  createdAt: string;
}
