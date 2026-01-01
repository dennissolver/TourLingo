'use client';

import { useState, useEffect } from 'react';
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
  MessageCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@tourlingo/types';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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

        // Fetch tour details from Supabase
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

        // Update tour status to 'live' if it's still 'created'
        if (tourData.status === 'created') {
          await supabase
            .from('tours')
            .update({
              status: 'live',
              started_at: new Date().toISOString()
            })
            .eq('id', tourId);
        }

        // Get LiveKit token
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tourId,
            participantName: 'Tim (Guide)',
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
  const [copied, setCopied] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${tour.accessCode}`;

  const guests = participants.filter((p) => {
    const meta = JSON.parse(p.metadata || '{}');
    return !meta.isOperator;
  });

  const guestsByLanguage = guests.reduce((acc, guest) => {
    const meta = JSON.parse(guest.metadata || '{}');
    const lang = meta.language || 'en';
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(guest);
    return acc;
  }, {} as Record<string, any[]>);

  const handleBroadcastToggle = async () => {
    if (isBroadcasting) {
      await localParticipant.setMicrophoneEnabled(false);
      setIsBroadcasting(false);
    } else {
      await localParticipant.setMicrophoneEnabled(true);
      setIsBroadcasting(true);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tour.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndTour = async () => {
    try {
      const supabase = getSupabase();

      // Update tour status in Supabase
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
            className={`w-full py-8 rounded-xl flex flex-col items-center justify-center transition-colors ${
              isBroadcasting
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
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

          <p className="text-center text-sm text-gray-500 mt-4">
            {isBroadcasting
              ? 'Your voice is being translated to all guests'
              : 'Press to start speaking to your guests'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="btn btn-secondary py-4 flex-col"
          >
            <Square className="w-5 h-5 mb-1" />
            <span>End Tour</span>
          </button>
          <button className="btn btn-secondary py-4 flex-col">
            <MessageCircle className="w-5 h-5 mb-1" />
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

      {/* Private Chat Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Private Chat</h2>
              <button onClick={() => setSelectedGuest(null)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Start a private conversation with this guest.
            </p>
            <button className="btn btn-primary w-full">
              <Mic className="w-5 h-5 mr-2" />
              Start Private Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}