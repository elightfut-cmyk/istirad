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
          <img key="image" src={card.imageUrl} alt={card.title} className="w-full h-32 object-cover rounded-xl mb-4 shadow-inner" />
        ) : null;
      case 'title':
        return card.title ? (
          <h3 key="title" className="text-xs font-bold text-[#f97316] mb-2 text-center">{card.title}</h3>
        ) : null;
      case 'subtitle':
        return card.subtitle ? (
          <p key="subtitle" className="text-3xl font-black text-white mb-2 text-center">{card.subtitle}</p>
        ) : null;
      case 'button':
        return card.buttonText && card.buttonUrl ? (
          <a 
            key="button"
            href={card.buttonUrl} 
            className="inline-block mt-auto pt-4 text-xs text-gray-400 font-medium hover:text-white transition-colors text-center w-full"
          >
            {card.buttonText}
          </a>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-transparent font-['Tajawal']">
      <div className="max-w-7xl mx-auto">
        {/* Main Dark Purple Container */}
        <div className="relative bg-[#130b2e] rounded-[2.5rem] shadow-2xl border border-[#4f46e5]/20 p-8 md:p-14 overflow-hidden">
          
          {/* Subtle Glow Effects */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#4f46e5] rounded-full blur-[120px] opacity-30 pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#f97316] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

          {/* Header Content */}
          <div className="relative z-10 flex flex-col items-center text-center mb-12">
            
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm mb-4 backdrop-blur-sm shadow-sm">
              متجر خدمات احترافي للتجارة الإلكترونية داخل الجزائر
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-red-500/30 text-red-400 text-xs font-bold mb-8 bg-red-500/5">
              لوحة المتجر
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
              الخدمات المدفوعة لتسريع النتائج
            </h2>

            <p className="text-base md:text-lg text-gray-400 max-w-3xl mb-10 leading-relaxed">
              استكشف خدمات منتقاة بعناية لتطوير المتجر، تحسين التحويلات، تسريع التنفيذ، والوصول إلى حلول احترافية جاهزة داخل السوق الجزائري.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
              <button className="px-8 py-3.5 rounded-xl bg-[#f97316] text-white font-bold hover:bg-[#ea580c] transition-all shadow-lg shadow-orange-500/20 min-w-[160px]">
                ابدأ التصفح
              </button>
              <button className="px-8 py-3.5 rounded-xl bg-[#1a103c] border border-white/10 text-white font-bold hover:bg-[#231552] transition-all backdrop-blur-sm min-w-[160px]">
                الخدمات المميزة
              </button>
            </div>

          </div>
          
          {/* Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {customWindowCards.map((card) => (
              <div 
                key={card.id} 
                className="flex flex-col items-center justify-center bg-[#1a103c] border border-white/5 rounded-2xl p-6 hover:bg-[#231552] transition-all duration-300 group hover:-translate-y-1 hover:border-white/10 shadow-lg"
              >
                {/* Dynamically render elements based on the admin layoutOrder */}
                {card.layoutOrder.map((element: string) => renderCardElement(element, card))}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
