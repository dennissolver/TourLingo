'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useParticipants,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageCircle,
  Users,
  LogOut,
  X,
} from 'lucide-react';
import { useTourStore } from '@/stores/tourStore';
import { SUPPORTED_LANGUAGES } from '@tourlingo/types';

export default function TourRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load guest info and get LiveKit token
  useEffect(() => {
    const stored = sessionStorage.getItem('guestInfo');
    if (!stored) {
      router.push('/');
      return;
    }

    const info = JSON.parse(stored);
    if (info.tourId !== tourId) {
      router.push('/');
      return;
    }

    setGuestInfo(info);
    fetchToken(info);
  }, [tourId, router]);

  const fetchToken = async (info: any) => {
    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId: info.tourId,
          participantName: info.displayName,
          language: info.language,
          isOperator: false,
        }),
      });

      if (!res.ok) throw new Error('Failed to get token');

      const { token } = await res.json();
      setToken(token);
    } catch (err) {
      setError('Failed to connect to tour');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!token || !guestInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Connecting to tour...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={true}
      audio={false}
      video={false}
      onDisconnected={() => router.push('/')}
    >
      <TourRoomContent guestInfo={guestInfo} />
    </LiveKitRoom>
  );
}

function TourRoomContent({ guestInfo }: { guestInfo: any }) {
  const router = useRouter();
  const room = useRoomContext();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Microphone]);

  const [isMuted, setIsMuted] = useState(true);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === guestInfo.language);

  // Handle incoming translated audio
  useEffect(() => {
    // Subscribe to translated audio track for this guest's language
    // Implementation depends on translation pipeline setup
  }, [guestInfo.language]);

  const handleAskQuestion = async () => {
    if (isAskingQuestion) {
      // Stop asking
      await room.localParticipant.setMicrophoneEnabled(false);
      setIsAskingQuestion(false);
    } else {
      // Start asking
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsAskingQuestion(true);
    }
  };

  const handleLeave = () => {
    room.disconnect();
    sessionStorage.removeItem('guestInfo');
    router.push('/');
  };

  const operatorCount = participants.filter(
    (p) => JSON.parse(p.metadata || '{}').isOperator
  ).length;

  const guestCount = participants.length - operatorCount;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">Live</span>
          </div>
          <h1 className="font-semibold">Tour</h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{language?.flag}</span>
          <span className="text-sm text-gray-300">{language?.name}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Audio Visualization */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              {isMuted ? (
                <VolumeX className="w-16 h-16 text-gray-600" />
              ) : (
                <Volume2 className="w-16 h-16 text-primary-400 animate-pulse" />
              )}
            </div>
            <p className="text-gray-400">
              {isMuted ? 'Audio muted' : 'Listening to guide...'}
            </p>
          </div>
        </div>

        {/* Transcript (optional) */}
        {transcript.length > 0 && (
          <div className="bg-gray-800 mx-4 mb-4 rounded-lg p-4 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-300">
              {transcript[transcript.length - 1]}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="bg-gray-800 p-4 safe-bottom">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* Mute/Unmute Audio */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isMuted ? 'bg-gray-700' : 'bg-primary-600'
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>

            {/* Ask Question */}
            <button
              onClick={handleAskQuestion}
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isAskingQuestion
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-primary-600'
              }`}
            >
              {isAskingQuestion ? (
                <MicOff className="w-7 h-7" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </button>

            {/* Participants */}
            <button
              onClick={() => setShowParticipants(true)}
              className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center relative"
            >
              <Users className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full text-xs flex items-center justify-center">
                {guestCount}
              </span>
            </button>

            {/* Leave */}
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>

          {isAskingQuestion && (
            <p className="text-center text-sm text-red-400 mt-3">
              Tap microphone to stop speaking
            </p>
          )}
        </div>
      </div>

      {/* Participants Modal */}
      {showParticipants && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-gray-800 w-full rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Participants ({participants.length})</h2>
              <button onClick={() => setShowParticipants(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2">
              {participants.map((p) => {
                const meta = JSON.parse(p.metadata || '{}');
                const lang = SUPPORTED_LANGUAGES.find((l) => l.code === meta.language);
                return (
                  <div
                    key={p.identity}
                    className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{lang?.flag || '🌐'}</span>
                      <span>{p.name || p.identity}</span>
                      {meta.isOperator && (
                        <span className="text-xs bg-primary-600 px-2 py-0.5 rounded">
                          Guide
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2">Leave Tour?</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to leave this tour?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="btn btn-secondary flex-1"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
