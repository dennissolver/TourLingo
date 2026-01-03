'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useRoomContext,
  useLocalParticipant,
  useParticipants,
  useTracks,
  AudioTrack,
} from '@livekit/components-react';
import { Track, RoomEvent, DataPacket_Kind } from 'livekit-client';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  LogOut,
  Loader2,
  Users,
  MessageCircle,
  Lock,
  Globe,
  ChevronDown,
  X,
  Check,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@tourlingo/types';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Channel options for who to talk to
type TalkChannel = 'all' | 'guide' | string; // string = specific guest identity

interface GuestInfo {
  name: string;
  language: string;
}

export default function GuestTourPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);

  useEffect(() => {
    // Get guest info from session storage
    const stored = sessionStorage.getItem('guestInfo');
    if (!stored) {
      router.push('/join');
      return;
    }

    const info = JSON.parse(stored) as GuestInfo;
    setGuestInfo(info);

    async function joinTour() {
      try {
        const supabase = getSupabase();

        const { data: tourData, error: tourError } = await supabase
          .from('tours')
          .select('*')
          .eq('id', tourId)
          .single();

        if (tourError || !tourData) {
          setError('Tour not found');
          setLoading(false);
          return;
        }

        setTour({
          id: tourData.id,
          name: tourData.name,
          status: tourData.status,
        });

        // Get LiveKit token
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourId,
            participantName: info.name,
            language: info.language,
            isOperator: false,
          }),
        });

        if (res.ok) {
          const { token } = await res.json();
          setToken(token);
        } else {
          setError('Failed to join tour');
        }
      } catch (err) {
        console.error('Error joining tour:', err);
        setError('Failed to join tour');
      } finally {
        setLoading(false);
      }
    }

    joinTour();
  }, [tourId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-4">Joining tour...</p>
        </div>
      </div>
    );
  }

  if (error || !tour || !guestInfo) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p>{error || 'Failed to join tour'}</p>
          <button
            onClick={() => router.push('/join')}
            className="mt-4 px-4 py-2 bg-primary-600 rounded-lg"
          >
            Back to Join
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p>Connection failed</p>
          <button
            onClick={() => router.push('/join')}
            className="mt-4 px-4 py-2 bg-primary-600 rounded-lg"
          >
            Try Again
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
      <GuestTourContent tour={tour} guestInfo={guestInfo} />
    </LiveKitRoom>
  );
}

