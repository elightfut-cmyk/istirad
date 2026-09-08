import { useSettingsStore } from '../store/useSettingsStore';

export default function CustomWindowSlider() {
  const { customWindowCards, customWindowActive } = useSettingsStore();

  if (!customWindowActive || !customWindowCards || customWindowCards.length === 0) {
    return null;
  }

  // Ensure older cards have the new layout elements if they are missing it
  const getLayoutOrder = (card: any) => {
    const defaultLayout = ['topBadge', 'title', 'subtitle', 'infoBadges', 'tags', 'buttons'];
    if (!card.layoutOrder || card.layoutOrder.length === 0 || card.layoutOrder.includes('image')) {
      return defaultLayout;
    }
    return card.layoutOrder;
  };

  const renderTextElement = (element: string, card: any) => {
    switch (element) {
      case 'topBadge':
        return card.topBadge ? (
          <div key="topBadge" className="inline-flex items-center justify-center gap-2 px-5 py-1.5 rounded-full border border-gray-600 bg-white/5 text-gray-200 text-sm backdrop-blur-sm w-max font-bold">
            {card.topBadge}
          </div>
        ) : null;
      case 'title':
        return card.title ? (
          <h2 key="title" className="text-2xl md:text-4xl font-black text-white leading-tight">
            {card.title}
          </h2>
        ) : null;
      case 'subtitle':
        return card.subtitle ? (
          <p key="subtitle" className="text-sm md:text-base text-gray-300 max-w-2xl leading-relaxed">
            {card.subtitle}
          </p>
        ) : null;
      case 'infoBadges':
        return (card.infoBadge1 || card.infoBadge2) ? (
          <div key="infoBadges" className="flex flex-wrap items-center justify-center gap-2">
            {card.infoBadge1 && (
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#1e293b] bg-[#0f172a] text-gray-300 text-sm font-bold shadow-sm">
                {card.infoBadge1}
              </div>
            )}
            {card.infoBadge2 && (
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-[#1e293b] bg-[#0f172a] text-gray-300 text-sm font-bold shadow-sm">
                {card.infoBadge2}
              </div>
            )}
          </div>
        ) : null;
      case 'tags':
        return (card.tags && card.tags.length > 0) ? (
          <div key="tags" className="flex flex-wrap items-center justify-center gap-2 w-full">
            {card.tags.map((tag: string, index: number) => (
              <div key={index} className="px-4 py-1.5 rounded-full border border-[#f97316]/40 bg-[#f97316]/5 text-[#f97316] text-xs font-bold shadow-sm whitespace-nowrap">
                {tag}
              </div>
            ))}
          </div>
        ) : null;
      case 'buttons':
        const hasLegacyButtons = card.buttonText || card.button2Text;
        const dynamicButtons = card.buttons || [];
        
        if (dynamicButtons.length > 0) {
          return (
            <div key="buttons" className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {dynamicButtons.map((btn: any) => (
                <a 
                  key={btn.id}
                  href={btn.url || '#'} 
                  className={`px-6 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 text-center flex items-center justify-center ${btn.outlined ? 'bg-transparent border-2 text-white hover:bg-white/5' : 'text-white shadow-lg'}`}
                  style={btn.outlined ? { borderColor: btn.color || '#f97316' } : { backgroundColor: btn.color || '#f97316', boxShadow: `0 8px 20px -6px ${btn.color || '#f97316'}80` }}
                >
                  {btn.text}
                </a>
              ))}
            </div>
          );
        } else if (hasLegacyButtons) {
          return (
            <div key="button" className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {card.buttonText && (
                <a 
                  href={card.buttonUrl || '#'} 
                  className="px-6 py-3.5 rounded-xl text-white font-bold transition-all hover:-translate-y-0.5 text-center"
                  style={{ 
                    backgroundColor: card.buttonColor || '#a855f7', 
                    boxShadow: `0 8px 20px -6px ${card.buttonColor || '#a855f7'}80` 
                  }}
                >
                  {card.buttonText}
                </a>
              )}
              {card.button2Text && (
                <a 
                  href={card.button2Url || '#'} 
                  className="px-6 py-3.5 rounded-xl bg-[#0f172a] border border-[#334155] text-gray-200 font-bold hover:bg-[#1e293b] hover:text-white transition-all text-center"
                >
                  {card.button2Text}
                </a>
              )}
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-transparent font-['Tajawal'] mb-8 mt-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Carousel Container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 custom-scrollbar">
          {customWindowCards.map((card) => {
            const isImageLeft = card.imagePosition === 'left';
            const hasImage = !!card.imageUrl;

            return (
              <div 
                key={card.id} 
                className={`snap-center shrink-0 w-full relative rounded-[2rem] shadow-2xl p-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500`}
              >
                <div className="relative w-full h-full bg-[#4f46e5] rounded-[calc(2rem-2px)] overflow-hidden flex flex-col md:flex-row">
                  {/* Subtle Glow Effects specific to the card */}
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-transparent to-[#4f46e5] opacity-50 pointer-events-none z-0"></div>
                  <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#4f46e5] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

                  {/* Image Column - Moved above text in DOM so it renders on top on mobile */}
                  {hasImage && (
                    <div className={`relative z-10 w-full md:w-1/2 p-6 flex items-center justify-center ${isImageLeft ? 'md:order-1' : 'md:order-2'}`}>
                      <div className="relative w-full h-full min-h-[250px] md:min-h-[350px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                        {/* Inner glow for the image to blend it nicely */}
                        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(10,5,20,0.8)] pointer-events-none z-10"></div>
                        <img 
                          src={card.imageUrl} 
                          alt={card.title || "Banner Image"} 
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Text Content Column */}
                  <div className={`relative z-10 w-full ${hasImage ? 'md:w-1/2' : ''} p-6 md:p-8 flex flex-col gap-2.5 items-center justify-center text-center ${isImageLeft ? 'md:order-2' : 'md:order-1'}`}>
                    {getLayoutOrder(card).map((element: string) => renderTextElement(element, card))}
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569; 
        }
      `}} />
    </div>
  );
}
