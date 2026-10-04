import { Globe } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';

interface LanguageToggleProps {
  className?: string;
  showText?: boolean;
}

export default function LanguageToggle({ className = '', showText = true }: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguageStore();

  return (
    <button
      onClick={toggleLanguage}
      type="button"
      className={`bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm border border-gray-200/60 dark:border-gray-600 shadow-xs ${className}`}
      title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
    >
      <Globe size={16} className="text-[#4f46e5] dark:text-indigo-400" />
      {showText && <span>{language === 'ar' ? 'English' : 'العربية'}</span>}
    </button>
  );
}
