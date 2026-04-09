import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SearchHero } from './components/SearchHero';
import { VerseCard } from './components/VerseCard';
import { fetchVerse, fetchDailyVerse, Verse } from './services/quran';
import { findVersesByTheme, SemanticResult } from './services/gemini';
import { Sparkles, RefreshCw, BookMarked, Info } from 'lucide-react';
import { cn } from './lib/utils';
import { SpeedInsights } from '@vercel/speed-insights/react';

interface SearchResult extends Verse {
  relevanceReason: string;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [dailyVerse, setDailyVerse] = useState<Verse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'search' | 'bookmarks'>('search');
  const [bookmarks, setBookmarks] = useState<Verse[]>([]);

  useEffect(() => {
    loadDailyVerse();
    const savedBookmarks = localStorage.getItem('al-bayan-bookmarks');
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (e) {
        console.error("Failed to parse bookmarks", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('al-bayan-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const loadDailyVerse = async () => {
    const verse = await fetchDailyVerse();
    setDailyVerse(verse);
  };

  const toggleBookmark = (verse: Verse) => {
    setBookmarks(prev => {
      const isBookmarked = prev.some(b => b.surahNumber === verse.surahNumber && b.ayahNumber === verse.ayahNumber);
      if (isBookmarked) {
        return prev.filter(b => !(b.surahNumber === verse.surahNumber && b.ayahNumber === verse.ayahNumber));
      } else {
        return [...prev, verse];
      }
    });
  };

  const isVerseBookmarked = (v: Verse) => {
    return bookmarks.some(b => b.surahNumber === v.surahNumber && b.ayahNumber === v.ayahNumber);
  };

  const handleSearch = async (query: string, image?: string) => {
    setView('search');
    setIsLoading(true);
    setError(null);
    setCurrentQuery(query || "Visual Context");
    
    try {
      const semanticResults = await findVersesByTheme(query, image);
      
      if (semanticResults.length === 0) {
        setError("No relevant verses found for this query. Try rephrasing.");
        setResults([]);
        return;
      }

      const versePromises = semanticResults.map(async (res: SemanticResult) => {
        const verseData = await fetchVerse(res.surah, res.ayah);
        if (verseData) {
          return { ...verseData, relevanceReason: res.reason };
        }
        return null;
      });

      const fetchedVerses = (await Promise.all(versePromises)).filter(v => v !== null) as SearchResult[];
      setResults(fetchedVerses);
    } catch (err) {
      setError("Something went wrong while exploring. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel px-6 py-4 flex justify-between items-center">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setView('search')}
        >
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">B</div>
          <span className="font-serif font-bold text-xl tracking-tight">Al-Bayan</span>
        </div>
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setView('bookmarks')}
            className={cn(
              "transition-colors relative",
              view === 'bookmarks' ? "text-emerald-600" : "text-slate-500 hover:text-emerald-600"
            )}
          >
            <BookMarked size={20} />
            {bookmarks.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>
          <button className="text-slate-500 hover:text-emerald-600 transition-colors">
            <Info size={20} />
          </button>
        </div>
      </nav>

      <main className="container mx-auto pb-24">
        {view === 'search' ? (
          <>
            <SearchHero onSearch={handleSearch} isLoading={isLoading} />

            <div className="px-6">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
                      <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto text-emerald-600 animate-pulse" size={32} />
                    </div>
                    <p className="text-slate-500 font-medium animate-pulse">Consulting the wisdom of the Quran...</p>
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <p className="text-red-500 font-medium">{error}</p>
                    <button 
                      onClick={() => handleSearch(currentQuery)}
                      className="mt-4 text-emerald-600 flex items-center space-x-2 mx-auto hover:underline"
                    >
                      <RefreshCw size={16} />
                      <span>Try again</span>
                    </button>
                  </motion.div>
                ) : results.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-12"
                  >
                    <div className="text-center mb-12">
                      <h2 className="text-2xl font-serif font-bold text-slate-800">Guidance for: "{currentQuery}"</h2>
                      <div className="w-24 h-1 bg-emerald-500 mx-auto mt-4 rounded-full" />
                    </div>
                    {results.map((verse, i) => (
                      <VerseCard 
                        key={`${verse.surahNumber}-${verse.ayahNumber}`} 
                        verse={verse} 
                        query={currentQuery}
                        relevanceReason={verse.relevanceReason}
                        index={i}
                        isBookmarked={isVerseBookmarked(verse)}
                        onBookmarkToggle={toggleBookmark}
                      />
                    ))}
                  </motion.div>
                ) : dailyVerse ? (
                  <motion.div
                    key="daily"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-12"
                  >
                    <div className="text-center mb-12">
                      <h2 className="text-2xl font-serif font-bold text-slate-800">Daily Reflection</h2>
                      <p className="text-slate-500 mt-2">A curated verse to start your day with mindfulness.</p>
                      <div className="w-24 h-1 bg-emerald-500 mx-auto mt-4 rounded-full" />
                    </div>
                    <VerseCard 
                      verse={dailyVerse} 
                      index={0}
                      query="daily reflection"
                      isBookmarked={isVerseBookmarked(dailyVerse)}
                      onBookmarkToggle={toggleBookmark}
                    />
                    <div className="text-center">
                      <button 
                        onClick={loadDailyVerse}
                        className="text-slate-400 hover:text-emerald-600 flex items-center space-x-2 mx-auto transition-colors"
                      >
                        <RefreshCw size={16} />
                        <span>New Reflection</span>
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-32 px-6"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">Your Bookmarks</h2>
              <p className="text-slate-500">Verses you've saved for deeper reflection.</p>
              <div className="w-24 h-1 bg-emerald-500 mx-auto mt-6 rounded-full" />
            </div>

            {bookmarks.length === 0 ? (
              <div className="text-center py-20 glass-panel rounded-[3rem] max-w-2xl mx-auto">
                <BookMarked size={48} className="mx-auto text-slate-200 mb-6" />
                <p className="text-slate-400 text-lg">You haven't saved any verses yet.</p>
                <button 
                  onClick={() => setView('search')}
                  className="mt-6 text-emerald-600 font-medium hover:underline"
                >
                  Start exploring
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                {bookmarks.map((verse, i) => (
                  <VerseCard 
                    key={`bookmark-${verse.surahNumber}-${verse.ayahNumber}`} 
                    verse={verse} 
                    index={i}
                    query="bookmarked verse"
                    isBookmarked={true}
                    onBookmarkToggle={toggleBookmark}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm">
            © 2026 Al-Bayan AI. Powered by Gemini. Guidance is contextual; always consult scholars for deep theological matters.
          </p>
        </div>
      </footer>
      <SpeedInsights />
    </div>
  );
}
