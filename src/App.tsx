import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SearchHero } from './components/SearchHero';
import { VerseCard } from './components/VerseCard';
import { HifzChallenge } from './components/HifzChallenge';
import { fetchVerse, fetchDailyVerse, Verse, LANGUAGES } from './services/quran';
import { findVersesByTheme, SemanticResult } from './services/gemini';
import { Sparkles, RefreshCw, BookMarked, Info, Search, ChevronLeft, LogIn, LogOut, User as UserIcon, LayoutDashboard, History, Languages, Moon, Sun, Handshake, X, Trophy, Compass, LayoutGrid } from 'lucide-react';
import { cn } from './lib/utils';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, orderBy, limit, setDoc, deleteDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UI_TRANSLATIONS } from './translations';

interface SearchResult extends Verse {
  relevanceReason: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [dailyVerse, setDailyVerse] = useState<Verse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'search' | 'bookmarks' | 'dashboard' | 'history' | 'hifz'>('search');
  const [bookmarks, setBookmarks] = useState<Verse[]>([]);
  const [recentSearches, setRecentSearches] = useState<{id: string, query: string, timestamp: any}[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en.sahih');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const t = UI_TRANSLATIONS[selectedLanguage] || UI_TRANSLATIONS['en.sahih'];

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setBookmarks([]);
        setRecentSearches([]);
        // Fallback to local storage if not logged in
        const savedBookmarks = localStorage.getItem('al-bayan-bookmarks');
        if (savedBookmarks) {
          try {
            setBookmarks(JSON.parse(savedBookmarks));
          } catch (e) {
            console.error("Failed to parse bookmarks", e);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync: Bookmarks
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/bookmarks`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const b = snapshot.docs.map(doc => doc.data() as Verse);
      setBookmarks(b);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Recent Searches
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/recentSearches`;
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRecentSearches(s);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    loadDailyVerse();
  }, [selectedLanguage]);

  // Local Storage fallback for anonymous users
  useEffect(() => {
    if (!user) {
      localStorage.setItem('al-bayan-bookmarks', JSON.stringify(bookmarks));
    }
  }, [bookmarks, user]);

  const loadDailyVerse = async () => {
    const verse = await fetchDailyVerse(selectedLanguage);
    setDailyVerse(verse);
  };

  const toggleBookmark = async (verse: Verse) => {
    if (!user) {
      // Anonymous toggle
      setBookmarks(prev => {
        const isBookmarked = prev.some(b => b.surahNumber === verse.surahNumber && b.ayahNumber === verse.ayahNumber);
        if (isBookmarked) {
          return prev.filter(b => !(b.surahNumber === verse.surahNumber && b.ayahNumber === verse.ayahNumber));
        } else {
          return [...prev, verse];
        }
      });
      return;
    }

    const bookmarkId = `${verse.surahNumber}_${verse.ayahNumber}`;
    const path = `users/${user.uid}/bookmarks/${bookmarkId}`;
    const docRef = doc(db, `users/${user.uid}/bookmarks`, bookmarkId);
    
    try {
      const isBookmarked = bookmarks.some(b => b.surahNumber === verse.surahNumber && b.ayahNumber === verse.ayahNumber);
      if (isBookmarked) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, {
          ...verse,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const isVerseBookmarked = (v: Verse) => {
    return bookmarks.some(b => b.surahNumber === v.surahNumber && b.ayahNumber === v.ayahNumber);
  };

  const handleSearch = async (queryText: string, image?: string) => {
    setView('search');
    setIsLoading(true);
    setError(null);
    setCurrentQuery(queryText || "Visual Context");
    
    try {
      // Save search history if logged in
      if (user && queryText) {
        const path = `users/${user.uid}/recentSearches`;
        await addDoc(collection(db, path), {
          query: queryText,
          timestamp: serverTimestamp()
        });
      }

      const semanticResults = await findVersesByTheme(queryText, image);
      
      if (semanticResults.length === 0) {
        setError("No relevant verses found for this query. Try rephrasing.");
        setResults([]);
        return;
      }

      const versePromises = semanticResults.map(async (res: SemanticResult) => {
        const verseData = await fetchVerse(res.surah, res.ayah, selectedLanguage);
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
    <ErrorBoundary>
      <div className={cn(
        "min-h-screen gradient-bg selection:bg-emerald-100 selection:text-emerald-900 transition-all duration-500",
        isDarkMode && "dark"
      )}>
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 glass-panel px-4 md:px-6 py-3 md:py-4 flex justify-between items-center transition-all duration-300 border-b border-amber-200/30 dark:border-emerald-800/40">
          <div 
            className="flex items-center space-x-2 cursor-pointer shrink-0"
            onClick={() => setView('search')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40">B</div>
            <span className="font-serif font-bold text-lg md:text-xl tracking-tight text-emerald-900 dark:text-emerald-50 hidden sm:inline">Al-Bayan</span>
          </div>
          <div className="flex items-center space-x-1 md:space-x-4 overflow-x-auto no-scrollbar">
            {/* Support Developer */}
            <button 
              onClick={() => setShowSupportModal(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all shadow-sm hover:shadow-md group shrink-0"
              title={t.supportDeveloper}
            >
              <Handshake size={18} />
              <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">{t.supportDeveloper}</span>
            </button>

            {/* Language Selector */}
            <div className="flex items-center space-x-1 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shrink-0">
              <Languages size={14} className="text-slate-400 dark:text-slate-500" />
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id} className="bg-white dark:bg-slate-900">{lang.name}</option>
                ))}
              </select>
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="relative w-16 h-8 rounded-full bg-amber-100 dark:bg-emerald-900/40 transition-all duration-500 focus:outline-none shrink-0 group shadow-inner border border-amber-200/50 dark:border-emerald-800/50 overflow-hidden"
              title={t.toggleDarkMode}
            >
              <motion.div 
                animate={{ x: isDarkMode ? 32 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "absolute top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10",
                  isDarkMode ? "bg-emerald-500" : "bg-amber-500"
                )}
              >
                {isDarkMode ? (
                  <Moon size={14} className="text-white fill-white" />
                ) : (
                  <Sun size={14} className="text-white fill-white" />
                )}
              </motion.div>
              <div className="absolute inset-0 flex justify-between items-center px-2.5 pointer-events-none">
                <Sun size={12} className={cn("transition-all duration-500", isDarkMode ? "text-amber-600 opacity-100 scale-100" : "opacity-0 scale-50")} />
                <Moon size={12} className={cn("transition-all duration-500", isDarkMode ? "opacity-0 scale-50" : "text-emerald-400 opacity-100 scale-100")} />
              </div>
            </button>

            <button 
              onClick={() => setView('search')}
              className={cn(
                "transition-all duration-300 p-2 rounded-xl",
                view === 'search' ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
              )}
              title={t.search}
            >
              <Search size={20} />
            </button>
            <button 
              onClick={() => setView('hifz')}
              className={cn(
                "transition-all duration-300 p-2 rounded-xl relative",
                view === 'hifz' ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
              )}
              title={t.hifzChallenge}
            >
              <Trophy size={20} />
            </button>
            <button 
              onClick={() => setView('bookmarks')}
              className={cn(
                "transition-all duration-300 p-2 rounded-xl relative",
                view === 'bookmarks' ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
              )}
              title={t.bookmarks}
            >
              <BookMarked size={20} />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 dark:bg-emerald-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#fdfbf7] dark:border-[#041410]">
                  {bookmarks.length}
                </span>
              )}
            </button>
            {user ? (
              <div className="flex items-center space-x-1 md:space-x-4">
                <button 
                  onClick={() => setView('dashboard')}
                  className={cn(
                    "transition-all duration-300 p-2 rounded-xl",
                    view === 'dashboard' ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                  )}
                  title={t.dashboard}
                >
                  <LayoutDashboard size={20} />
                </button>
                <button 
                  onClick={logout}
                  className="text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2"
                  title={t.logout}
                >
                  <LogOut size={20} />
                </button>
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-amber-200 dark:border-emerald-500/50 shrink-0 shadow-sm">
                  <img src={user.photoURL || ''} alt={user.displayName || ''} referrerPolicy="no-referrer" />
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 shrink-0"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">{t.login}</span>
              </button>
            )}
          </div>
        </nav>

        <main className="container mx-auto pb-12 md:pb-24 relative z-10">
          {view === 'search' ? (
            <>
              <SearchHero 
                onSearch={handleSearch} 
                isLoading={isLoading} 
                recentSearches={recentSearches.map(s => s.query)}
                language={selectedLanguage}
              />

              <div className="px-6">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 md:py-20"
                    >
                      <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 border-4 border-emerald-100 dark:border-emerald-900/30 rounded-full" />
                        <div className="absolute inset-0 border-4 border-emerald-600 dark:border-emerald-500 rounded-full border-t-amber-500 animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto text-emerald-600 dark:text-emerald-400 animate-pulse" size={32} />
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">{t.consultingWisdom}</p>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 md:py-20"
                    >
                      <p className="text-red-600 dark:text-red-400 font-bold">{t.errorOccurred}</p>
                      <button 
                        onClick={() => handleSearch(currentQuery)}
                        className="mt-4 text-emerald-600 dark:text-emerald-400 flex items-center space-x-2 mx-auto hover:underline"
                      >
                        <RefreshCw size={16} />
                        <span>{t.tryAgain}</span>
                      </button>
                    </motion.div>
                  ) : results.length > 0 ? (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-12"
                    >
                      <div className="text-center mb-8 md:mb-12">
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-slate-800 dark:text-slate-100">{t.guidanceFor}: "{currentQuery}"</h2>
                        <div className="w-16 md:w-24 h-1 bg-emerald-500 mx-auto mt-3 md:mt-4 rounded-full" />
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
                      <div className="text-center mb-8 md:mb-12">
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-emerald-900 dark:text-emerald-50 flex items-center justify-center gap-2">
                          <Sparkles size={20} className="text-amber-500" />
                          {t.dailyReflection}
                        </h2>
                        <p className="text-xs md:text-base text-slate-600 dark:text-slate-300 mt-1 md:mt-2">{t.dailyReflectionDesc}</p>
                        <div className="w-16 md:w-24 h-1 bg-gradient-to-r from-emerald-500 to-amber-500 mx-auto mt-3 md:mt-4 rounded-full" />
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
                          <span>{t.newReflection}</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          ) : view === 'bookmarks' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-24 md:pt-32 px-4 md:px-6"
            >
              <div className="flex items-center justify-between mb-8 md:mb-16 max-w-4xl mx-auto">
                <button 
                  onClick={() => setView('search')}
                  className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-medium hover:bg-amber-50 dark:hover:bg-emerald-900/20 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-colors shrink-0 border border-transparent hover:border-amber-200 dark:hover:border-emerald-800/50"
                >
                  <ChevronLeft size={20} />
                  <span className="hidden sm:inline">{t.backToSearch}</span>
                </button>
                <div className="text-center flex-1 md:pr-24">
                  <h2 className="text-2xl md:text-4xl font-serif font-bold text-emerald-900 dark:text-emerald-50 mb-1 md:mb-2 flex items-center justify-center gap-3">
                    <BookMarked size={28} className="text-emerald-600 dark:text-emerald-400" />
                    {t.yourBookmarks}
                  </h2>
                  <p className="text-xs md:text-base text-slate-600 dark:text-slate-300">{t.bookmarksDesc}</p>
                </div>
              </div>

              {bookmarks.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-[3rem] max-w-2xl mx-auto border-amber-200/30 dark:border-emerald-800/40">
                  <BookMarked size={48} className="mx-auto text-amber-200 dark:text-emerald-900/40 mb-6" />
                  <p className="text-slate-600 dark:text-slate-400 text-lg">{t.noBookmarks}</p>
                  <button 
                    onClick={() => setView('search')}
                    className="mt-6 text-emerald-600 font-medium hover:underline"
                  >
                    {t.startExploring}
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
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-24 md:pt-32 px-4 md:px-6 max-w-4xl mx-auto"
            >
              <div className="text-center mb-8 md:mb-16">
                <h2 className="text-2xl md:text-4xl font-serif font-bold text-emerald-900 dark:text-emerald-50 mb-2 md:mb-4 flex items-center justify-center gap-3">
                  <LayoutDashboard size={28} className="text-emerald-600 dark:text-emerald-400" />
                  {t.yourDashboard}
                </h2>
                <p className="text-xs md:text-base text-slate-600 dark:text-slate-300">{t.dashboardDesc}</p>
                <div className="w-16 md:w-24 h-1 bg-gradient-to-r from-emerald-500 to-amber-500 mx-auto mt-4 md:mt-6 rounded-full" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                <div className="glass-panel p-6 md:p-8 rounded-3xl text-center hover:scale-105 transition-transform duration-300 border-amber-200/30 dark:border-emerald-800/40">
                  <BookMarked size={32} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-4" />
                  <div className="text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-50">{bookmarks.length}</div>
                  <div className="text-[10px] md:text-sm text-emerald-700 dark:text-emerald-300 uppercase tracking-widest mt-1 font-bold">{t.savedVerses}</div>
                </div>
                <div className="glass-panel p-6 md:p-8 rounded-3xl text-center hover:scale-105 transition-transform duration-300 border-amber-200/30 dark:border-emerald-800/40">
                  <History size={32} className="mx-auto text-amber-600 dark:text-amber-400 mb-4" />
                  <div className="text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-50">{recentSearches.length}</div>
                  <div className="text-[10px] md:text-sm text-emerald-700 dark:text-emerald-300 uppercase tracking-widest mt-1 font-bold">{t.recentInquiries}</div>
                </div>
                <div className="glass-panel p-6 md:p-8 rounded-3xl text-center hover:scale-105 transition-transform duration-300 border-amber-200/30 dark:border-emerald-800/40">
                  <Compass size={32} className="mx-auto text-amber-600 dark:text-amber-400 mb-4" />
                  <div className="text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-50">Level 1</div>
                  <div className="text-[10px] md:text-sm text-emerald-700 dark:text-emerald-300 uppercase tracking-widest mt-1 font-bold">{t.spiritualGrowth}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 md:mb-12">
                <div className="glass-panel p-6 md:p-8 rounded-3xl border-amber-200/30 dark:border-emerald-800/40">
                  <h3 className="text-xl font-serif font-bold text-emerald-900 dark:text-emerald-50 mb-6 flex items-center gap-2">
                    <History size={20} className="text-amber-600 dark:text-amber-400" />
                    {t.recentHistory}
                  </h3>
                  <div className="space-y-4">
                    {recentSearches.length === 0 ? (
                      <p className="text-slate-600 dark:text-slate-300 italic">{t.noHistory}</p>
                    ) : (
                      recentSearches.map((s) => (
                        <div 
                          key={s.id} 
                          className="flex items-center justify-between p-4 bg-amber-50/30 dark:bg-emerald-900/10 rounded-2xl hover:bg-amber-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer group border border-amber-100/50 dark:border-emerald-800/30"
                          onClick={() => handleSearch(s.query)}
                        >
                          <span className="text-slate-800 dark:text-slate-200 font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">"{s.query}"</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {s.timestamp?.toDate ? s.timestamp.toDate().toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass-panel p-6 md:p-8 rounded-3xl border-amber-200/30 dark:border-emerald-800/40 bg-gradient-to-br from-white to-amber-50/30 dark:from-emerald-900/10 dark:to-emerald-900/5">
                    <h3 className="text-xl font-serif font-bold text-emerald-900 dark:text-emerald-50 mb-4 flex items-center gap-2">
                      <Sparkles size={20} className="text-amber-500" />
                      {t.dailySunnah}
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 italic mb-4">
                      "The best of you are those who learn the Quran and teach it."
                    </p>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Sahih Bukhari</div>
                  </div>

                  <div className="glass-panel p-6 md:p-8 rounded-3xl border-amber-200/30 dark:border-emerald-800/40">
                    <h3 className="text-xl font-serif font-bold text-emerald-900 dark:text-emerald-50 mb-4 flex items-center gap-2">
                      <LayoutGrid size={20} className="text-emerald-600 dark:text-emerald-400" />
                      {t.ummahGoal}
                    </h3>
                    <div className="mb-2 flex justify-between items-end">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">1 Million Ayahs Read Today</span>
                      <span className="text-xs font-bold text-emerald-600">84%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-emerald-900/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '84%' }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>

        {/* Footer */}
        <footer className="py-8 md:py-12 border-t border-amber-200/30 dark:border-emerald-800/40 bg-white/50 dark:bg-[#041410]/50">
          <div className="container mx-auto px-6 text-center">
            <div className="mb-6">
              <button 
                onClick={() => setShowSupportModal(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
              >
                <Handshake size={18} />
                <span>{t.supportDeveloper}</span>
              </button>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 font-mono">+254742939367</p>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              © 2026 Al-Bayan AI. Powered by Gemini. Guidance is contextual; always consult scholars for deep theological matters.
            </p>
          </div>
        </footer>

        {/* Support Modal */}
        <AnimatePresence>
          {showSupportModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSupportModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white dark:bg-[#06201a] rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-amber-200/40 dark:border-emerald-800/60"
              >
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
                
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                    <Handshake size={32} />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100">{t.supportDeveloper}</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/50 dark:bg-emerald-900/20 rounded-xl border border-amber-100 dark:border-emerald-800/50">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {t.mpesaInstructions}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Phone Number</span>
                    <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">+254742939367</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSupportModal(false)}
                  className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/40"
                >
                  Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
