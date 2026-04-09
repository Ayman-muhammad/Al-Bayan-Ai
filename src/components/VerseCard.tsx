import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Quote, RefreshCw, Share2, Bookmark, BookmarkCheck } from 'lucide-react';
import { Verse } from '../services/quran';
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
        // Ignore abort errors
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      alert(`Verse: ${verse.surahName} ${verse.surahNumber}:${verse.ayahNumber}\n\n${verse.text}\n\n"${verse.translation}"`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="w-full max-w-2xl mx-auto mb-6"
    >
      <div className="glass-panel rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 text-emerald-700 font-medium mb-2">
                <BookOpen size={18} />
                <span className="text-sm tracking-wide uppercase">
                  {verse.surahName} • {verse.surahNumber}:{verse.ayahNumber}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {relevanceReason && (
                  <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium">
                    <Sparkles size={12} />
                    <span>AI Insight</span>
                  </div>
                )}
                <button
                  onClick={handleFetchTafseer}
                  disabled={isLoadingTafseer}
                  className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold hover:bg-emerald-100 transition-colors"
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
                  className="flex items-center space-x-1 text-slate-500 bg-slate-50 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-100"
                >
                  <Share2 size={12} />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => onBookmarkToggle?.(verse)}
                  className={cn(
                    "flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold transition-colors border",
                    isBookmarked 
                      ? "text-amber-600 bg-amber-50 border-amber-100" 
                      : "text-slate-500 bg-slate-50 border-slate-100 hover:bg-slate-100"
                  )}
                >
                  {isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                  <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <p className="arabic-text text-3xl md:text-4xl leading-[1.8] text-slate-800 text-right">
              {verse.text}
            </p>
            
            <div className="relative">
              <Quote className="absolute -left-4 -top-4 text-emerald-100" size={40} />
              <p className="text-lg md:text-xl text-slate-600 font-serif leading-relaxed pl-4">
                {verse.translation}
              </p>
            </div>
          </div>

          {relevanceReason && !isExpanded && (
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-sm text-slate-500 italic">
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
                <div className="pt-8 border-t border-slate-100 mt-8 space-y-6">
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles size={14} />
                      Contextual Guidance
                    </h4>
                    
                    <div className="space-y-6">
                      <div>
                        <p className="text-slate-700 leading-relaxed text-lg font-serif italic">
                          "{tafseer.english}"
                        </p>
                      </div>
                      
                      <div className="pt-4 border-t border-emerald-100">
                        <p className="arabic-text text-xl text-emerald-900 leading-relaxed text-right">
                          {tafseer.arabic}
                        </p>
                      </div>
                    </div>
                  </div>

                  {tafseer.references.length > 0 && (
                    <div className="px-2">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">References & Sources</h5>
                      <div className="flex flex-wrap gap-2">
                        {tafseer.references.map((ref, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-lg border border-slate-200">
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
            className="mt-8 w-full flex items-center justify-center space-x-2 py-3 text-slate-400 font-medium hover:bg-slate-50 rounded-xl transition-colors group"
          >
            <span>{isExpanded ? 'Collapse' : 'View Details'}</span>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
