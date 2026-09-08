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
      <div className="w-full bg-white rounded-3xl p-4 sm:p-6 relative shadow-sm">
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
            const topBadge = card.topBadge || (card.tags && card.tags.length > 0 ? card.tags[0] : null);
            const title = card.title;
            const subtitle = card.subtitle;
            const infoBadges = [];
            if (card.infoBadge1) infoBadges.push(card.infoBadge1);
            if (card.infoBadge2) infoBadges.push(card.infoBadge2);
            // Optionally, we can also add other tags if we want, but the design shows only a few badges.
            
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
              <div key={card.id} className="border border-indigo-100/60 bg-white rounded-2xl p-3 flex flex-col hover:border-indigo-200 transition-colors shadow-sm">
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

                  {/* Info Badges */}
                  {infoBadges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-5 mt-auto">
                      {infoBadges.map((badge, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-100 px-2 py-1 rounded-lg">
                          {badge}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className={infoBadges.length === 0 ? "mt-auto" : ""}>
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
