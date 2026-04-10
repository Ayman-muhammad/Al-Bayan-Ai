import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, ArrowRight, Camera, X, Image as ImageIcon, History } from 'lucide-react';
import { auth } from '../firebase';
import { UI_TRANSLATIONS } from '../translations';

interface SearchHeroProps {
  onSearch: (query: string, image?: string) => void;
  isLoading: boolean;
  recentSearches?: string[];
  language?: string;
}

const SUGGESTIONS: { [key: string]: string[] } = {
  'en.sahih': [
    "Finding inner peace in difficult times",
    "The importance of gratitude",
    "How to handle anxiety about the future",
    "Patience and perseverance",
    "The beauty of creation"
  ],
  'sw.barwani': [
    "Kupata amani ya ndani katika nyakati ngumu",
    "Umuhimu wa shukrani",
    "Jinsi ya kukabiliana na wasiwasi juu ya siku zijazo",
    "Subira na uvumilivu",
    "Uzuri wa uumbaji"
  ],
  'so.abduh': [
    "Helitaanka nabadda gudaha waqtiyada adag",
    "Muhiimadda mahadnaqa",
    "Sida loo maareeyo welwelka ku saabsan mustaqbalka",
    "Samir iyo dulqaad",
    "Quruxda abuurista"
  ],
  'am.sadiq': [
    "በአስቸጋሪ ጊዜያት ውስጣዊ ሰላምን ማግኘት",
    "የምስጋና አስፈላጊነት",
    "ስለ ወደፊቱ ጊዜ ጭንቀትን እንዴት መቋቋም እንደሚቻል",
    "ትዕግስት እና ጽናት",
    "የፍጥረት ውበት"
  ]
};

export const SearchHero: React.FC<SearchHeroProps> = ({ onSearch, isLoading, recentSearches = [], language = 'en.sahih' }) => {
  const [query, setQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS['en.sahih'];
  const suggestions = SUGGESTIONS[language] || SUGGESTIONS['en.sahih'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((query.trim() || selectedImage) && !isLoading) {
      onSearch(query, selectedImage || undefined);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-12 md:pt-20 pb-8 md:pb-12 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <h1 className="text-4xl md:text-7xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-4 md:mb-6 tracking-tight leading-tight">
          {user ? (
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-amber-600 dark:from-emerald-300 dark:to-amber-300">
              {t.welcome}, {user.displayName?.split(' ')[0]}
            </span>
          ) : (
            <>Al-Bayan <span className="text-emerald-600 dark:text-emerald-400">AI</span></>
          )}
        </h1>
        <p className="text-xl text-slate-700 dark:text-slate-200 max-w-2xl mx-auto font-light leading-relaxed">
          {language === 'en.sahih' ? 'Seek wisdom and contextual guidance from the Holy Quran through the lens of modern understanding.' : 
           language === 'sw.barwani' ? 'Tafuta hekima na mwongozo wa kimuktadha kutoka kwa Quran Tukufu kupitia lenzi ya ufahamu wa kisasa.' :
           language === 'so.abduh' ? 'Ka raadi xikmad iyo hanuun macne leh Qur\'aanka Kariimka ah adigoo u maraya fahamka casriga ah.' :
           'ከቅዱስ ቁርአን ጥበብን እና አውዳዊ መመሪያን በዘመናዊ ግንዛቤ ይፈልጉ።'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute inset-0 bg-emerald-200/20 blur-2xl rounded-full group-hover:bg-emerald-300/30 transition-all duration-500" />
          
          <div className="relative bg-white dark:bg-[#06201a] rounded-[2.5rem] shadow-[0_20px_50px_rgba(180,140,40,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-amber-200/40 dark:border-emerald-800/60 p-2 transition-all focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:border-emerald-500/30">
            {selectedImage && (
              <div className="px-6 pt-4 pb-2">
                <div className="relative inline-block">
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="h-24 w-24 object-cover rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/30 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center pl-4 md:pl-6">
              <Search className="text-slate-400 dark:text-slate-500 mr-2 md:mr-4 shrink-0" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={selectedImage ? (language === 'en.sahih' ? "Describe what you see..." : t.search) : (language === 'en.sahih' ? "Seeking guidance?" : t.search)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-base md:text-xl text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 py-3 md:py-4"
                disabled={isLoading}
              />
              
              <div className="flex items-center pr-1 md:pr-2 space-x-1 md:space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                  capture="environment"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 md:p-3 text-emerald-800/40 dark:text-emerald-200/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-all"
                  title="Take photo or upload image"
                >
                  <Camera size={20} />
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading || (!query.trim() && !selectedImage)}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white px-4 md:px-8 py-3 md:py-4 rounded-full font-medium transition-all flex items-center space-x-2 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/40"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="hidden md:inline">{t.search}</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-8">
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-widest mb-3 flex items-center gap-2 px-4">
                <History size={12} className="text-amber-600 dark:text-amber-400" />
                {t.recentHistory}
              </h3>
              <div className="flex flex-wrap gap-2 px-2">
                {recentSearches.slice(0, 5).map((s, i) => (
                  <button
                    key={`recent-${i}`}
                    onClick={() => {
                      setQuery(s);
                      onSearch(s);
                    }}
                    className="px-2 py-1 md:px-3 md:py-1.5 bg-white dark:bg-emerald-900/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg text-[10px] md:text-xs transition-all border border-amber-200/40 dark:border-emerald-800/50 shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Sparkles size={12} className="text-amber-500" />
              {t.suggestedTopics}
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
            {suggestions.map((suggestion, i) => (
              <motion.button
                key={suggestion}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                onClick={() => {
                  setQuery(suggestion);
                  onSearch(suggestion);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/95 dark:bg-emerald-900/20 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white text-slate-700 dark:text-slate-200 rounded-full border border-amber-200/40 dark:border-emerald-800/50 hover:border-emerald-600 dark:hover:border-emerald-500 text-xs md:text-sm transition-all shadow-sm hover:shadow-md group"
              >
                <Sparkles size={14} className="text-amber-500 group-hover:text-white transition-colors" />
                <span>{suggestion}</span>
              </motion.button>
            ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
