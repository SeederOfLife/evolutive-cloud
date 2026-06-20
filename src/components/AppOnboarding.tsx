import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Cpu, MessageSquare, Globe } from 'lucide-react';
import { MANIFEST_PROVIDERS, ONBOARDING_STEPS } from '../constants/appConstants';

interface Props {
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: React.Dispatch<React.SetStateAction<number>>;
  webGPUSupported: boolean | null;
  aiProvider: string;
  onProviderSelect: (id: string, model: string) => void;
}

const STEP_ICONS = [Sparkles, Cpu, MessageSquare, Globe];

export default function AppOnboarding({
  showOnboarding, setShowOnboarding, onboardingStep, setOnboardingStep,
  webGPUSupported, aiProvider, onProviderSelect,
}: Props) {
  const finish = () => {
    localStorage.setItem('evolutive_onboarded', '1');
    setShowOnboarding(false);
  };

  return (
    <AnimatePresence>
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={onboardingStep}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                {React.createElement(STEP_ICONS[onboardingStep] ?? Sparkles, { className: 'w-6 h-6 text-indigo-400' })}
              </div>
              <h2 className="text-white text-xl font-bold mb-2">{ONBOARDING_STEPS[onboardingStep].title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{ONBOARDING_STEPS[onboardingStep].body}</p>

              {onboardingStep === 0 && (
                <p className="text-indigo-400 text-xs mt-4 bg-indigo-500/10 rounded-lg px-3 py-2">
                  {webGPUSupported
                    ? 'Free local AI is active by default. No API key needed to start.'
                    : 'Local AI requires a GPU. Add a free Google Gemini key to start — 30 seconds.'}
                </p>
              )}

              {onboardingStep === 1 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {MANIFEST_PROVIDERS.filter(p => webGPUSupported !== false || p.id !== 'web-llm').map(p => (
                    <button
                      key={p.id}
                      onClick={() => onProviderSelect(p.id, p.model)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        aiProvider === p.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <p.Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{p.label}</span>
                      {aiProvider === p.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-7">
                <div className="flex gap-1.5">
                  {ONBOARDING_STEPS.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === onboardingStep ? 'bg-indigo-400 w-3' : 'w-1.5 bg-gray-600'}`} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={finish} className="px-4 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    Skip
                  </button>
                  <button
                    onClick={() => {
                      if (onboardingStep < ONBOARDING_STEPS.length - 1) {
                        setOnboardingStep(s => s + 1);
                      } else {
                        finish();
                      }
                    }}
                    className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-all"
                  >
                    {onboardingStep < ONBOARDING_STEPS.length - 1 ? 'Next →' : 'Get Started'}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
