import { useSettingsStore } from '../store/useSettingsStore';

export default function NewsTicker() {
  const { newsTickerItems, newsTickerActive, newsTickerTitle } = useSettingsStore();

  if (!newsTickerActive || !newsTickerItems || newsTickerItems.length === 0) {
    return null;
  }

  // Duplicate items slightly if there are too few, to ensure continuous scrolling
  const displayItems = newsTickerItems.length < 3 
    ? [...newsTickerItems, ...newsTickerItems, ...newsTickerItems] 
    : newsTickerItems;

  return (
    <div className="w-full bg-gray-50 py-8 border-b border-gray-100 relative z-20">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full bg-white border border-gray-200 text-gray-800 rounded-full py-1.5 overflow-hidden flex items-center relative shadow-sm" style={{ backgroundColor: '#ffffff' }}>
        <div className="absolute right-1 top-1 bottom-1 z-10 flex items-center pr-1">
          <span className="font-bold whitespace-nowrap bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-1.5 rounded-full text-sm flex items-center gap-2 shadow-sm">
            {newsTickerTitle || 'آخر الأخبار'}
          </span>
        </div>
        
        <div className="flex animate-marquee whitespace-nowrap mr-[140px] items-center">
          {displayItems.map((item, index) => (
            <span key={index} className="mx-6 font-bold text-sm flex items-center text-gray-700">
              <span className="w-1.5 h-1.5 bg-red-500 ml-4 inline-block opacity-40"></span>
              {item}
            </span>
          ))}
          {/* Duplicate array for seamless infinite scroll */}
          {displayItems.map((item, index) => (
            <span key={`dup-${index}`} className="mx-6 font-bold text-sm flex items-center text-gray-700">
              <span className="w-1.5 h-1.5 bg-red-500 ml-4 inline-block opacity-40"></span>
              {item}
            </span>
          ))}
        </div>
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
    </div>
  );
}
