import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, CheckCircle2, XCircle, Trophy, BookOpen, ArrowRight } from 'lucide-react';
import { fetchRandomVerse, Verse } from '../services/quran';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface HifzChallengeProps {
  language: string;
  t: any;
}

export function HifzChallenge({ language, t }: HifzChallengeProps) {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const loadNewChallenge = async () => {
    setIsLoading(true);
    setIsCorrect(null);
    setSelectedOption(null);
    setShowCelebration(false);
    
    try {
      // Fetch the target verse
      const targetVerse = await fetchRandomVerse(language);
      
      // Fetch 3 more random verses for distractors
      const distractors = await Promise.all([
        fetchRandomVerse(language),
        fetchRandomVerse(language),
        fetchRandomVerse(language)
      ]);

      const allOptions = [
        targetVerse.text,
        ...distractors.map(v => v.text)
      ].sort(() => Math.random() - 0.5);

      setVerse(targetVerse);
      setOptions(allOptions);
    } catch (error) {
      console.error("Failed to load challenge", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewChallenge();
  }, [language]);

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return;
    
    setSelectedOption(option);
    const correct = option === verse?.text;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(prev => prev + 1);
      setShowCelebration(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#ffffff']
      });
    }
  };

  // Split verse for the "Complete the Ayah" effect
  // We show the first few words and ask to complete it
  const getPrompt = () => {
    if (!verse) return "";
    const words = verse.text.split(' ');
    if (words.length <= 4) return "Complete this Ayah:";
    return words.slice(0, Math.floor(words.length / 2)).join(' ') + '...';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 border-4 border-emerald-100 dark:border-emerald-900/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-emerald-600 dark:border-emerald-500 rounded-full border-t-amber-500 animate-spin" />
        </div>
        <p className="text-emerald-800 dark:text-emerald-200 font-medium animate-pulse">Preparing your Hifz Challenge...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-bold mb-4 border border-amber-200 dark:border-amber-800/50">
          <Trophy size={16} />
          <span>Current Streak: {score}</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-emerald-900 dark:text-emerald-50 mb-4">Hifz Challenge</h2>
        <p className="text-slate-600 dark:text-slate-300 max-w-lg mx-auto">Test your memorization. Can you complete the Ayah correctly?</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={verse?.ayahNumber}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="glass-panel p-8 md:p-12 rounded-[2.5rem] border-amber-200/30 dark:border-emerald-800/40 relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <BookOpen size={120} className="text-emerald-900 dark:text-emerald-50" />
          </div>

          <div className="relative z-10">
            <div className="mb-8">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-600 dark:text-amber-400 mb-2 block">
                {verse?.surahName} • Ayah {verse?.ayahNumber}
              </span>
              <div className="text-2xl md:text-3xl font-serif leading-relaxed text-emerald-900 dark:text-emerald-50 text-center italic">
                "{getPrompt()}"
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {options.map((option, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOptionSelect(option)}
                  disabled={!!selectedOption}
                  className={cn(
                    "p-5 rounded-2xl text-left transition-all border text-sm md:text-base font-medium",
                    !selectedOption && "bg-white/50 dark:bg-emerald-900/10 border-amber-100 dark:border-emerald-800/30 hover:bg-white dark:hover:bg-emerald-900/20 hover:border-emerald-500",
                    selectedOption === option && isCorrect && "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-lg shadow-emerald-200/20",
                    selectedOption === option && !isCorrect && "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-900 dark:text-red-100",
                    selectedOption && option === verse?.text && !isCorrect && "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-500/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex-1">{option}</span>
                    {selectedOption === option && (
                      isCorrect ? <CheckCircle2 className="text-emerald-600 shrink-0 ml-3" size={20} /> : <XCircle className="text-red-600 shrink-0 ml-3" size={20} />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {selectedOption && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 text-center"
                >
                  {isCorrect ? (
                    <div className="mb-6">
                      <h4 className="text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mb-2">MashaAllah!</h4>
                      <p className="text-emerald-600 dark:text-emerald-300">You completed the Ayah perfectly.</p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h4 className="text-2xl font-serif font-bold text-amber-700 dark:text-amber-400 mb-2">Keep Practicing</h4>
                      <p className="text-amber-600 dark:text-amber-300">The correct completion was: <span className="font-bold italic">"{verse?.text}"</span></p>
                    </div>
                  )}
                  
                  <button
                    onClick={loadNewChallenge}
                    className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/40 group"
                  >
                    <span>Next Challenge</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/90 dark:bg-emerald-900/90 backdrop-blur-xl p-12 rounded-[3rem] border-4 border-amber-400 shadow-[0_0_100px_rgba(245,158,11,0.3)] text-center">
              <div className="text-6xl mb-6">✨</div>
              <h2 className="text-5xl font-serif font-bold text-emerald-900 dark:text-emerald-50 mb-4">MashaAllah!</h2>
              <div className="text-arabic text-4xl mb-6 text-amber-600">مَاشَاءَ اللَّهُ</div>
              <p className="text-xl text-emerald-700 dark:text-emerald-300 font-medium">Your heart is becoming a vessel for the Quran.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
