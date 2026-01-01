'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useRoomContext,
  useLocalParticipant,
  useParticipants,
} from '@livekit/components-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Mic,
  MicOff,
  Users,
  Copy,
  Check,
  Square,
  Globe,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@tourlingo/types';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Max chunk size for LiveKit data channel (leave room for JSON wrapper)
const MAX_CHUNK_SIZE = 50000; // ~50KB to be safe under 64KB limit

export default function LiveTourPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTour() {
      try {
        const supabase = getSupabase();

        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('*')
          .eq('id', tourId)
          .single();

        if (tourError) {
          console.error('Error fetching tour:', tourError);
          setError('Tour not found');
          setLoading(false);
          return;
        }

        setTour({
          id: tourData.id,
          name: tourData.name,
          accessCode: tourData.access_code,
          status: tourData.status,
          maxGuests: tourData.max_guests,
        });

        if (tourData.status === 'created') {
          await supabase
            .from('tours')
            .update({
              status: 'live',
              started_at: new Date().toISOString()
            })
            .eq('id', tourId);
        }

        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourId,
            participantName: 'Guide',
            language: 'en',
            isOperator: true,
          }),
        });

        if (res.ok) {
          const { token } = await res.json();
          setToken(token);
        }
      } catch (err) {
        console.error('Error loading tour:', err);
        setError('Failed to load tour');
      } finally {
        setLoading(false);
      }
    }

    loadTour();
  }, [tourId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading tour...</p>
        </div>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Failed to load tour'}</p>
          <button
            onClick={() => router.push('/dashboard/tours')}
            className="btn btn-primary mt-4"
          >
            Back to Tours
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to connect to live session</p>
          <button
            onClick={() => router.push('/dashboard/tours')}
            className="btn btn-primary mt-4"
          >
            Back to Tours
          </button>
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
    >
      <LiveTourContent tour={tour} />
    </LiveKitRoom>
  );
}