function GuestTourContent({ tour, guestInfo }: { tour: any; guestInfo: GuestInfo }) {
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const myLanguage = guestInfo.language;
  const language = SUPPORTED_LANGUAGES.find((l) => l.code === myLanguage);

  // State
  const [isMuted, setIsMuted] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [talkingSeconds, setTalkingSeconds] = useState(0);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  // Channel selection
  const [talkChannel, setTalkChannel] = useState<TalkChannel>('all');
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  
  // Audio refs
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const talkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkBufferRef = useRef<Map<string, { chunks: string[]; total: number }>>(new Map());

  // Get participants info
  const operator = participants.find((p) => {
    try {
      return JSON.parse(p.metadata || '{}').isOperator;
    } catch {
      return false;
    }
  });

  const otherGuests = participants.filter((p) => {
    try {
      const meta = JSON.parse(p.metadata || '{}');
      return !meta.isOperator && p.identity !== localParticipant?.identity;
    } catch {
      return p.identity !== localParticipant?.identity;
    }
  });

  // Get channel display name
  const getChannelName = () => {
    if (talkChannel === 'all') return 'Everyone';
    if (talkChannel === 'guide') return 'Guide Only';
    const guest = otherGuests.find(g => g.identity === talkChannel);
    return guest?.name || 'Selected Guest';
  };

  // Handle incoming translated audio from operator or other guests
  useEffect(() => {
    if (!room) return;

    const handleData = async (
      payload: Uint8Array,
      participant?: any,
      kind?: DataPacket_Kind
    ) => {
      try {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(payload);
        const message = JSON.parse(jsonStr);

        // Handle chunked messages
        if (message.type === 'audio_chunk') {
          const { messageId, chunkIndex, totalChunks, data } = message;

          if (!chunkBufferRef.current.has(messageId)) {
            chunkBufferRef.current.set(messageId, {
              chunks: new Array(totalChunks).fill(null),
              total: totalChunks,
            });
          }

          const buffer = chunkBufferRef.current.get(messageId)!;
          buffer.chunks[chunkIndex] = data;

          // Check if all chunks received
          if (buffer.chunks.every((c) => c !== null)) {
            const fullJson = buffer.chunks.join('');
            const fullMessage = JSON.parse(fullJson);
            chunkBufferRef.current.delete(messageId);
            await processTranslatedAudio(fullMessage, participant);
          }
          return;
        }

        // Handle direct messages
        if (message.type === 'translated_audio') {
          await processTranslatedAudio(message, participant);
        }
      } catch (err) {
        console.error('Error processing data:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, myLanguage]);

  // Process translated audio message
  const processTranslatedAudio = async (message: any, participant: any) => {
    // Check if this translation is for my language
    if (message.language !== myLanguage) return;

    // Check if this is a private message not meant for me
    if (message.targetChannel && message.targetChannel !== 'all') {
      // If it's for guide only and I'm not the guide, ignore
      if (message.targetChannel === 'guide') return;
      // If it's for a specific guest and that's not me, ignore
      if (message.targetChannel !== localParticipant?.identity) return;
    }

    console.log(`Received translation from ${participant?.name}: "${message.text?.substring(0, 30)}..."`);
    setLastMessage(message.text || '');

    if (message.audioUrl && !isMuted) {
      // Queue the audio
      audioQueueRef.current.push(message.audioUrl);
      playNextInQueue();
    }
  };

  // Play audio queue
  const playNextInQueue = () => {
    if (isPlayingAudio || audioQueueRef.current.length === 0) return;

    const audioUrl = audioQueueRef.current.shift();
    if (!audioUrl) return;

    setIsPlayingAudio(true);

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => {
        setIsPlayingAudio(false);
        playNextInQueue();
      };
      audioPlayerRef.current.onerror = () => {
        setIsPlayingAudio(false);
        playNextInQueue();
      };
    }

    audioPlayerRef.current.src = audioUrl;
    audioPlayerRef.current.play().catch((err) => {
      console.error('Audio play error:', err);
      setIsPlayingAudio(false);
      playNextInQueue();
    });
  };

  // Start talking - record and translate
  const startTalking = async () => {
    try {
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

      mediaRecorder.start();
      setIsTalking(true);
      setTalkingSeconds(0);

      // Timer for UI
      talkingTimerRef.current = setInterval(() => {
        setTalkingSeconds((s) => s + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setTranslationError('Microphone access denied');
    }
  };

  // Stop talking - process translation and send
  const stopTalking = async () => {
    setIsTalking(false);

    if (talkingTimerRef.current) {
      clearInterval(talkingTimerRef.current);
      talkingTimerRef.current = null;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    // Stop recording and wait for all data
    mediaRecorderRef.current.stop();

    // Wait for final data
    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => resolve();
      } else {
        resolve();
      }
    });

    // Process the audio
    if (audioChunksRef.current.length > 0 && talkingSeconds > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      await processAndSendTranslation(audioBlob);
    }

    audioChunksRef.current = [];
    setTalkingSeconds(0);
  };

  // Process translation and broadcast
  const processAndSendTranslation = async (audioBlob: Blob) => {
    if (audioBlob.size < 1000) return;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      // Determine target languages based on channel
      let targetLanguages: string[] = [];
      
      if (talkChannel === 'all') {
        // Get all unique languages from participants
        const languages = new Set<string>();
        languages.add('en'); // Always include guide's language
        participants.forEach((p) => {
          try {
            const meta = JSON.parse(p.metadata || '{}');
            if (meta.language) languages.add(meta.language);
          } catch {}
        });
        targetLanguages = Array.from(languages);
      } else if (talkChannel === 'guide') {
        // Just translate to guide's language (English)
        targetLanguages = ['en'];
      } else {
        // Specific guest - get their language
        const targetGuest = otherGuests.find(g => g.identity === talkChannel);
        if (targetGuest) {
          try {
            const meta = JSON.parse(targetGuest.metadata || '{}');
            targetLanguages = [meta.language || 'en', 'en']; // Target guest + guide
          } catch {
            targetLanguages = ['en'];
          }
        }
      }

      // Remove duplicates
      targetLanguages = [...new Set(targetLanguages)];

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('sourceLanguage', myLanguage);
      formData.append('targetLanguages', targetLanguages.join(','));
      formData.append('generateAudio', 'true');
      formData.append('enableNoiseFilter', 'true');

      const response = await fetch('/api/translate/audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Translation failed');
      }

      const result = await response.json();

      // If filtered as noise, don't send
      if (result.filtered && result.filterReason === 'noise') {
        console.log('Audio filtered as noise, not sending');
        return;
      }

      if (!result.originalText?.trim()) {
        console.log('No speech detected');
        return;
      }

      setLastMessage(`You said: "${result.originalText}"`);

      // Send translations via LiveKit data channel
      const encoder = new TextEncoder();

      for (const [language, translation] of Object.entries(result.translations)) {
        const trans = translation as { text: string; audioUrl?: string };
        if (!trans.audioUrl) continue;

        const message = {
          type: 'translated_audio',
          language,
          text: trans.text,
          audioUrl: trans.audioUrl,
          timestamp: Date.now(),
          senderName: guestInfo.name,
          senderLanguage: myLanguage,
          targetChannel: talkChannel, // Include channel for filtering
        };

        // Determine recipients based on channel
        let destination: any = undefined;

        if (talkChannel === 'guide' && operator) {
          // Send only to guide
          destination = { destinationIdentities: [operator.identity] };
        } else if (talkChannel !== 'all') {
          // Send to specific guest + guide
          const recipients = [talkChannel];
          if (operator) recipients.push(operator.identity);
          destination = { destinationIdentities: recipients };
        }
        // talkChannel === 'all' -> broadcast to everyone (no destination filter)

        try {
          await sendChunkedData(message, destination);
        } catch (sendError) {
          console.error(`Failed to send translation for ${language}:`, sendError);
        }
      }

      console.log(`Translation sent: ${result.originalText?.substring(0, 30)}...`);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  // Send data with chunking for large payloads
  const sendChunkedData = async (data: object, destination?: any) => {
    const jsonStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const MAX_CHUNK_SIZE = 50000;

    if (jsonStr.length < MAX_CHUNK_SIZE) {
      const encoded = encoder.encode(jsonStr);
      await room.localParticipant.publishData(encoded, { 
        reliable: true,
        ...destination,
      });
      return;
    }

    // Chunk large messages
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
      await room.localParticipant.publishData(encoded, { 
        reliable: true,
        ...destination,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  };

  // Leave tour
  const handleLeave = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (talkingTimerRef.current) {
      clearInterval(talkingTimerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    room.disconnect();
    sessionStorage.removeItem('guestInfo');
    router.push('/');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (talkingTimerRef.current) {
        clearInterval(talkingTimerRef.current);
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const operatorOnline = !!operator;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlayingAudio
                  ? 'bg-green-500 animate-pulse'
                  : operatorOnline
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-300">
              {isPlayingAudio
                ? 'Playing Translation'
                : operatorOnline
                ? 'Connected'
                : 'Guide Offline'}
            </span>
          </div>
          <h1 className="font-semibold">{tour.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{language?.flag}</span>
          <span className="text-sm text-gray-300">{language?.name}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4">
        {/* Audio Status */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                isPlayingAudio && !isMuted
                  ? 'bg-green-500/30 scale-110'
                  : isMuted
                  ? 'bg-gray-700'
                  : 'bg-gray-800'
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-16 h-16 text-gray-500" />
              ) : isPlayingAudio ? (
                <Volume2 className="w-16 h-16 text-green-400 animate-pulse" />
              ) : (
                <Volume2 className="w-16 h-16 text-gray-500" />
              )}
            </div>

            {lastMessage && (
              <div className="max-w-sm mx-auto p-3 bg-gray-800 rounded-lg mb-4">
                <p className="text-sm text-gray-300">{lastMessage}</p>
              </div>
            )}

            <p className="text-gray-400">
              {isMuted
                ? 'Audio muted'
                : isPlayingAudio
                ? 'Listening to translation...'
                : 'Waiting for guide...'}
            </p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="mb-4">
          <button
            onClick={() => setShowChannelPicker(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {talkChannel === 'guide' ? (
                <Lock className="w-5 h-5 text-yellow-500" />
              ) : talkChannel === 'all' ? (
                <Globe className="w-5 h-5 text-blue-500" />
              ) : (
                <MessageCircle className="w-5 h-5 text-purple-500" />
              )}
              <span>Talk to: {getChannelName()}</span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Talk Button */}
        <div className="space-y-4">
          <button
            onTouchStart={startTalking}
            onTouchEnd={stopTalking}
            onMouseDown={startTalking}
            onMouseUp={stopTalking}
            onMouseLeave={() => isTalking && stopTalking()}
            disabled={isTranslating}
            className={`w-full py-6 rounded-xl flex flex-col items-center justify-center transition-all ${
              isTalking
                ? 'bg-red-600 scale-105'
                : isTranslating
                ? 'bg-gray-700'
                : 'bg-primary-600 hover:bg-primary-700 active:scale-95'
            } disabled:opacity-50`}
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-10 h-10 mb-2 animate-spin" />
                <span className="text-lg">Translating...</span>
              </>
            ) : isTalking ? (
              <>
                <Mic className="w-10 h-10 mb-2 animate-pulse" />
                <span className="text-lg">Recording... ({talkingSeconds}s)</span>
                <span className="text-sm text-red-200 mt-1">Release to send</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 mb-2" />
                <span className="text-lg">Hold to Talk</span>
                <span className="text-sm text-primary-200 mt-1">
                  {talkChannel === 'guide' ? 'Private to Guide' : 
                   talkChannel === 'all' ? 'To Everyone' : 'Private Message'}
                </span>
              </>
            )}
          </button>

          {translationError && (
            <p className="text-center text-red-400 text-sm">{translationError}</p>
          )}

          {/* Bottom Actions */}
          <div className="flex space-x-4">
            <button
              onClick={toggleMute}
              className={`flex-1 py-4 rounded-xl flex flex-col items-center justify-center ${
                isMuted ? 'bg-red-600' : 'bg-gray-800'
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6 mb-1" />
              ) : (
                <Volume2 className="w-6 h-6 mb-1" />
              )}
              <span className="text-sm">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              onClick={handleLeave}
              className="flex-1 py-4 rounded-xl flex flex-col items-center justify-center bg-gray-800 hover:bg-gray-700"
            >
              <LogOut className="w-6 h-6 mb-1" />
              <span className="text-sm">Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* Channel Picker Modal */}
      {showChannelPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50">
          <div className="w-full bg-gray-800 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Talk to...</h2>
              <button onClick={() => setShowChannelPicker(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Everyone */}
              <button
                onClick={() => {
                  setTalkChannel('all');
                  setShowChannelPicker(false);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-lg ${
                  talkChannel === 'all' ? 'bg-primary-600' : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Globe className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-medium">Everyone</p>
                    <p className="text-sm text-gray-300">Guide and all guests hear you</p>
                  </div>
                </div>
                {talkChannel === 'all' && <Check className="w-5 h-5" />}
              </button>

              {/* Guide Only */}
              <button
                onClick={() => {
                  setTalkChannel('guide');
                  setShowChannelPicker(false);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-lg ${
                  talkChannel === 'guide' ? 'bg-primary-600' : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Lock className="w-6 h-6 text-yellow-500" />
                  <div className="text-left">
                    <p className="font-medium">Guide Only</p>
                    <p className="text-sm text-gray-300">Private question to guide</p>
                  </div>
                </div>
                {talkChannel === 'guide' && <Check className="w-5 h-5" />}
              </button>

              {/* Other Guests */}
              {otherGuests.length > 0 && (
                <>
                  <div className="pt-4 pb-2">
                    <p className="text-sm text-gray-400 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Other Guests ({otherGuests.length})
                    </p>
                  </div>

                  {otherGuests.map((guest) => {
                    let guestLang = 'en';
                    let guestFlag = '🌐';
                    try {
                      const meta = JSON.parse(guest.metadata || '{}');
                      guestLang = meta.language || 'en';
                      const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === guestLang);
                      guestFlag = langInfo?.flag || '🌐';
                    } catch {}

                    return (
                      <button
                        key={guest.identity}
                        onClick={() => {
                          setTalkChannel(guest.identity);
                          setShowChannelPicker(false);
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-lg ${
                          talkChannel === guest.identity ? 'bg-primary-600' : 'bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{guestFlag}</span>
                          <div className="text-left">
                            <p className="font-medium">{guest.name}</p>
                            <p className="text-sm text-gray-300">Private message</p>
                          </div>
                        </div>
                        {talkChannel === guest.identity && <Check className="w-5 h-5" />}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
