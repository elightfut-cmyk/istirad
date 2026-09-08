import { useSettingsStore } from '../store/useSettingsStore';

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

  return (
    <div className="w-full relative z-10 px-4 sm:px-6 lg:px-0 font-['Tajawal']">
      <div className="w-full lg:max-w-2xl mx-auto bg-white rounded-3xl p-4 sm:p-6 relative shadow-sm">
        {/* Top Badge */}
        {customWindowTopBadge && (
          <div className="absolute -top-3 right-8 bg-indigo-50 text-[#4f46e5] border border-indigo-100 px-4 py-1 rounded-full text-sm font-bold shadow-sm">
            {customWindowTopBadge}
          </div>
        )}

        {/* Section Header */}
        <div className="mb-8 mt-2">
          {customWindowTitle && <h2 className="text-3xl font-black text-gray-900 mb-2">{customWindowTitle}</h2>}
          {customWindowSubtitle && (
            <p className="text-sm text-gray-500">
              {customWindowSubtitle}
            </p>
          )}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customWindowCards.map((card) => {
            const hasImage = !!card.imageUrl;
            const topBadge = card.topBadge;
            const title = card.title;
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
            
            if (dynamicButtons.length > 0) {
              mainButtonText = dynamicButtons[0].text;
              mainButtonUrl = dynamicButtons[0].url;
            } else if (hasLegacyButtons) {
              mainButtonText = card.buttonText || card.button2Text || "شاهد هنا";
              mainButtonUrl = card.buttonUrl || card.button2Url || "#";
            }

            return (
              <div key={card.id} className="relative rounded-2xl p-[2px] flex flex-col group overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Rainbow animated border */}
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#9400d3,#ff0000)] animate-[spin_4s_linear_infinite] opacity-40 group-hover:opacity-80 transition-opacity duration-300"></div>
                
                {/* Inner content wrapper */}
                <div className="relative h-full w-full bg-white rounded-[14px] p-3 flex flex-col z-10">
                  {/* Image */}
                {hasImage && (
                  <div className="w-full h-40 sm:h-48 rounded-xl overflow-hidden mb-3">
                    <img 
                      src={card.imageUrl} 
                      alt={title || "Image"} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 flex flex-col p-2">
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
                        <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1 rounded-md shadow-sm" style={{ backgroundColor: badge.color }}>
                          {badge.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className={allTags.length === 0 ? "mt-auto" : ""}>
                    <a 
                      href={mainButtonUrl}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-[#4f46e5] hover:bg-indigo-100 transition-colors rounded-xl font-bold text-sm"
                    >
                      {mainButtonText}
                      <span className="text-lg leading-none">‹</span> {/* Left chevron for RTL layout */}
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
