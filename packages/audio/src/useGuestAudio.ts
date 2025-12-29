import { useState, useCallback, useEffect } from 'react';
import { useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';

export function useGuestAudio() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Microphone]);
  
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const startQuestion = useCallback(async () => {
    if (!localParticipant) return;
    
    try {
      await localParticipant.setMicrophoneEnabled(true);
      setIsAskingQuestion(true);
    } catch (error) {
      console.error('Failed to start question:', error);
    }
  }, [localParticipant]);

  const stopQuestion = useCallback(async () => {
    if (!localParticipant) return;
    
    try {
      await localParticipant.setMicrophoneEnabled(false);
      setIsAskingQuestion(false);
    } catch (error) {
      console.error('Failed to stop question:', error);
    }
  }, [localParticipant]);

  const toggleQuestion = useCallback(async () => {
    if (isAskingQuestion) {
      await stopQuestion();
    } else {
      await startQuestion();
    }
  }, [isAskingQuestion, startQuestion, stopQuestion]);

  const muteAudio = useCallback(() => {
    setIsMuted(true);
    // Mute all incoming audio tracks
    tracks.forEach((trackRef) => {
      if (trackRef.publication?.track) {
        trackRef.publication.track.detach();
      }
    });
  }, [tracks]);

  const unmuteAudio = useCallback(() => {
    setIsMuted(false);
    // Unmute all incoming audio tracks
    tracks.forEach((trackRef) => {
      if (trackRef.publication?.track) {
        const audioElements = trackRef.publication.track.attach();
        audioElements.forEach((el) => {
          el.play().catch(console.error);
        });
      }
    });
  }, [tracks]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      unmuteAudio();
    } else {
      muteAudio();
    }
  }, [isMuted, muteAudio, unmuteAudio]);

  return {
    isAskingQuestion,
    isMuted,
    startQuestion,
    stopQuestion,
    toggleQuestion,
    muteAudio,
    unmuteAudio,
    toggleMute,
  };
}
