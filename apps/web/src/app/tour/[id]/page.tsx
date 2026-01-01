'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useParticipants,
  AudioTrack,
} from '@livekit/components-react';
import { Track, RemoteTrack, RemoteTrackPublication } from 'livekit-client';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Users,
  LogOut,
  X,
} from 'lucide-react';
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
      audio={true}
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

  // Get all audio tracks (microphone tracks from operators)
  const audioTracks = useTracks([Track.Source.Microphone]);

  const [isMuted, setIsMuted] = useState(false);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isOperatorSpeaking, setIsOperatorSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === guestInfo.language);

  // Find operator's audio track
  const operatorTrack = audioTracks.find((trackRef) => {
    const metadata = trackRef.participant?.metadata;
    if (metadata) {
      try {
        const meta = JSON.parse(metadata);
        return meta.isOperator === true;
      } catch {
        return false;
      }
    }
    return false;
  });

  // Track if operator is speaking
  useEffect(() => {
    if (operatorTrack?.publication?.track) {
      setIsOperatorSpeaking(true);
    } else {
      setIsOperatorSpeaking(false);
    }
  }, [operatorTrack]);

  // Handle mute/unmute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

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
    (p) => {
      try {
        return JSON.parse(p.metadata || '{}').isOperator;
      } catch {
        return false;
      }
    }
  ).length;

  const guestCount = participants.length - operatorCount;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Hidden audio elements for all audio tracks */}
      <div className="hidden">
        {audioTracks.map((trackRef) => (
          <AudioTrack
            key={trackRef.publication?.trackSid}
            trackRef={trackRef}
            volume={isMuted ? 0 : 1}
          />
        ))}
      </div>

      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isOperatorSpeaking ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-sm text-gray-300">
              {isOperatorSpeaking ? 'Guide Speaking' : 'Connected'}
            </span>
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
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
              isOperatorSpeaking && !isMuted 
                ? 'bg-primary-600 animate-pulse' 
                : 'bg-gray-800'
            }`}>
              {isMuted ? (
                <VolumeX className="w-16 h-16 text-gray-600" />
              ) : isOperatorSpeaking ? (
                <Volume2 className="w-16 h-16 text-white animate-pulse" />
              ) : (
                <Volume2 className="w-16 h-16 text-gray-600" />
              )}
            </div>
            <p className="text-gray-400">
              {isMuted
                ? 'Audio muted - tap speaker to unmute'
                : isOperatorSpeaking
                  ? 'Listening to guide...'
                  : 'Waiting for guide to speak...'}
            </p>
            {operatorCount === 0 && (
              <p className="text-yellow-500 mt-2 text-sm">
                Guide not connected yet
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 safe-bottom">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* Mute/Unmute Audio */}
            <button
              onClick={handleToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-600' : 'bg-primary-600'
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
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isAskingQuestion
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-gray-700 hover:bg-gray-600'
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
              className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center relative hover:bg-gray-600 transition-colors"
            >
              <Users className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full text-xs flex items-center justify-center">
                {guestCount}
              </span>
            </button>

            {/* Leave */}
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>

          {isAskingQuestion && (
            <p className="text-center text-sm text-red-400 mt-3">
              Speaking to guide - tap microphone to stop
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
                let meta = { language: 'en', isOperator: false };
                try {
                  meta = JSON.parse(p.metadata || '{}');
                } catch {}
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