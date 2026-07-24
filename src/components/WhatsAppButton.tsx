import { MessageCircle } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';

export default function WhatsAppButton() {
  const whatsappNumber = useSettingsStore(state => state.whatsappNumber);

  if (!whatsappNumber) return null;

  // Clean the number from any non-numeric characters except +
  const cleanNumber = whatsappNumber.replace(/[^\d+]/g, '');

  return (
    <a
      href={`https://wa.me/${cleanNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 bg-[#25D366] hover:bg-[#1ebd5a] text-white p-4 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
      aria-label="تواصل معنا عبر واتساب"
    >
      <MessageCircle size={28} className="animate-pulse" />
      <span className="absolute left-full ml-3 bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        تواصل معنا
      </span>
    </a>
  );
}
