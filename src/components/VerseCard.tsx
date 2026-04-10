import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Quote, RefreshCw, Share2, Bookmark, BookmarkCheck, Play, Pause, Volume2, Music, Target, Info, X } from 'lucide-react';
import { Verse, RECITERS } from '../services/quran';
import { getContextualTafseer } from '../services/gemini';
import { cn } from '../lib/utils';

interface VerseCardProps {
  verse: Verse;
  query?: string;
  relevanceReason?: string;
  index: number;
  isBookmarked?: boolean;
  onBookmarkToggle?: (verse: Verse) => void;
}

export const VerseCard: React.FC<VerseCardProps> = ({ 
  verse, 
  query, 
  relevanceReason, 
  index, 
  isBookmarked = false,
  onBookmarkToggle 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tafseer, setTafseer] = useState<{ english: string; arabic: string; references: string[] } | null>(null);
  const [isLoadingTafseer, setIsLoadingTafseer] = useState(false);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showReciterBio, setShowReciterBio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const scrollToVerse = () => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleFetchTafseer = async () => {
    if (!tafseer && query) {
      setIsLoadingTafseer(true);
      try {
        const result = await getContextualTafseer(verse.text, verse.translation, query);
        setTafseer(result);
        setIsExpanded(true);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingTafseer(false);
      }
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Al-Bayan AI: ${verse.surahName} ${verse.surahNumber}:${verse.ayahNumber}`,
      text: `${verse.text}\n\n"${verse.translation}"\n\nShared via Al-Bayan AI`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      alert(`Verse: ${verse.surahName} ${verse.surahNumber}:${verse.ayahNumber}\n\n${verse.text}\n\n"${verse.translation}"`);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (total > 0) {
        setProgress((current / total) * 100);
      } else {
        setProgress(0);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      setDuration(isNaN(d) ? 0 : d);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current && audioRef.current.duration > 0) {
      const val = Number(e.target.value);
      const seekTime = (val / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTime;
      setProgress(val);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const currentReciter = RECITERS.find(r => r.id === selectedReciter);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="w-full max-w-2xl mx-auto mb-6"
    >
      <div className="glass-panel rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_rgba(180,140,40,0.1)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)] hover:-translate-y-1 group border-amber-200/30 dark:border-emerald-800/40">
        <div className="p-5 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-medium mb-2">
                <BookOpen size={18} />
                <span className="text-sm tracking-wide uppercase">
                  {verse.surahName} • {verse.surahNumber}:{verse.ayahNumber}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {relevanceReason && (
                  <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full text-xs font-medium">
                    <Sparkles size={12} />
                    <span>AI Insight</span>
                  </div>
                )}
                <button
                  onClick={handleFetchTafseer}
                  disabled={isLoadingTafseer}
                  className="flex items-center space-x-1 text-white bg-emerald-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/40"
                >
                  {isLoadingTafseer ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span>Tafseer</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-1 text-emerald-800 dark:text-emerald-200 bg-white/80 dark:bg-emerald-900/20 px-3 py-1 rounded-full text-xs font-bold hover:bg-amber-50 dark:hover:bg-emerald-900/40 transition-all border border-amber-200/40 dark:border-emerald-800/50 shadow-sm"
                >
                  <Share2 size={12} />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => onBookmarkToggle?.(verse)}
                  className={cn(
                    "flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold transition-all border shadow-sm",
                    isBookmarked 
                      ? "text-white bg-amber-600 border-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20" 
                      : "text-emerald-800 dark:text-emerald-200 bg-white/80 dark:bg-emerald-900/20 border-amber-200/40 dark:border-emerald-800/50 hover:bg-amber-50 dark:hover:bg-emerald-900/40"
                  )}
                >
                  {isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                  <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                </button>
                <button
                  onClick={scrollToVerse}
                  className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-blue-100 dark:border-blue-800 shadow-sm"
                  title="Focus on this verse"
                >
                  <Target size={12} />
                  <span>Focus</span>
                </button>
              </div>
            </div>
          </div>

          {/* Audio Player Section */}
          <div className="mb-8 p-3 md:p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 flex items-center justify-center bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 hover:bg-emerald-700 hover:scale-105 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
                    <Volume2 size={14} className="text-emerald-500" />
                    <div className="flex items-center space-x-1">
                      <select
                        value={selectedReciter}
                        onChange={(e) => {
                          const wasPlaying = isPlaying;
                          setSelectedReciter(e.target.value);
                          if (audioRef.current) {
                            audioRef.current.load();
                            if (wasPlaying) {
                              audioRef.current.play().catch(console.error);
                            }
                          }
                        }}
                        className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors outline-none"
                      >
                        {RECITERS.map(r => (
                          <option key={r.id} value={r.id} className="bg-white dark:bg-[#06201a] text-slate-800 dark:text-slate-200">{r.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setShowReciterBio(true)}
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors"
                        title="About this reciter"
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Recitation</div>
                </div>
              </div>

              <div className="flex-1 flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 w-8">
                  {audioRef.current ? Math.floor(audioRef.current.currentTime) : 0}s
                </span>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={verse.audio[selectedReciter]}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleAudioEnd}
            />
          </div>

          <div className="space-y-8">
            <p className="arabic-text text-3xl md:text-5xl leading-[1.8] text-slate-950 dark:text-white text-right selection:bg-emerald-200 dark:selection:bg-emerald-800">
              {verse.text}
            </p>
            
            <div className="relative">
              <Quote className="absolute -left-4 -top-4 text-emerald-100 dark:text-emerald-900/20" size={40} />
              <p className="text-lg md:text-2xl text-slate-900 dark:text-slate-50 font-serif leading-relaxed pl-6 border-l-4 border-emerald-500/40">
                {verse.translation}
              </p>
            </div>
          </div>

          {relevanceReason && !isExpanded && (
            <div className="mt-6 p-4 bg-amber-50/50 dark:bg-emerald-900/20 rounded-2xl border border-amber-100 dark:border-emerald-800/50">
              <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                "{relevanceReason}"
              </p>
            </div>
          )}

          <AnimatePresence>
            {isExpanded && tafseer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 mt-8 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles size={14} />
                      Contextual Guidance
                    </h4>
                    
                    <div className="space-y-6">
                      <div>
                        <p className="text-slate-800 dark:text-slate-100 leading-relaxed text-lg font-serif italic">
                          "{tafseer.english}"
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="arabic-text text-2xl text-slate-950 dark:text-white leading-relaxed text-right">
                          {tafseer.arabic}
                        </p>
                      </div>
                    </div>
                  </div>

                  {tafseer.references.length > 0 && (
                    <div className="px-2">
                      <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">References & Sources</h5>
                      <div className="flex flex-wrap gap-2">
                        {tafseer.references.map((ref, i) => (
                          <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-8 w-full flex items-center justify-center space-x-2 py-3 text-slate-400 dark:text-slate-500 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group"
          >
            <span>{isExpanded ? 'Collapse' : 'View Details'}</span>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />}
          </button>
        </div>
      </div>

      {/* Reciter Bio Modal */}
      <AnimatePresence>
        {showReciterBio && currentReciter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReciterBio(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <button
                onClick={() => setShowReciterBio(false)}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Music size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100">{currentReciter.name}</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Master Qari</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {currentReciter.bio}
                </p>
              </div>
              
              <button
                onClick={() => setShowReciterBio(false)}
                className="mt-8 w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
