import { create } from 'zustand';

interface Participant {
  id: string;
  name: string;
  language: string;
  isOperator: boolean;
  isSpeaking: boolean;
}

interface TranscriptSegment {
  id: string;
  speakerName: string;
  text: string;
  timestamp: number;
}

interface TourState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Tour info
  tourId: string | null;
  tourName: string | null;

  // Participants
  participants: Participant[];

  // Audio state
  isMuted: boolean;
  isAskingQuestion: boolean;

  // Transcript
  transcript: TranscriptSegment[];

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setTourInfo: (id: string, name: string) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  setMuted: (muted: boolean) => void;
  setAskingQuestion: (asking: boolean) => void;
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  tourId: null,
  tourName: null,
  participants: [],
  isMuted: false,
  isAskingQuestion: false,
  transcript: [],
};

export const useTourStore = create<TourState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ isConnected: connected }),

  setConnecting: (connecting) => set({ isConnecting: connecting }),

  setConnectionError: (error) => set({ connectionError: error }),

  setTourInfo: (id, name) => set({ tourId: id, tourName: name }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (id) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== id),
    })),

  updateParticipant: (id, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setMuted: (muted) => set({ isMuted: muted }),

  setAskingQuestion: (asking) => set({ isAskingQuestion: asking }),

  addTranscriptSegment: (segment) =>
    set((state) => ({
      transcript: [...state.transcript, segment].slice(-50), // Keep last 50
    })),

  reset: () => set(initialState),
}));
