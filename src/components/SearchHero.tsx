import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, ArrowRight, Camera, X, Image as ImageIcon } from 'lucide-react';

interface SearchHeroProps {
  onSearch: (query: string, image?: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  "Finding inner peace in difficult times",
  "The importance of gratitude",
  "How to handle anxiety about the future",
  "Patience and perseverance",
  "The beauty of creation"
];

export const SearchHero: React.FC<SearchHeroProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="w-full max-w-4xl mx-auto pt-20 pb-12 px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 mb-6 tracking-tight">
          Al-Bayan <span className="text-emerald-600">AI</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
          Seek wisdom and contextual guidance from the Holy Quran through the lens of modern understanding.
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
          
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-2 transition-all focus-within:ring-4 focus-within:ring-emerald-500/10">
            {selectedImage && (
              <div className="px-6 pt-4 pb-2">
                <div className="relative inline-block">
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="h-24 w-24 object-cover rounded-2xl border-2 border-emerald-100 shadow-sm"
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
            
            <div className="flex items-center pl-6">
              <Search className="text-slate-400 mr-4 shrink-0" size={24} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={selectedImage ? "Describe what you see or ask a question..." : "What are you seeking guidance on today?"}
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg md:text-xl text-slate-800 placeholder:text-slate-300 py-4"
                disabled={isLoading}
              />
              
              <div className="flex items-center pr-2 space-x-2">
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
                  className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
                  title="Take photo or upload image"
                >
                  <Camera size={24} />
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading || (!query.trim() && !selectedImage)}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white px-8 py-4 rounded-full font-medium transition-all flex items-center space-x-2 shadow-lg shadow-emerald-200"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="hidden md:inline">Explore</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {SUGGESTIONS.map((suggestion, i) => (
            <motion.button
              key={suggestion}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              onClick={() => {
                setQuery(suggestion);
                onSearch(suggestion);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-white/50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-full border border-slate-200 hover:border-emerald-200 text-sm transition-all"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>{suggestion}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
