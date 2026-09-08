import { useSettingsStore } from '../store/useSettingsStore';

export default function CustomWindowSlider() {
  const { customWindowCards, customWindowActive } = useSettingsStore();

  if (!customWindowActive || !customWindowCards || customWindowCards.length === 0) {
    return null;
  }

  // Ensure older cards have the new layout elements if they are missing it
  const getLayoutOrder = (card: any) => {
    const defaultLayout = ['topBadge', 'title', 'subtitle', 'infoBadges', 'button'];
    if (!card.layoutOrder || card.layoutOrder.length === 0 || card.layoutOrder.includes('image')) {
      return defaultLayout;
    }
    return card.layoutOrder;
  };

  const renderTextElement = (element: string, card: any) => {
    switch (element) {
      case 'topBadge':
        return card.topBadge ? (
          <div key="topBadge" className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-gray-600 bg-white/5 text-gray-200 text-sm mb-4 backdrop-blur-sm w-max font-bold">
            {card.topBadge}
          </div>
        ) : null;
      case 'title':
        return card.title ? (
          <h2 key="title" className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            {card.title}
          </h2>
        ) : null;
      case 'subtitle':
        return card.subtitle ? (
          <p key="subtitle" className="text-base md:text-lg text-gray-300 max-w-2xl mb-6 leading-relaxed">
            {card.subtitle}
          </p>
        ) : null;
      case 'infoBadges':
        return (card.infoBadge1 || card.infoBadge2) ? (
          <div key="infoBadges" className="flex flex-wrap gap-3 mb-8">
            {card.infoBadge1 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e293b] bg-[#0f172a] text-gray-300 text-sm font-bold shadow-sm">
                {card.infoBadge1}
              </div>
            )}
            {card.infoBadge2 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e293b] bg-[#0f172a] text-gray-300 text-sm font-bold shadow-sm">
                {card.infoBadge2}
              </div>
            )}
          </div>
        ) : null;
      case 'button':
        return (card.buttonText || card.button2Text) ? (
          <div key="button" className="flex flex-wrap gap-4 mt-auto pt-4">
            {card.buttonText && (
              <a 
                href={card.buttonUrl || '#'} 
                className="px-8 py-3.5 rounded-xl text-white font-bold transition-all hover:-translate-y-0.5 min-w-[160px] text-center"
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
                className="px-8 py-3.5 rounded-xl bg-[#0f172a] border border-[#334155] text-gray-200 font-bold hover:bg-[#1e293b] hover:text-white transition-all min-w-[160px] text-center"
              >
                {card.button2Text}
              </a>
            )}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-transparent font-['Tajawal'] mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Carousel Container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 custom-scrollbar">
          {customWindowCards.map((card) => {
            const isImageLeft = card.imagePosition === 'left';

            return (
              <div 
                key={card.id} 
                className="snap-center shrink-0 w-full relative bg-[#0a0514] rounded-[2rem] shadow-2xl border border-gray-800 overflow-hidden flex flex-col md:flex-row"
              >
                {/* Subtle Glow Effects specific to the card */}
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-transparent to-[#0a0514] opacity-50 pointer-events-none z-0"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#4f46e5] rounded-full blur-[150px] opacity-20 pointer-events-none"></div>

                {/* Text Content Column */}
                <div className={`relative z-10 w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center ${isImageLeft ? 'md:order-2 text-right' : 'md:order-1 text-right'}`}>
                  {getLayoutOrder(card).map((element: string) => renderTextElement(element, card))}
                </div>

                {/* Image Column */}
                {card.imageUrl && (
                  <div className={`relative z-10 w-full md:w-1/2 p-6 md:p-8 flex items-center justify-center ${isImageLeft ? 'md:order-1' : 'md:order-2'}`}>
                    <div className="relative w-full h-full min-h-[300px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
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
