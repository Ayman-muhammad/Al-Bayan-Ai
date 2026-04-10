export interface Reciter {
  id: string;
  name: string;
  bio: string;
}

export const RECITERS: Reciter[] = [
  { 
    id: 'ar.alafasy', 
    name: 'Mishary Rashid Alafasy',
    bio: 'A world-renowned Kuwaiti qari, imam, and nasheed artist. He is celebrated for his unique, soulful voice and emotional style of recitation that resonates with millions globally.'
  },
  { 
    id: 'ar.abdulsamad', 
    name: 'AbdulBaset AbdulSamad',
    bio: 'Often called the "Golden Voice," he was a legendary Egyptian qari. His mastery of breath control and his powerful, melodic style made him one of the most beloved reciters in history.'
  },
  { 
    id: 'ar.sudais', 
    name: 'Abdurrahmaan As-Sudais',
    bio: 'The General President for the Affairs of the Two Holy Mosques and an imam of the Grand Mosque in Mecca. He is famous for his distinctive, rhythmic, and authoritative recitation.'
  },
  { 
    id: 'ar.mahermuaiqly', 
    name: 'Maher Al Muaiqly',
    bio: 'A prominent imam at the Grand Mosque in Mecca. His recitation is characterized by its clarity, gentleness, and deep emotional impact, making it very popular for daily listening.'
  },
  { 
    id: 'ar.minshawi', 
    name: 'Mohamed Siddiq El-Minshawi',
    bio: 'A master Egyptian qari known for his "crying" style of recitation. His voice is deeply spiritual, carrying a sense of profound humility and devotion.'
  },
  { 
    id: 'ar.husary', 
    name: 'Mahmoud Khalil Al-Husary',
    bio: 'A pioneer of Quranic recitation from Egypt. He was the first to record the complete Quran in the "Murattal" style and is revered for his impeccable Tajweed and precision.'
  },
  { 
    id: 'ar.shuraim', 
    name: 'Saud Al-Shuraim',
    bio: 'A former imam and Khateeb of the Grand Mosque in Mecca. He is known for his fast-paced, energetic, and highly rhythmic style of recitation.'
  },
];

export interface Language {
  id: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { id: 'en.sahih', name: 'English' },
  { id: 'sw.barwani', name: 'Kiswahili' },
  { id: 'so.abduh', name: 'Somali' },
  { id: 'am.sadiq', name: 'Amharic' },
];

export interface Verse {
  number: number;
  text: string;
  translation: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  audio: { [key: string]: string };
}

export async function fetchVerse(surah: number, ayah: number, langId: string = 'en.sahih'): Promise<Verse | null> {
  try {
    // Fetch Arabic text (uthmani for harakaat) and audio for all reciters
    const arabicRes = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,${langId},${RECITERS.map(r => r.id).join(',')}`);
    const data = await arabicRes.json();

    if (data.code === 200) {
      const arabicEdition = data.data.find((e: any) => e.edition.identifier === 'quran-uthmani');
      const translationEdition = data.data.find((e: any) => e.edition.identifier === langId);
      
      const audio: { [key: string]: string } = {};
      RECITERS.forEach(r => {
        const edition = data.data.find((e: any) => e.edition.identifier === r.id);
        if (edition) audio[r.id] = edition.audio;
      });

      return {
        number: arabicEdition.number,
        text: arabicEdition.text,
        translation: translationEdition.text,
        surahName: arabicEdition.surah.englishName,
        surahNumber: arabicEdition.surah.number,
        ayahNumber: arabicEdition.numberInSurah,
        audio
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching verse:", error);
    return null;
  }
}

export async function fetchDailyVerse(langId: string = 'en.sahih'): Promise<Verse | null> {
  const randomAyah = Math.floor(Math.random() * 6236) + 1;
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/editions/quran-uthmani,${langId},${RECITERS.map(r => r.id).join(',')}`);
    const data = await res.json();

    if (data.code === 200) {
      const arabicEdition = data.data.find((e: any) => e.edition.identifier === 'quran-uthmani');
      const translationEdition = data.data.find((e: any) => e.edition.identifier === langId);
      
      const audio: { [key: string]: string } = {};
      RECITERS.forEach(r => {
        const edition = data.data.find((e: any) => e.edition.identifier === r.id);
        if (edition) audio[r.id] = edition.audio;
      });

      return {
        number: arabicEdition.number,
        text: arabicEdition.text,
        translation: translationEdition.text,
        surahName: arabicEdition.surah.englishName,
        surahNumber: arabicEdition.surah.number,
        ayahNumber: arabicEdition.numberInSurah,
        audio
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