function LiveTourContent({ tour }: { tour: any }) {
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://tour-lingo.vercel.app'}/join/${tour.accessCode}`;

  const guests = participants.filter((p) => {
    try {
      const meta = JSON.parse(p.metadata || '{}');
      return !meta.isOperator;
    } catch {
      return true;
    }
  });

  const guestsByLanguage = guests.reduce((acc, guest) => {
    try {
      const meta = JSON.parse(guest.metadata || '{}');
      const lang = meta.language || 'en';
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(guest);
    } catch {
      if (!acc['en']) acc['en'] = [];
      acc['en'].push(guest);
    }
    return acc;
  }, {} as Record<string, any[]>);

  // Get unique languages from connected guests
  const activeLanguages = Object.keys(guestsByLanguage);

  // Send data in chunks to avoid LiveKit's 64KB limit
  const sendChunkedData = useCallback(async (data: object) => {
    const jsonStr = JSON.stringify(data);
    const encoder = new TextEncoder();

    // If small enough, send directly
    if (jsonStr.length < MAX_CHUNK_SIZE) {
      const encoded = encoder.encode(jsonStr);
      await room.localParticipant.publishData(encoded, { reliable: true });
      return;
    }

    // Otherwise, chunk it
    const messageId = Date.now().toString();
    const totalChunks = Math.ceil(jsonStr.length / MAX_CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = jsonStr.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE);
      const chunkMessage = {
        type: 'audio_chunk',
        messageId,
        chunkIndex: i,
        totalChunks,
        data: chunk,
      };
      const encoded = encoder.encode(JSON.stringify(chunkMessage));
      await room.localParticipant.publishData(encoded, { reliable: true });

      // Small delay between chunks to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }, [room]);

  // Process and send translated audio to guests
  const processAndSendTranslation = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 1000) return; // Skip tiny chunks
    if (activeLanguages.length === 0) return; // No guests

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('sourceLanguage', 'en');
      formData.append('targetLanguages', activeLanguages.join(','));
      formData.append('generateAudio', 'true');

      const response = await fetch('/api/translate/audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Translation failed');
      }

      const result = await response.json();

      if (result.originalText) {
        setLastTranscript(result.originalText);
      }

      // Send translated audio to guests via LiveKit data channel
      for (const [language, translation] of Object.entries(result.translations)) {
        const trans = translation as { text: string; audioUrl?: string };
        if (trans.audioUrl) {
          const message = {
            type: 'translated_audio',
            language,
            text: trans.text,
            audioUrl: trans.audioUrl,
            timestamp: Date.now(),
          };

          try {
            await sendChunkedData(message);
          } catch (sendError) {
            console.error(`Failed to send translation for ${language}:`, sendError);
          }
        }
      }

      console.log(`Translation sent: ${result.originalText?.substring(0, 30)}... (${result.processingTimeMs}ms)`);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  }, [activeLanguages, sendChunkedData]);

  // Start recording and translation
  const startBroadcasting = useCallback(async () => {
    try {
      // Enable microphone in LiveKit (for raw audio fallback)
      await localParticipant.setMicrophoneEnabled(true);

      // Get microphone stream for recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          processAndSendTranslation(audioBlob);
          audioChunksRef.current = [];
        }
      };

      // Start recording
      mediaRecorder.start();

      // Process audio every 3 seconds for translation
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          mediaRecorder.start();
        }
      }, 3000);

      setIsBroadcasting(true);
    } catch (error) {
      console.error('Failed to start broadcasting:', error);
      setTranslationError('Failed to access microphone');
    }
  }, [localParticipant, processAndSendTranslation]);

  // Stop recording and translation
  const stopBroadcasting = useCallback(async () => {
    // Stop interval
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Disable microphone
    await localParticipant.setMicrophoneEnabled(false);

    setIsBroadcasting(false);
  }, [localParticipant]);

  const handleBroadcastToggle = async () => {
    if (isBroadcasting) {
      await stopBroadcasting();
    } else {
      await startBroadcasting();
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tour.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndTour = async () => {
    try {
      await stopBroadcasting();

      const supabase = getSupabase();
      await supabase
        .from('tours')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', tour.id);

      room.disconnect();
      router.push('/dashboard/tours');
    } catch (err) {
      console.error('Error ending tour:', err);
      room.disconnect();
      router.push('/dashboard/tours');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      {/* Main Control Panel */}
      <div className="flex-1 space-y-6">
        {/* Broadcast Control */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{tour.name}</h2>
              <p className="text-gray-500">
                {guests.length} guest{guests.length !== 1 ? 's' : ''} connected
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isBroadcasting ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                }`}
              />
              <span className="text-sm text-gray-600">
                {isBroadcasting ? 'Broadcasting' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Big Broadcast Button */}
          <button
            onClick={handleBroadcastToggle}
            disabled={isTranslating && !isBroadcasting}
            className={`w-full py-8 rounded-xl flex flex-col items-center justify-center transition-colors ${
              isBroadcasting
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            } disabled:opacity-50`}
          >
            {isBroadcasting ? (
              <>
                <MicOff className="w-12 h-12 mb-2" />
                <span className="text-lg font-medium">Tap to Pause</span>
              </>
            ) : (
              <>
                <Mic className="w-12 h-12 mb-2" />
                <span className="text-lg font-medium">Tap to Broadcast</span>
              </>
            )}
          </button>

          {/* Translation Status */}
          <div className="mt-4 space-y-2">
            {isTranslating && (
              <div className="flex items-center justify-center text-sm text-primary-600">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Translating...
              </div>
            )}

            {translationError && (
              <div className="text-sm text-red-600 text-center">
                {translationError}
              </div>
            )}

            {lastTranscript && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Last transcript:</p>
                <p className="text-sm text-gray-700">{lastTranscript}</p>
              </div>
            )}

            <p className="text-center text-sm text-gray-500">
              {isBroadcasting
                ? `Translating to ${activeLanguages.length} language${activeLanguages.length !== 1 ? 's' : ''}`
                : 'Press to start speaking to your guests'}
            </p>
          </div>
        </div>

        {/* Active Languages */}
        {activeLanguages.length > 0 && (
          <div className="card">
            <div className="flex items-center space-x-2 mb-3">
              <Globe className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Active Languages</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeLanguages.map((lang) => {
                const language = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
                return (
                  <span
                    key={lang}
                    className="inline-flex items-center px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    <span className="mr-1">{language?.flag || '🌐'}</span>
                    {language?.name || lang}
                    <span className="ml-1 text-xs">({guestsByLanguage[lang]?.length || 0})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="btn btn-secondary py-4 flex-col"
          >
            <Square className="w-5 h-5 mb-1" />
            <span>End Tour</span>
          </button>
          <button className="btn btn-secondary py-4 flex-col opacity-50" disabled>
            <Globe className="w-5 h-5 mb-1" />
            <span>Announcements</span>
          </button>
        </div>
      </div>

      {/* Sidebar - QR & Guests */}
      <div className="lg:w-80 space-y-6">
        {/* QR Code */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Guest Join</h3>
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex justify-center">
            <QRCodeSVG value={joinUrl} size={160} />
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Or share the code:</p>
            <button
              onClick={handleCopyCode}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span className="font-mono text-lg font-semibold tracking-widest">
                {tour.accessCode}
              </span>
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Connected Guests */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              Guests ({guests.length})
            </h3>
            <Users className="w-4 h-4 text-gray-400" />
          </div>

          {guests.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Waiting for guests to join...
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(guestsByLanguage).map(([lang, langGuests]) => {
                const language = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
                return (
                  <div key={lang}>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{language?.flag || '🌐'}</span>
                      <span className="text-xs text-gray-500">
                        {language?.name || lang} ({langGuests.length})
                      </span>
                    </div>
                    <div className="space-y-1 pl-7">
                      {langGuests.map((guest: any) => (
                        <button
                          key={guest.identity}
                          onClick={() => setSelectedGuest(guest.identity)}
                          className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100 text-sm"
                        >
                          <span className="truncate">{guest.name}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* End Tour Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">End Tour?</h2>
            <p className="text-gray-600 mb-6">
              This will disconnect all guests and archive the tour.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleEndTour} className="btn btn-danger flex-1">
                End Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Info Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Guest Info</h2>
              <button onClick={() => setSelectedGuest(null)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Private messaging coming soon.
            </p>
            <button
              onClick={() => setSelectedGuest(null)}
              className="btn btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}