import React, { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone, PlusSquare, Sparkles } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed / running standalone
    const isStandaloneApp = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneApp);
    if (isStandaloneApp) return;

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIphoneOrIpad);

    // Check if banner was dismissed in this session
    const isDismissed = sessionStorage.getItem('hybrid_pwa_banner_dismissed');
    if (isDismissed) return;

    // Handler for Chrome / Android / Edge install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // On iOS, show banner if not standalone
    if (isIphoneOrIpad && !isStandaloneApp) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('hybrid_pwa_banner_dismissed', 'true');
  };

  if (isStandalone || !showBanner) return null;

  return (
    <>
      {/* Top Floating PWA Banner */}
      <div className="mx-4 my-2 p-3 bg-gradient-to-r from-indigo-900/90 via-zinc-900 to-indigo-950/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl shadow-xl flex items-center justify-between text-white z-30 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-indigo-400 shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold flex items-center gap-1.5 text-indigo-200">
              Install Hybrid App
              <span className="text-[9px] bg-indigo-500/30 text-indigo-300 font-medium px-1.5 py-0.5 rounded-full border border-indigo-400/20">
                PWA
              </span>
            </h4>
            <p className="text-[10px] text-zinc-400">Add to home screen for offline launch & fast access</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">Install on iOS Home Screen</h3>
              </div>
              <button onClick={() => setShowIOSGuide(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white font-bold rounded-full text-[10px] shrink-0">1</span>
                <span>Tap the <strong className="text-white flex items-center gap-1 inline-flex"><Share className="w-3.5 h-3.5 text-indigo-400" /> Share button</strong> in Safari's bottom toolbar.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white font-bold rounded-full text-[10px] shrink-0">2</span>
                <span>Scroll down and select <strong className="text-white flex items-center gap-1 inline-flex"><PlusSquare className="w-3.5 h-3.5 text-indigo-400" /> Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-600 text-white font-bold rounded-full text-[10px] shrink-0">3</span>
                <span>Tap <strong className="text-indigo-400">Add</strong> in the top right corner. Done! 🎉</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
