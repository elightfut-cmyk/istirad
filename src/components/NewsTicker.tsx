import { useSettingsStore } from '../store/useSettingsStore';

export default function NewsTicker() {
  const { newsTickerItems, newsTickerActive } = useSettingsStore();

  if (!newsTickerActive || !newsTickerItems || newsTickerItems.length === 0) {
    return null;
  }

  // Duplicate items slightly if there are too few, to ensure continuous scrolling
  const displayItems = newsTickerItems.length < 3 
    ? [...newsTickerItems, ...newsTickerItems, ...newsTickerItems] 
    : newsTickerItems;

  return (
    <div className="w-full bg-[#4f46e5] text-white py-2 overflow-hidden flex items-center relative">
      <div className="absolute right-0 top-0 bottom-0 bg-[#4f46e5] z-10 px-4 flex items-center shadow-[10px_0_10px_-5px_rgba(79,70,229,1)]">
        <span className="font-bold whitespace-nowrap bg-white text-[#4f46e5] px-3 py-1 rounded-full text-xs">آخر الأخبار</span>
      </div>
      
      <div className="flex animate-marquee whitespace-nowrap mr-24">
        {displayItems.map((item, index) => (
          <span key={index} className="mx-8 font-medium text-sm flex items-center">
            <span className="w-2 h-2 rounded-full bg-orange-400 ml-3 inline-block"></span>
            {item}
          </span>
        ))}
        {/* Duplicate array for seamless infinite scroll */}
        {displayItems.map((item, index) => (
          <span key={`dup-${index}`} className="mx-8 font-medium text-sm flex items-center">
            <span className="w-2 h-2 rounded-full bg-orange-400 ml-3 inline-block"></span>
            {item}
          </span>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); } /* Positive because RTL */
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        /* Make it move left to right in RTL, so it scrolls properly */
        [dir="rtl"] .animate-marquee {
          animation: marquee-rtl 30s linear infinite;
        }
        @keyframes marquee-rtl {
          0% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
