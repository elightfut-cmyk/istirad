import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Package, Ticket, MessageSquare, Lightbulb, Search, Image as ImageIcon, ExternalLink, Loader, UploadCloud, Key, Settings } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import toast from 'react-hot-toast';

export default function AdminAlibabaSearch() {
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [product, setProduct] = useState<any>(null);

  // API Keys state
  const [lensApiKey, setLensApiKey] = useState(localStorage.getItem('alibaba_lens_api_key') || '70ce2ef3e8mshc1e2d39c2a3d623p166ef2jsnf91121818898');
  const [detailsApiKey, setDetailsApiKey] = useState(localStorage.getItem('alibaba_details_api_key') || '70ce2ef3e8mshc1e2d39c2a3d623p166ef2jsnf91121818898');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('alibaba_lens_api_key', lensApiKey);
    localStorage.setItem('alibaba_details_api_key', detailsApiKey);
  }, [lensApiKey, detailsApiKey]);

  // Handle global paste event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
          setImageUrl('');
          setProduct(null);
          toast.success('تم لصق الصورة بنجاح!');
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageUrl('');
      setProduct(null);
    }
  };

  const handleSearch = async () => {
    if (!imageUrl && !imageFile) {
      toast.error('الرجاء إدخال رابط الصورة أو رفع/لصق صورة أولاً');
      return;
    }
    
    if (!lensApiKey || !detailsApiKey) {
      toast.error('الرجاء التأكد من إدخال مفاتيح API الخاصة بك أولاً');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setProduct(null);

    try {
      let finalImageUrl = imageUrl;

      // 1. Upload to Cloudinary if it's a file
      if (imageFile) {
        setLoadingStep('جاري رفع الصورة للخادم السحابي...');
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', 'jiibha');

        const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/xvhtji4c/image/upload', {
          method: 'POST',
          body: formData,
        });

        if (!cloudinaryRes.ok) {
          throw new Error('فشل رفع الصورة إلى الخادم السحابي');
        }

        const cloudinaryData = await cloudinaryRes.json();
        finalImageUrl = cloudinaryData.secure_url;
      }

      // 2. Search by Image
      setLoadingStep('جاري البحث في قاعدة البيانات باستخدام الصورة...');
      
      const lensUrl = "https://alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com/search/alibaba";
      const lensOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'alibaba-1688-ecom-china-lens-search-api.p.rapidapi.com',
          'x-rapidapi-key': lensApiKey
        },
        body: JSON.stringify({ imageUrl: finalImageUrl })
      };

      const lensResponse = await fetch(lensUrl, lensOptions);
      if (lensResponse.status === 429) {
        throw new Error('لقد تجاوزت الحد المسموح به للبحث (Too Many Requests). يرجى تحديث مفتاح Lens API الخاص بك.');
      }
      if (!lensResponse.ok) throw new Error('فشل الاتصال بخادم البحث بالصورة');
      
      const lensData = await lensResponse.json();
      
      let pUrl = '';
      
      // Aggressive extraction of items from various possible API response structures
      let items: any[] = [];
      if (Array.isArray(lensData)) {
        items = lensData;
      } else if (lensData.data && Array.isArray(lensData.data)) {
        items = lensData.data;
      } else if (lensData.data && Array.isArray(lensData.data.items)) {
        items = lensData.data.items;
      } else if (lensData.items && Array.isArray(lensData.items)) {
        items = lensData.items;
      } else if (lensData.result && Array.isArray(lensData.result)) {
        items = lensData.result;
      } else if (lensData.result && Array.isArray(lensData.result.items)) {
        items = lensData.result.items;
      }

      if (items.length > 0) {
        // Try to find the first item that has a productUrl or itemUrl or url
        const match = items.find((i: any) => i.productUrl || i.itemUrl || i.url);
        if (match) {
          pUrl = match.productUrl || match.itemUrl || match.url;
        } else {
          // If no url field is explicitly found, just take the first item if it's a string, or throw
          if (typeof items[0] === 'string') pUrl = items[0];
        }
      }

      if (!pUrl) {
        console.error("Lens API Response:", lensData);
        if (lensData.message) {
          throw new Error(`رد الخادم: ${lensData.message}`);
        }
        throw new Error('لم يتم العثور على منتجات مشابهة لهذه الصورة أو أن صيغة الرد غير معروفة.');
      }

      // 3. Fetch Product Details
      setLoadingStep('تم العثور على المنتج! جاري جلب التفاصيل الدقيقة...');
      
      const encodedUrl = encodeURIComponent(pUrl);
      const detailsUrl = `https://alibaba-api2.p.rapidapi.com/alibaba/product-details?url=${encodedUrl}`; 
      
      const detailsOptions = {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'alibaba-api2.p.rapidapi.com',
          'x-rapidapi-key': detailsApiKey
        }
      };

      const detailsResponse = await fetch(detailsUrl, detailsOptions);
      if (detailsResponse.status === 429) {
        throw new Error('لقد تجاوزت الحد المسموح به لجلب تفاصيل المنتجات (Too Many Requests). يرجى تحديث مفتاح Details API.');
      }
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
        
        {/* Settings Toggle */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <Settings size={18} />
            إعدادات مفاتيح API
          </button>
        </div>

        {/* API Keys Configuration Area */}
        {showSettings && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-orange-200 dark:border-orange-900/50 p-6 mb-6 animate-fadeIn">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Key size={20} className="text-orange-500" />
              تحديث مفاتيح RapidAPI
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              بإمكانك تغيير هذه المفاتيح متى ما انتهى اشتراكك أو قمت بفتح حساب جديد، وسيتم حفظها في متصفحك تلقائياً.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">مفتاح البحث بالصورة (Lens API Key):</label>
                <input
                  type="text"
                  value={lensApiKey}
                  onChange={(e) => setLensApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">مفتاح جلب التفاصيل (Details API Key):</label>
                <input
                  type="text"
                  value={detailsApiKey}
                  onChange={(e) => setDetailsApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#4f46e5]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-[#4f46e5]" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">البحث الذكي في موقع Alibaba (للإدارة فقط)</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto">
              يمكنك رفع صورة، نسخها ولصقها هنا مباشرة (Ctrl+V)، أو إدخال رابط الصورة للبحث عن تفاصيل المنتج بدقة من موقع علي بابا.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Image Upload / Paste Area */}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:bg-gray-800 transition cursor-pointer p-6 relative min-h-[200px]">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
              
              {imagePreview ? (
                <div className="absolute inset-0 p-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition rounded-lg">
                    <span className="text-white font-bold flex items-center gap-2"><ImageIcon size={20} /> تغيير الصورة</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <UploadCloud size={48} className="mx-auto mb-3 text-gray-400" />
                  <p className="font-bold mb-1">اضغط لاختيار صورة</p>
                  <p className="text-sm font-medium text-[#4f46e5] bg-[#4f46e5]/10 px-3 py-1 rounded-full inline-block mt-2">
                    أو اضغط Ctrl + V للصق صورة 📋
                  </p>
                </div>
              )}
            </label>

            {/* URL Input Area */}
            <div className="flex flex-col justify-center">
              <div className="text-center mb-4">
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-bold">أو</span>
              </div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">استخدام رابط صورة (URL):</label>
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent dark:bg-gray-700 dark:text-white mb-4"
                dir="ltr"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-[#4f46e5] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#4338ca] transition-colors disabled:opacity-70 flex items-center justify-center gap-3 text-lg shadow-lg shadow-indigo-500/30"
          >
            {loading ? <Loader className="animate-spin" size={24} /> : <Search size={24} />}
            <span>بدء البحث وجلب البيانات الدقيقة</span>
          </button>

          {loading && (
            <div className="mt-8 flex flex-col items-center animate-in fade-in">
              <p className="text-[#4f46e5] font-bold animate-pulse text-lg">{loadingStep}</p>
            </div>
          )}
        </div>

        {product && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="rounded-xl overflow-hidden mb-4 border border-gray-200 dark:border-gray-700">
                  <img 
                    src={product.image || product.images?.[0] || imagePreview || imageUrl} 
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
                        {Object.entries(product.attributes).slice(0, 6).map(([key, val]: any, i) => (
                          <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex border-b border-gray-100 dark:border-gray-700 pb-1">
                            <span className="w-32 font-semibold">{key}:</span>
                            <span className="flex-1">{val}</span>
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
                      زيارة صفحة المنتج في Alibaba
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
