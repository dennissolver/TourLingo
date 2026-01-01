'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Check, ChevronRight, Headphones, AlertCircle, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { getTourByCode } from '@tourlingo/api';
import { SUPPORTED_LANGUAGES } from '@tourlingo/types';

type Step = 'loading' | 'language' | 'name' | 'audio' | 'ready' | 'error';

export default function JoinTourPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [step, setStep] = useState<Step>('loading');
  const [tour, setTour] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [audioTested, setAudioTested] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Load tour info
  useEffect(() => {
    async function loadTour() {
      try {
        const tourData = await getTourByCode(code);
        if (!tourData) {
          setError('Tour not found. Please check your code.');
          setStep('error');
          return;
        }
        if (tourData.status === 'ended' || tourData.status === 'archived') {
          setError('This tour has ended.');
          setStep('error');
          return;
        }
        setTour(tourData);
        setStep('language');
      } catch (err) {
        setError('Failed to load tour. Please try again.');
        setStep('error');
      }
    }
    loadTour();
  }, [code]);

  const handleLanguageSelect = (lang: string) => {
    setSelectedLanguage(lang);
    setStep('name');
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      setStep('audio');
    }
  };

  const handleAudioTest = async () => {
    setIsPlayingAudio(true);
    setAudioError('');
    setAudioFailed(false);

    try {
      // Create audio context to generate a test tone (no external file needed)
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();

      // Create oscillator for test tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';

      // Fade in and out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);

      // Wait for tone to finish
      await new Promise(resolve => setTimeout(resolve, 1100));

      setAudioTested(true);
      setIsPlayingAudio(false);
    } catch (err: any) {
      console.error('Audio test failed:', err);
      setAudioError(err.message || 'Failed to play test audio');
      setAudioFailed(true);
      setIsPlayingAudio(false);
    }
  };

  const handleAudioSuccess = () => {
    setStep('ready');
  };

  const handleAudioFailure = () => {
    setAudioFailed(true);
  };

  const handleJoinTour = () => {
    // Store guest info and navigate to tour room
    sessionStorage.setItem('guestInfo', JSON.stringify({
      tourId: tour.id,
      language: selectedLanguage,
      displayName: displayName.trim(),
    }));
    router.push(`/tour/${tour.id}`);
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading tour...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white py-4 px-4">
        <div className="max-w-md mx-auto">
          <p className="text-primary-100 text-sm">Joining tour</p>
          <h1 className="text-xl font-semibold">{tour?.name || 'Tour'}</h1>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <StepIndicator step={1} current={step} label="Language" steps={['language']} />
          <StepIndicator step={2} current={step} label="Name" steps={['name']} />
          <StepIndicator step={3} current={step} label="Audio" steps={['audio', 'ready']} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {step === 'language' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Select your language
            </h2>
            <p className="text-gray-600 mb-6">
              You'll hear the guide translated into this language.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium text-gray-900">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'name' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              What's your name?
            </h2>
            <p className="text-gray-600 mb-6">
              This helps the guide know who's asking questions.
            </p>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="input mb-4"
                autoFocus
                maxLength={30}
              />
              <button
                type="submit"
                disabled={!displayName.trim()}
                className="btn btn-primary btn-large w-full"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            </form>
          </div>
        )}

        {step === 'audio' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Test your audio
            </h2>
            <p className="text-gray-600 mb-6">
              Make sure you can hear the guide. Use earphones for best experience.
            </p>

            <div className="card mb-6">
              <div className="flex items-center justify-center mb-4">
                <Headphones className="w-16 h-16 text-primary-600" />
              </div>

              {/* Test Audio Button */}
              <button
                onClick={handleAudioTest}
                disabled={isPlayingAudio}
                className="btn btn-secondary w-full mb-3"
              >
                {isPlayingAudio ? (
                  <>
                    <Volume2 className="w-5 h-5 mr-2 animate-pulse" />
                    Playing...
                  </>
                ) : audioTested ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Play Again
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5 mr-2" />
                    Play Test Sound
                  </>
                )}
              </button>

              {/* Audio Error Message */}
              {audioError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                  <p className="text-sm text-red-600">{audioError}</p>
                </div>
              )}

              {/* Success/Failure Options after test */}
              {audioTested && !audioFailed && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 text-center mb-3">
                    Did you hear the test sound?
                  </p>
                  <button
                    onClick={handleAudioSuccess}
                    className="btn btn-primary w-full"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Yes, I heard it
                  </button>
                  <button
                    onClick={handleAudioFailure}
                    className="btn btn-secondary w-full"
                  >
                    <VolumeX className="w-5 h-5 mr-2" />
                    No, I didn't hear it
                  </button>
                </div>
              )}

              {/* Troubleshooting Panel */}
              {audioFailed && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-2">
                    Troubleshooting
                  </h3>
                  <ul className="text-sm text-yellow-700 space-y-2 mb-4">
                    <li>• Check your device volume is turned up</li>
                    <li>• Make sure earphones/speakers are connected</li>
                    <li>• Try a different browser (Chrome recommended)</li>
                    <li>• Check if your browser has permission to play audio</li>
                    <li>• On iPhone, make sure silent mode is off</li>
                  </ul>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setAudioFailed(false);
                        setAudioTested(false);
                        setAudioError('');
                      }}
                      className="btn btn-secondary w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </button>
                    <button
                      onClick={() => setStep('ready')}
                      className="btn btn-primary w-full"
                    >
                      Continue Anyway
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-2">
                      You may have audio issues during the tour
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Skip option (only before testing) */}
            {!audioTested && !audioFailed && (
              <button
                onClick={() => setStep('ready')}
                className="text-sm text-gray-500 hover:text-gray-700 w-full text-center"
              >
                Skip audio test
              </button>
            )}
          </div>
        )}

        {step === 'ready' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              You're all set!
            </h2>
            <p className="text-gray-600 mb-8">
              Ready to join as <strong>{displayName}</strong> with{' '}
              <strong>
                {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
              </strong>
            </p>
            <button
              onClick={handleJoinTour}
              className="btn btn-primary btn-large w-full"
            >
              Join Tour Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  current,
  label,
  steps,
}: {
  step: number;
  current: Step;
  label: string;
  steps: Step[];
}) {
  const isActive = steps.includes(current);
  const isPast = step < getCurrentStepNumber(current);

  return (
    <div className="flex items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isPast
            ? 'bg-primary-600 text-white'
            : isActive
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {isPast ? <Check className="w-4 h-4" /> : step}
      </div>
      <span className={`ml-2 text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

function getCurrentStepNumber(step: Step): number {
  switch (step) {
    case 'language':
      return 1;
    case 'name':
      return 2;
    case 'audio':
    case 'ready':
      return 3;
    default:
      return 0;
  }
}