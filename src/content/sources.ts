/** Scholarly sources shown in the Sources screen (mirrors docs/fiqh-rules.md). */
export interface Source {
  id: string;
  ar: string;
  en: string;
  url: string;
}

export const SOURCES: Source[] = [
  {
    id: 'dar_alifta_17233',
    ar: 'دار الإفتاء المصرية: كيفية قضاء الصلوات الفائتة لسنوات متعددة',
    en: 'Egypt Dar al-Ifta: making up prayers missed over many years',
    url: 'https://www.dar-alifta.org/ar/fatwa/details/17233/',
  },
  {
    id: 'gomaa_2026',
    ar: 'د. علي جمعة: حكم من ترك الصلاة سنوات وكيف يقضيها (مصراوي)',
    en: 'Dr. Ali Gomaa: ruling on one who left prayer for years (Masrawy)',
    url: 'https://www.masrawy.com/ramadan/islamic/details/2026/2/28/2950036/',
  },
  {
    id: 'binbaz_10390',
    ar: 'الشيخ ابن باز: حكم قضاء الصلوات لمن تركها عمدًا',
    en: 'Shaykh Ibn Baz: making up prayers left deliberately',
    url: 'https://binbaz.org.sa/fatwas/10390/',
  },
  {
    id: 'islamqa_293798',
    ar: 'الإسلام سؤال وجواب: بيان الخلاف في وجوب القضاء على من ترك الصلاة عمدًا',
    en: 'IslamQA: the difference of opinion on making up deliberately missed prayers',
    url: 'https://islamqa.info/ar/answers/293798',
  },
  {
    id: 'seekers_many_years',
    ar: 'SeekersGuidance: كيف تقضي صلوات سنوات كثيرة (بالإنجليزية)',
    en: 'SeekersGuidance: how to make up many years of missed prayers',
    url: 'https://seekersguidance.org/answers/hanafi-fiqh/how-to-make-up-many-years-of-missed-prayers/',
  },
];
