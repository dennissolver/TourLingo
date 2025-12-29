import { useState, useCallback } from 'react';

interface TourRoomOptions {
  tourId: string;
  participantName: string;
  language: string;
  isOperator: boolean;
}

interface TourRoomState {
  token: string | null;
  isConnecting: boolean;
  error: string | null;
}

export function useTourRoom(options: TourRoomOptions) {
  const [state, setState] = useState<TourRoomState>({
    token: null,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: options.tourId,
          participantName: options.participantName,
          language: options.language,
          isOperator: options.isOperator,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get connection token');
      }

      const { token } = await res.json();
      setState({ token, isConnecting: false, error: null });

      return token;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      setState((prev) => ({ ...prev, isConnecting: false, error: message }));
      return null;
    }
  }, [options]);

  const disconnect = useCallback(() => {
    setState({ token: null, isConnecting: false, error: null });
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}
