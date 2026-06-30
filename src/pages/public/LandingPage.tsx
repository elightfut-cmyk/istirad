import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Store, ArrowLeft, ShieldCheck, Globe, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function LandingPage() {
  const { user } = useAuthStore();
  const settingsStore = useSettingsStore();
  
  const img1 = settingsStore.heroImageUrl || "https://images.unsplash.com/photo-1556761175-5973dc0f32d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80";
  const img2 = settingsStore.heroImageUrl2 || "https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80"; // Default second image
  
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-['Tajawal'] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#065f46] rounded-xl flex items-center justify-center text-white">
              <PackageSearch size={24} />
            </div>
            <span className="text-2xl font-black text-[#065f46]">إستيراد</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to={`/${user.role}`} className="bg-[#065f46] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#044c38] transition-colors shadow-sm">
                العودة للوحة التحكم
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-[#065f46] font-medium transition-colors hidden sm:block">
                  تسجيل الدخول
                </Link>
                <Link to="/register" className="bg-[#065f46] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#044c38] transition-colors shadow-sm">
                  ابدأ الآن
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center pt-20 pb-24 px-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-green-200/40 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-[#065f46] font-bold text-sm mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#065f46] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#065f46]"></span>
              </span>
              المنصة الأولى للربط التجاري B2B
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-tight text-gray-900 mb-6">
              استورد منتجاتك <br />
              <span className="text-[#065f46]">بكل سهولة وأمان</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-lg">
              منصة "إستيراد" هي حلقة الوصل المثالية بين الموردين الموثوقين وتجار التجارة الإلكترونية. تصفح آلاف المنتجات بأسعار الجملة، أدر طلباتك، وانطلق بمتجرك نحو القمة.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {user ? (
                <Link to={`/${user.role}`} className="bg-[#065f46] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#044c38] transition-all hover:shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2">
                  الذهاب للوحة التحكم الخاصة بك
                  <ArrowLeft size={20} />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="bg-[#065f46] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#044c38] transition-all hover:shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2">
                    سجل كتاجر أو مورد
                    <ArrowLeft size={20} />
                  </Link>
                  <Link to="/login" className="bg-white text-gray-800 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:border-[#065f46] hover:text-[#065f46] transition-all flex items-center justify-center">
                    لدي حساب بالفعل
                  </Link>
                </>
              )}
            </div>
            
            <div className="mt-12 flex items-center gap-6 text-gray-500 text-sm font-medium">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-green-500" />
                <span>موردين معتمدين</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={20} className="text-blue-500" />
                <span>شحن عالمي</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-purple-500" />
                <span>أسعار تنافسية</span>
              </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block h-[500px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#065f46] to-green-400 rounded-[3rem] rotate-3 opacity-10 transform scale-105"></div>
            
            {/* Image Slider Container */}
            <div className="relative w-full h-full rounded-[3rem] shadow-2xl border-8 border-white overflow-hidden bg-gray-100 z-10">
              {/* Image 1 */}
              <img 
                src={img1}
                alt="Slide 1" 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                  activeIndex === 0 
                    ? 'opacity-100 translate-y-0 z-20' 
                    : 'opacity-0 -translate-y-10 z-10'
                }`}
              />
              
              {/* Image 2 */}
              <img 
                src={img2}
                alt="Slide 2" 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                  activeIndex === 1 
                    ? 'opacity-100 translate-y-0 z-20' 
                    : 'opacity-0 translate-y-10 z-10'
                }`}
              />
            </div>
            
            {/* Floating Card */}
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl z-30 flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <Store size={28} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold">نمو المبيعات</p>
                <p className="text-2xl font-black text-gray-900">+124%</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
