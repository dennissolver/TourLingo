import { useState, useCallback } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

export function useOperatorBroadcast() {
  const { localParticipant } = useLocalParticipant();
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const startBroadcast = useCallback(async () => {
    if (!localParticipant) return;
    
    try {
      await localParticipant.setMicrophoneEnabled(true);
      setIsBroadcasting(true);
    } catch (error) {
      console.error('Failed to start broadcast:', error);
    }
  }, [localParticipant]);

  const stopBroadcast = useCallback(async () => {
    if (!localParticipant) return;
    
    try {
      await localParticipant.setMicrophoneEnabled(false);
      setIsBroadcasting(false);
    } catch (error) {
      console.error('Failed to stop broadcast:', error);
    }
  }, [localParticipant]);

  const toggleBroadcast = useCallback(async () => {
    if (isBroadcasting) {
      await stopBroadcast();
    } else {
      await startBroadcast();
    }
  }, [isBroadcasting, startBroadcast, stopBroadcast]);

  return {
    isBroadcasting,
    startBroadcast,
    stopBroadcast,
    toggleBroadcast,
  };
}
