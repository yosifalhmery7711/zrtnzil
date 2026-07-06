import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Download, Share2, PlusSquare, ArrowUp, X, Sparkles, AlertCircle } from 'lucide-react';

interface InstallPromptModalProps {
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export default function InstallPromptModal({ deferredPrompt, onInstallSuccess }: InstallPromptModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / in standalone mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    // 2. Check if the device is iOS (iPhone/iPad)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // 3. Listen for custom manual trigger events from download buttons
    const handleManualTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('trigger-install-prompt-modal', handleManualTrigger);

    // 4. Decide to show prompt if not in standalone and hasn't been dismissed in the current session
    const isDismissed = sessionStorage.getItem('amrwh_install_prompt_dismissed') === 'true';

    let timer: NodeJS.Timeout;
    if (!isStandaloneMode && !isDismissed) {
      // Show prompt after a 1-minute delay of browsing as requested
      timer = setTimeout(() => {
        setIsOpen(true);
      }, 60000);
    }

    return () => {
      window.removeEventListener('trigger-install-prompt-modal', handleManualTrigger);
      if (timer) clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the installation prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      onInstallSuccess();
      setIsOpen(false);
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('amrwh_install_prompt_dismissed', 'true');
    setIsOpen(false);
  };

  // If already standalone, do not render anything
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md" dir="rtl">
          {/* Main Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-gradient-to-b from-white to-amber-50/20 dark:from-gray-900 dark:to-gray-950 rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-amber-500/10 dark:border-amber-500/5 relative overflow-hidden"
          >
            {/* Top decorative line for mobile pull down */}
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Glowing Accent Ring Background */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-full transition-all cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-6 text-center">
              {/* App Icon Branding */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-amber-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-4xl animate-pulse">
                    🌸
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-amber-800 text-white p-1.5 rounded-full border border-white dark:border-gray-900 shadow-md">
                    <Smartphone className="w-3.5 h-3.5" />
                  </span>
                </div>
                <h3 className="text-base font-black text-amber-950 dark:text-amber-200 mt-4 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                  <span>تثبيت تطبيق متجر أم روح 🌸</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mt-1.5 leading-relaxed">
                  احصلي على متجر أم روح على شاشتكِ الرئيسية لتسوق سريع وآمن بنقرة واحدة بدون متصفح! ✨
                </p>
              </div>

              {/* Core Features list */}
              <div className="bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl p-3.5 border border-amber-500/5 grid grid-cols-3 gap-2 text-right">
                <div className="text-center p-1 space-y-1">
                  <span className="text-lg block">⚡</span>
                  <h5 className="text-[10px] font-black text-amber-950 dark:text-amber-300">أسرع بـ 3 أضعاف</h5>
                  <p className="text-[8px] text-gray-400 leading-snug">تصفح فوري وسلس</p>
                </div>
                <div className="text-center p-1 space-y-1 border-x border-amber-100/30 dark:border-gray-800">
                  <span className="text-lg block">📉</span>
                  <h5 className="text-[10px] font-black text-amber-950 dark:text-amber-300">موفر للبيانات</h5>
                  <p className="text-[8px] text-gray-400 leading-snug">استهلاك أقل للإنترنت</p>
                </div>
                <div className="text-center p-1 space-y-1">
                  <span className="text-lg block">📴</span>
                  <h5 className="text-[10px] font-black text-amber-950 dark:text-amber-300">يعمل بدون إنترنت</h5>
                  <p className="text-[8px] text-gray-400 leading-snug">مزامنة كاش المنتجات</p>
                </div>
              </div>

              {/* Actions Section */}
              <div className="space-y-3">
                {isIOS ? (
                  /* Custom step-by-step instruction panel for iOS / Apple Safari */
                  <div className="bg-white dark:bg-gray-900 border border-amber-100 dark:border-gray-800 rounded-2xl p-4 text-right space-y-3 shadow-inner">
                    <h4 className="text-xs font-black text-amber-950 dark:text-amber-300 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>خطوات التثبيت السريعة للآيفون (iOS):</span>
                    </h4>
                    
                    <ol className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-400 font-extrabold text-[10px] flex items-center justify-center">
                          1
                        </span>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          اضغطي على زر 
                          <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-lg font-bold text-[10px]">
                            <Share2 className="w-3.5 h-3.5 text-blue-500" /> مشاركة (Share)
                          </span>
                          في شريط سفلي للمتصفح.
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-400 font-extrabold text-[10px] flex items-center justify-center">
                          2
                        </span>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          مرري للأسفل واختاري 
                          <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-lg font-bold text-[10px]">
                            <PlusSquare className="w-3.5 h-3.5 text-gray-500" /> إضافة إلى الشاشة الرئيسية
                          </span>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-400 font-extrabold text-[10px] flex items-center justify-center">
                          3
                        </span>
                        <span>
                          اضغطي على <strong>إضافة (Add)</strong> بالأعلى لتثبيت التطبيق بنجاح! 🎉
                        </span>
                      </li>
                    </ol>

                    <div className="pt-2 text-center flex flex-col items-center justify-center text-[10px] text-gray-400 animate-bounce">
                      <span>اضغطي بالأسفل على زر المشاركة ثم "إضافة للشاشة الرئيسية" 🔽</span>
                    </div>
                  </div>
                ) : deferredPrompt ? (
                  /* Automatic installation button for Android / Chrome */
                  <button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>تثبيت التطبيق الآن على الشاشة الرئيسية (تلقائي) ⚡</span>
                  </button>
                ) : (
                  /* Fallback if browser doesn't trigger prompt yet or inside iframe */
                  <div className="space-y-2">
                    <button
                      onClick={handleDismiss}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                      <span>بدء تثبيت التطبيق وتنزيله ⚡</span>
                    </button>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-normal max-w-xs mx-auto">
                      إذا لم يظهر مربع التثبيت التلقائي، يمكنك النقر على خيارات المتصفح (⋮) ثم اختيار <strong>تثبيت التطبيق (Install App)</strong> يدويًا.
                    </p>
                  </div>
                )}

                {/* Continue in Browser Button */}
                <button
                  onClick={handleDismiss}
                  className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold text-xs py-3 px-6 rounded-xl transition duration-200 cursor-pointer"
                >
                  المتابعة من خلال المتصفح 🌐
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
