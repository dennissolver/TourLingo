'use client';

import Link from 'next/link';
import { 
  Globe, 
  Headphones, 
  MessageCircle, 
  Mic, 
  Users, 
  Zap,
  ArrowRight,
  CheckCircle,
  Play,
  Smartphone
} from 'lucide-react';

const OPERATOR_URL = process.env.NEXT_PUBLIC_OPERATOR_URL || 'http://localhost:3001';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Globe className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">TourLingo</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/join" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Join Tour
              </Link>
              <Link 
                href={`${OPERATOR_URL}/login`} 
                className="btn btn-primary"
              >
                Operator Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Every Guest Hears You
              <span className="block text-primary-200">In Their Language</span>
            </h1>
            <p className="mt-6 text-xl text-primary-100 max-w-2xl mx-auto">
              Real-time voice translation for tour guides. Speak naturally while your guests 
              hear crystal-clear translations through their own earphones.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/join" 
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-700 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-colors"
              >
                <Headphones className="w-5 h-5 mr-2" />
                Join a Tour
              </Link>
              <Link 
                href={`${OPERATOR_URL}/login`} 
                className="inline-flex items-center justify-center px-8 py-4 bg-primary-500 text-white rounded-xl font-semibold text-lg hover:bg-primary-400 transition-colors border-2 border-primary-400"
              >
                <Mic className="w-5 h-5 mr-2" />
                I'm a Tour Operator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              How TourLingo Works
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Simple for operators. Seamless for guests.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mic className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-sm font-semibold text-primary-600 mb-2">STEP 1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Operator Speaks</h3>
              <p className="text-gray-600">
                Guide speaks naturally in their language. No special equipment needed — 
                just their phone or tablet.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-sm font-semibold text-primary-600 mb-2">STEP 2</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Translation</h3>
              <p className="text-gray-600">
                AI translates speech in real-time to 10+ languages. 
                Under 1 second latency — natural conversation flow.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Headphones className="w-8 h-8 text-primary-600" />
              </div>
              <div className="text-sm font-semibold text-primary-600 mb-2">STEP 3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Guests Listen</h3>
              <p className="text-gray-600">
                Each guest hears audio in their chosen language through their own 
                earphones. No downloads required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Guests Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-6">
                <Users className="w-4 h-4 mr-2" />
                For Tour Guests
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Join Any Tour in Seconds
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                No app download. No account needed. Just scan the QR code or enter the 
                tour code, pick your language, and you're in.
              </p>

              <div className="space-y-4 mb-8">
                <Feature text="Works in your browser — no app to download" />
                <Feature text="Use your own earphones or earbuds" />
                <Feature text="10+ languages available" />
                <Feature text="Ask questions and everyone understands" />
              </div>

              <Link 
                href="/join"
                className="inline-flex items-center text-primary-600 font-semibold text-lg hover:text-primary-700"
              >
                Join a Tour Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>

            <div className="bg-gray-100 rounded-2xl p-8 lg:p-12">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm mx-auto">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Join a Tour</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <span className="text-2xl font-mono tracking-widest text-gray-400">ABC123</span>
                  </div>
                  <div className="bg-primary-600 text-white rounded-lg p-3 text-center font-medium">
                    Join Tour
                  </div>
                </div>
                <p className="text-center text-sm text-gray-500 mt-4">
                  Or scan QR from your guide
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Operators Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gray-800 rounded-2xl p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm text-gray-400">Live Tour</div>
                    <div className="text-xl font-semibold">Magnetic Island Wildlife</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm">Broadcasting</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-xs text-gray-400">Guests</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">5</div>
                    <div className="text-xs text-gray-400">Languages</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">45m</div>
                    <div className="text-xs text-gray-400">Duration</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">🇬🇧 3</span>
                  <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">🇩🇪 4</span>
                  <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">🇯🇵 2</span>
                  <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">🇨🇳 2</span>
                  <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">🇰🇷 1</span>
                </div>

                <button className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-4 font-semibold flex items-center justify-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Broadcasting...
                </button>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center px-4 py-2 bg-primary-900 text-primary-300 rounded-full text-sm font-medium mb-6">
                <Mic className="w-4 h-4 mr-2" />
                For Tour Operators
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Run Multilingual Tours Effortlessly
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                No more radio equipment. No more hiring multilingual guides. 
                Just speak and let TourLingo handle the rest.
              </p>

              <div className="space-y-4 mb-8">
                <FeatureDark text="Generate QR codes for instant guest joining" />
                <FeatureDark text="See guests grouped by language in real-time" />
                <FeatureDark text="Answer questions from any language" />
                <FeatureDark text="Review archived transcripts after tours" />
              </div>

              <Link 
                href={`${OPERATOR_URL}/login`}
                className="inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Languages Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            10 Languages, One Voice
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Your guests hear you — not a generic AI voice. TourLingo preserves 
            the warmth and personality of your narration.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <LanguageBadge flag="🇬🇧" name="English" />
            <LanguageBadge flag="🇩🇪" name="German" />
            <LanguageBadge flag="🇯🇵" name="Japanese" />
            <LanguageBadge flag="🇨🇳" name="Chinese" />
            <LanguageBadge flag="🇰🇷" name="Korean" />
            <LanguageBadge flag="🇫🇷" name="French" />
            <LanguageBadge flag="🇪🇸" name="Spanish" />
            <LanguageBadge flag="🇮🇹" name="Italian" />
            <LanguageBadge flag="🇵🇹" name="Portuguese" />
            <LanguageBadge flag="🇳🇱" name="Dutch" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Break the Language Barrier?
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Join tour operators worldwide who are connecting with guests in their native language.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/join" 
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-700 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-colors"
            >
              <Headphones className="w-5 h-5 mr-2" />
              Join a Tour
            </Link>
            <Link 
              href={`${OPERATOR_URL}/login`} 
              className="inline-flex items-center justify-center px-8 py-4 bg-primary-700 text-white rounded-xl font-semibold text-lg hover:bg-primary-800 transition-colors"
            >
              <Mic className="w-5 h-5 mr-2" />
              Operator Sign Up
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Globe className="w-6 h-6 text-primary-500" />
              <span className="text-lg font-bold text-white">TourLingo</span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <Link href="/join" className="hover:text-white transition-colors">
                Join Tour
              </Link>
              <Link href={`${OPERATOR_URL}/login`} className="hover:text-white transition-colors">
                Operators
              </Link>
              <a href="mailto:hello@tourlingo.app" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} TourLingo. All rights reserved.</p>
            <p className="mt-2 text-gray-500">
              Powered by ElevenLabs AI • Built in Australia 🇦🇺
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center space-x-3">
      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

function FeatureDark({ text }: { text: string }) {
  return (
    <div className="flex items-center space-x-3">
      <CheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
      <span className="text-gray-300">{text}</span>
    </div>
  );
}

function LanguageBadge({ flag, name }: { flag: string; name: string }) {
  return (
    <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
      <span className="text-xl mr-2">{flag}</span>
      <span className="font-medium text-gray-700">{name}</span>
    </div>
  );
}
