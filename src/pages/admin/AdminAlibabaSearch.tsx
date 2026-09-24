import { useState } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Package, Ticket, MessageSquare, Lightbulb, Search, Image as ImageIcon, ExternalLink, ShoppingCart, Loader } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSettingsStore } from '../../store/useSettingsStore';
import toast from 'react-hot-toast';

export default function AdminAlibabaSearch() {
  const { formatCurrency } = useSettingsStore();
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [product, setProduct] = useState<any>(null);

  const RAPIDAPI_KEY = "70ce2ef3e8mshc1e2d39c2a3d623p166ef2jsnf91121818898";

  const handleSearch = async () => {
    if (!imageUrl) {
      toast.error('الرجاء إدخال رابط الصورة أولاً');
      return;
    }

    setLoading(true);
    setProduct(null);

    try {
      setLoadingStep('جاري البحث في قاعدة البيانات باستخدام الصورة...');
      
      const lensUrl = "https://alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com/search/alibaba";
      const lensOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY
        },
        body: JSON.stringify({ imageUrl: imageUrl })
      };

      const lensResponse = await fetch(lensUrl, lensOptions);
      if (!lensResponse.ok) throw new Error('فشل الاتصال بخادم البحث بالصورة');
      
      const lensData = await lensResponse.json();
      
      let pUrl = '';
      if (Array.isArray(lensData) && lensData.length > 0) {
        pUrl = lensData[0].productUrl;
      } else if (lensData && lensData.data && Array.isArray(lensData.data) && lensData.data.length > 0) {
        pUrl = lensData.data[0].productUrl;
      } else {
        throw new Error('لم يتم العثور على منتجات مشابهة لهذه الصورة.');
      }

      if (!pUrl) throw new Error('حدث خطأ في استخراج رابط المنتج.');

      setLoadingStep('تم العثور على المنتج! جاري جلب التفاصيل الدقيقة...');
      
      const encodedUrl = encodeURIComponent(pUrl);
      const detailsUrl = `https://alibaba-api2.p.rapidapi.com/alibaba/product-details?url=${encodedUrl}`; 
      
      const detailsOptions = {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'alibaba-api2.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY
        }
      };

      const detailsResponse = await fetch(detailsUrl, detailsOptions);
      if (!detailsResponse.ok) throw new Error('فشل جلب تفاصيل المنتج من علي بابا.');
      
      const detailsData = await detailsResponse.json();
      
      setProduct(detailsData);
      toast.success('تم جلب تفاصيل المنتج بنجاح!');

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <DashboardLayout
      title="البحث المتقدم (إدارة)"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'سوق الطلبات', href: '/admin/requests', icon: <Package size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'الصفحات', href: '/admin/pages', icon: <LayoutDashboard size={20} /> },
        { label: 'الأسئلة الشائعة', href: '/admin/faqs', icon: <MessageSquare size={20} /> },
        { label: 'الشكاوى', href: '/admin/complaints', icon: <Users size={20} /> },
        { label: 'الاقتراحات', href: '/admin/suggestions', icon: <Lightbulb size={20} /> },
        { label: 'الاستيراد الذكي', href: '/admin/smart-import', icon: <Search size={20} /> },
        { label: 'بحث علي بابا', href: '/admin/alibaba-search', icon: <Search size={20} /> },
      ]}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8 text-center">
          <div className="w-16 h-16 bg-[#4f46e5]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="text-[#4f46e5]" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">البحث الذكي في موقع Alibaba (للإدارة فقط)</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            أدخل رابط صورة المنتج الذي تبحث عنه، وسيقوم النظام الذكي بالبحث في موقع علي بابا، واستخراج كافة التفاصيل والأسعار الدقيقة فوراً.
          </p>

          <div className="flex max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="ضع رابط الصورة هنا (مثال: https://example.com/image.jpg)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-r-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent dark:bg-gray-700 dark:text-white"
              dir="ltr"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-[#4f46e5] text-white px-8 py-3 rounded-l-xl font-bold hover:bg-[#4338ca] transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <Search size={20} />}
              <span>بحث</span>
            </button>
          </div>

          {loading && (
            <div className="mt-8 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[#4f46e5] font-medium animate-pulse">{loadingStep}</p>
            </div>
          )}
        </div>

        {product && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="rounded-xl overflow-hidden mb-4 border border-gray-200 dark:border-gray-700">
                  <img 
                    src={product.image || product.images?.[0] || imageUrl} 
                    alt="Product" 
                    className="w-full h-80 object-cover"
                  />
                </div>
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {product.images.slice(0, 5).map((img: string, i: number) => (
                      <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer" alt="" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 leading-relaxed">
                    {product.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-black text-[#4f46e5]">
                      {product.price}
                    </span>
                    {product.minOrderQty && (
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-bold">
                        أقل كمية (MOQ): {product.minOrderQty}
                      </span>
                    )}
                  </div>

                  {product.attributes && Object.keys(product.attributes).length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">المواصفات:</h4>
                      <ul className="space-y-1">
                        {Object.entries(product.attributes).slice(0, 4).map(([key, val]: any, i) => (
                          <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex">
                            <span className="w-24 font-semibold">{key}:</span>
                            <span>{val}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-6">
                  {product.productUrl && (
                    <a 
                      href={product.productUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                    >
                      <ExternalLink size={20} />
                      زيارة صفحة المنتج
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
