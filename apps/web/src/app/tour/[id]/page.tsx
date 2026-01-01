'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useParticipants,
  AudioTrack,
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Users,
  LogOut,
  X,
  Globe,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@tourlingo/types';

interface TranslatedAudioMessage {
  type: 'translated_audio';
  language: string;
  text: string;
  audioUrl: string;
  timestamp: number;
}

interface AudioChunkMessage {
  type: 'audio_chunk';
  messageId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string;
}

export default function TourRoomPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-900">
        <div className="bg-gray-800 rounded-xl p-6 text-center max-w-md">
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!token || !guestInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-400">Connecting to tour...</p>
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
  const audioTracks = useTracks([Track.Source.Microphone]);

  const [isMuted, setIsMuted] = useState(false);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isReceivingTranslation, setIsReceivingTranslation] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chunkBufferRef = useRef<Map<string, string[]>>(new Map());
  const myLanguage = guestInfo.language;

  const language = SUPPORTED_LANGUAGES.find((l) => l.code === myLanguage);

  // Process a complete message (either direct or reassembled from chunks)
  const processCompleteMessage = useCallback((message: TranslatedAudioMessage) => {
    if (message.type === 'translated_audio' && message.language === myLanguage) {
      console.log(`Received translation: "${message.text.substring(0, 30)}..."`);
      setLastTranscript(message.text);
      setIsReceivingTranslation(true);

      // Add to audio queue
      setAudioQueue(prev => [...prev, message.audioUrl]);
    }
  }, [myLanguage]);

  // Handle incoming data via data channel
  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array, participant: any) => {
      try {
        const decoder = new TextDecoder();
        const parsed = JSON.parse(decoder.decode(payload));

        // Handle chunked message
        if (parsed.type === 'audio_chunk') {
          const chunk = parsed as AudioChunkMessage;
          const { messageId, chunkIndex, totalChunks, data } = chunk;

          // Initialize buffer for this message if needed
          if (!chunkBufferRef.current.has(messageId)) {
            chunkBufferRef.current.set(messageId, new Array(totalChunks).fill(''));
          }

          // Store this chunk
          const buffer = chunkBufferRef.current.get(messageId)!;
          buffer[chunkIndex] = data;

          // Check if we have all chunks
          const complete = buffer.every(part => part !== '');
          if (complete) {
            // Reassemble the message
            const fullJson = buffer.join('');
            try {
              const message = JSON.parse(fullJson) as TranslatedAudioMessage;
              processCompleteMessage(message);
            } catch (e) {
              console.error('Failed to parse reassembled message:', e);
            }
            // Clean up buffer
            chunkBufferRef.current.delete(messageId);
          }
          return;
        }

        // Handle direct (non-chunked) message
        if (parsed.type === 'translated_audio') {
          processCompleteMessage(parsed as TranslatedAudioMessage);
        }
      } catch (error) {
        // Not a JSON message, ignore
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, processCompleteMessage]);

  // Clean up old incomplete chunk buffers periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Clear any buffers older than 30 seconds (based on timestamp in messageId)
      const now = Date.now();
      for (const [messageId] of chunkBufferRef.current) {
        const timestamp = parseInt(messageId, 10);
        if (!isNaN(timestamp) && now - timestamp > 30000) {
          chunkBufferRef.current.delete(messageId);
        }
      }
    }, 10000);

    return () => clearInterval(cleanup);
  }, []);

  // Play audio from queue
  useEffect(() => {
    if (audioQueue.length > 0 && !isPlayingAudio && !isMuted) {
      const nextAudio = audioQueue[0];
      setAudioQueue(prev => prev.slice(1));
      setIsPlayingAudio(true);

      const audio = new Audio(nextAudio);
      audioPlayerRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        setIsReceivingTranslation(audioQueue.length > 0);
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        setIsPlayingAudio(false);
        setIsReceivingTranslation(audioQueue.length > 0);
      };

      audio.play().catch((error) => {
        console.error('Failed to play audio:', error);
        setIsPlayingAudio(false);
      });
    }
  }, [audioQueue, isPlayingAudio, isMuted]);

  // Handle mute - stop current audio
  const handleToggleMute = useCallback(() => {
    if (!isMuted && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      setIsPlayingAudio(false);
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleAskQuestion = async () => {
    if (isAskingQuestion) {
      await room.localParticipant.setMicrophoneEnabled(false);
      setIsAskingQuestion(false);
    } else {
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsAskingQuestion(true);
    }
  };

  const handleLeave = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    room.disconnect();
    sessionStorage.removeItem('guestInfo');
    router.push('/');
  };

  const operatorCount = participants.filter((p) => {
    try {
      return JSON.parse(p.metadata || '{}').isOperator;
    } catch {
      return false;
    }
  }).length;

  const guestCount = participants.length - operatorCount;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Fallback: Play raw operator audio for English guests */}
      <div className="hidden">
        {myLanguage === 'en' && audioTracks.map((trackRef) => (
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
            <span className={`w-2 h-2 rounded-full ${
              isPlayingAudio 
                ? 'bg-green-500 animate-pulse' 
                : operatorCount > 0 
                  ? 'bg-yellow-500' 
                  : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-300">
              {isPlayingAudio
                ? 'Playing Translation'
                : operatorCount > 0
                  ? 'Connected'
                  : 'Guide Offline'}
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
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
              isPlayingAudio && !isMuted 
                ? 'bg-blue-600 scale-110' 
                : 'bg-gray-800'
            }`}>
              {isMuted ? (
                <VolumeX className="w-16 h-16 text-gray-600" />
              ) : isPlayingAudio ? (
                <Volume2 className="w-16 h-16 text-white animate-pulse" />
              ) : (
                <Volume2 className="w-16 h-16 text-gray-600" />
              )}
            </div>

            <p className="text-gray-400">
              {isMuted
                ? 'Audio muted - tap speaker to unmute'
                : isPlayingAudio
                  ? 'Listening to translated guide...'
                  : 'Waiting for guide to speak...'}
            </p>

            {/* Last transcript */}
            {lastTranscript && !isMuted && (
              <div className="mt-4 max-w-sm mx-auto">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-400">Translated</span>
                  </div>
                  <p className="text-sm text-gray-300">{lastTranscript}</p>
                </div>
              </div>
            )}

            {operatorCount === 0 && (
              <p className="text-yellow-500 mt-4 text-sm">
                Guide not connected yet
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 pb-8">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {/* Mute/Unmute Audio */}
            <button
              onClick={handleToggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-600' : 'bg-blue-600'
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
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-xs flex items-center justify-center">
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
                        <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">
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
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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