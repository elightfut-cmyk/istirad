import { useSettingsStore } from '../store/useSettingsStore';

export default function CustomWindowSlider() {
  const { customWindowCards, customWindowActive } = useSettingsStore();

  if (!customWindowActive || !customWindowCards || customWindowCards.length === 0) {
    return null;
  }

  const renderCardElement = (element: string, card: any) => {
    switch (element) {
      case 'image':
        return card.imageUrl ? (
          <img key="image" src={card.imageUrl} alt={card.title} className="w-full h-48 object-cover rounded-t-2xl" />
        ) : null;
      case 'title':
        return card.title ? (
          <h3 key="title" className="text-xl font-bold text-gray-900 px-6 pt-6">{card.title}</h3>
        ) : null;
      case 'subtitle':
        return card.subtitle ? (
          <p key="subtitle" className="text-gray-500 px-6 mt-2 flex-grow">{card.subtitle}</p>
        ) : null;
      case 'button':
        return card.buttonText && card.buttonUrl ? (
          <div key="button" className="px-6 pb-6 mt-6">
            <a 
              href={card.buttonUrl} 
              className="inline-block px-6 py-3 bg-[#4f46e5] text-white font-bold rounded-xl hover:bg-[#4338ca] transition-colors w-full text-center"
            >
              {card.buttonText}
            </a>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="w-full py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
          
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 custom-scrollbar">
            {customWindowCards.map((card) => (
              <div 
                key={card.id} 
                className="snap-start shrink-0 w-80 flex flex-col bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Dynamically render elements based on the admin layoutOrder */}
                {card.layoutOrder.map((element: string) => renderCardElement(element, card))}
              </div>
            ))}
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4f46e5; 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4338ca; 
        }
      `}} />
    </div>
  );
}
