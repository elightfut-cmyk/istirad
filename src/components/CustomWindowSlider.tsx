import { useSettingsStore } from '../store/useSettingsStore';
import { FileText, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { useRef } from 'react';

export default function CustomWindowSlider() {
  const { 
    customWindowCards, 
    customWindowActive,
    customWindowTopBadge,
    customWindowTitle,
    customWindowSubtitle
  } = useSettingsStore();

  if (!customWindowActive || !customWindowCards || customWindowCards.length === 0) {
    return null;
  }

  const sliderRef = useRef<HTMLDivElement>(null);
  
  const scroll = (direction: 'next' | 'prev') => {
    if (sliderRef.current) {
      // In RTL, next (visually left) is negative scrollLeft
      const scrollAmount = direction === 'next' ? -320 : 320;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full relative z-10 px-4 sm:px-6 lg:px-0 font-['Tajawal']">
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      <div className="w-full lg:max-w-2xl mx-auto bg-white rounded-3xl p-4 sm:p-6 relative shadow-sm">
        {/* Top Badge */}
        {customWindowTopBadge && (
          <div className="absolute -top-3 right-8 bg-indigo-50 text-[#4f46e5] border border-indigo-100 px-4 py-1 rounded-full text-sm font-bold shadow-sm">
            {customWindowTopBadge}
          </div>
        )}

        {/* Section Header */}
        <div className="mb-8 mt-6 flex justify-between items-end">
          <div>
            {customWindowTitle && <h2 className="text-3xl font-black text-gray-900 mb-2">{customWindowTitle}</h2>}
            {customWindowSubtitle && (
              <p className="text-sm text-gray-500">
                {customWindowSubtitle}
              </p>
            )}
          </div>
          
          {/* Navigation Arrows */}
          {customWindowCards.length > 2 && (
            <div className="hidden md:flex gap-2">
              <button onClick={() => scroll('prev')} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                <ChevronRight size={20} />
              </button>
              <button onClick={() => scroll('next')} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                <ChevronLeft size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Cards Slider */}
        <div 
          ref={sliderRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-6 pb-4 hide-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        >
          {customWindowCards.map((card) => {
            const hasImage = !!card.imageUrl;
            const topBadge = card.topBadge;
            const title = card.title;
            const subtitle = card.subtitle;
            const allTags: { text: string; color: string }[] = [];
            if (card.infoBadge1) allTags.push({ text: card.infoBadge1, color: '#6b7280' });
            if (card.infoBadge2) allTags.push({ text: card.infoBadge2, color: '#6b7280' });
            if (card.tags && card.tags.length > 0) {
              card.tags.forEach((t: any) => {
                if (typeof t === 'string') {
                  allTags.push({ text: t, color: '#4f46e5' });
                } else {
                  allTags.push(t);
                }
              });
            }
            
            // Buttons logic
            const hasLegacyButtons = card.buttonText || card.button2Text;
            const dynamicButtons = card.buttons || [];
            let mainButtonText = "شاهد هنا";
            let mainButtonUrl = "#";
            let mainButtonColor = card.buttonColor || "#8b5cf6";
            
            if (dynamicButtons.length > 0) {
              mainButtonText = dynamicButtons[0].text;
              mainButtonUrl = dynamicButtons[0].url;
              if (dynamicButtons[0].color) mainButtonColor = dynamicButtons[0].color;
            } else if (hasLegacyButtons) {
              mainButtonText = card.buttonText || card.button2Text || "شاهد هنا";
              mainButtonUrl = card.buttonUrl || card.button2Url || "#";
            }

            return (
              <div key={card.id} className="snap-center flex-none w-[85%] sm:w-[75%] md:w-[46%] relative rounded-2xl p-[2px] flex flex-col group overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Rainbow animated border */}
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#9400d3,#ff0000)] animate-[spin_4s_linear_infinite] opacity-40 group-hover:opacity-80 transition-opacity duration-300"></div>
                
                {/* Inner content wrapper */}
                <div className="relative h-full w-full bg-white rounded-[14px] p-3 flex flex-col z-10">
                  {/* Image */}
                  {hasImage && (
                    <div className="w-full h-40 sm:h-48 mb-4 overflow-hidden rounded-xl border border-gray-100 flex-shrink-0 relative group-hover:shadow-inner transition-shadow">
                      <img 
                        src={card.imageUrl} 
                        alt={title || "Image"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  )}
                
                {/* Content */}
                <div className="flex-1 flex flex-col p-1 sm:p-2">
                  {/* Inner Top Badge */}
                  {topBadge && (
                    <div className="flex justify-end mb-3">
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-[#4f46e5] border border-indigo-100 px-3 py-1 rounded-full text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></span>
                        {topBadge}
                      </span>
                    </div>
                  )}

                  {/* Title */}
                  {title && (
                    <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug line-clamp-2">
                      {title}
                    </h3>
                  )}

                  {/* Subtitle */}
                  {subtitle && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-3 leading-relaxed">
                      {subtitle}
                    </p>
                  )}

                  {/* Tags / Info Badges */}
                  {allTags.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center w-full gap-2 mb-5 mt-auto">
                      {allTags.map((badge, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm" style={{ 
                          backgroundColor: `${badge.color}15`, 
                          color: badge.color, 
                          borderColor: `${badge.color}30` 
                        }}>
                          {badge.text}
                          <FileText size={12} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className={allTags.length === 0 ? "mt-auto" : ""}>
                    <a 
                      href={mainButtonUrl}
                      className="w-full flex items-center justify-center gap-2 py-3 text-white transition-all duration-300 rounded-2xl font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5"
                      style={{
                        backgroundColor: mainButtonColor,
                        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.15) 100%)'
                      }}
                    >
                      {mainButtonText}
                      <Calendar size={16} />
                    </a>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
