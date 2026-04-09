export interface Verse {
  number: number;
  text: string;
  translation: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
}

export async function fetchVerse(surah: number, ayah: number): Promise<Verse | null> {
  try {
    // Fetch Arabic text
    const arabicRes = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`);
    const arabicData = await arabicRes.json();

    // Fetch English translation
    const englishRes = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.sahih`);
    const englishData = await englishRes.json();

    if (arabicData.code === 200 && englishData.code === 200) {
      return {
        number: arabicData.data.number,
        text: arabicData.data.text,
        translation: englishData.data.text,
        surahName: arabicData.data.surah.englishName,
        surahNumber: arabicData.data.surah.number,
        ayahNumber: arabicData.data.numberInSurah,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching verse:", error);
    return null;
  }
}

export async function fetchDailyVerse(): Promise<Verse | null> {
  // Random verse for now, or we could pick a "meaningful" one
  const randomAyah = Math.floor(Math.random() * 6236) + 1;
  try {
    const arabicRes = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/ar.alafasy`);
    const arabicData = await arabicRes.json();
    const englishRes = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/en.sahih`);
    const englishData = await englishRes.json();

    if (arabicData.code === 200 && englishData.code === 200) {
      return {
        number: arabicData.data.number,
        text: arabicData.data.text,
        translation: englishData.data.text,
        surahName: arabicData.data.surah.englishName,
        surahNumber: arabicData.data.surah.number,
        ayahNumber: arabicData.data.numberInSurah,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
