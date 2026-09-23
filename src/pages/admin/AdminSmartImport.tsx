import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { LayoutDashboard, ShoppingBag, Users, Package, Ticket, MessageSquare, Lightbulb, Search, Image as ImageIcon, Loader2, CheckCircle2, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSmartImport() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  // Interactive State
  const [basePriceUSD, setBasePriceUSD] = useState<number>(0);
  const [baseWeightKg, setBaseWeightKg] = useState<number>(0.5);
  const [hasResult, setHasResult] = useState(false);

  // Dynamic Calculations (on the fly)
  const shippingCostUSD = baseWeightKg * 15;
  const totalCostUSD = basePriceUSD + shippingCostUSD;
  const platformMargin = totalCostUSD * 0.10; // 10%
  const finalPriceUSD = totalCostUSD + platformMargin;
  const finalPriceDZD = finalPriceUSD * 220; // 1 USD = 220 DZD

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setHasResult(false);
    }
  };

  const handleProcessImage = async () => {
    if (!imageFile) {
      toast.error('الرجاء اختيار صورة أولاً');
      return;
    }

    setLoading(true);
    setHasResult(false);
    try {
      // 1. Upload to Cloudinary
      setLoadingStep('Uploading image to Cloudinary...');
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('upload_preset', 'jiibha');

      const cloudinaryRes = await fetch('https://api.cloudinary.com/v1_1/xvhtji4c/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!cloudinaryRes.ok) {
        throw new Error('فشل رفع الصورة إلى Cloudinary');
      }

      const cloudinaryData = await cloudinaryRes.json();
      const secureUrl = cloudinaryData.secure_url;

      // 2. Serverless API Image Search (Secure)
      setLoadingStep('Fetching supplier data (Secure Server)...');

      const rapidApiRes = await fetch('/api/smart-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl: secureUrl })
      });

      if (!rapidApiRes.ok) {
        throw new Error('فشل التواصل مع الخادم الآمن لجلب البيانات');
      }

      const rapidApiData = await rapidApiRes.json();
      
      // 3. Data Extraction
      setLoadingStep('Calculating costs & estimating price...');
      
      let originalPriceUSD = 0;
      let weightKg = 0.5; // fallback
      
      const items = rapidApiData?.products || rapidApiData?.items || rapidApiData?.data?.items || rapidApiData?.data || rapidApiData;
      const firstItem = Array.isArray(items) ? items[0] : items;
      
      if (firstItem) {
         let rawPrice = firstItem.price?.value || firstItem.price?.current || firstItem.price || firstItem.originalPrice || firstItem.salePrice;
         if (typeof rawPrice === 'string') {
             const match = rawPrice.match(/[\d.]+/);
             if (match) rawPrice = match[0];
         }
         originalPriceUSD = parseFloat(rawPrice || 0);

         let rawWeight = firstItem.weight?.value || firstItem.weight;
         if (rawWeight) {
             const wMatch = String(rawWeight).match(/[\d.]+/);
             if (wMatch) weightKg = parseFloat(wMatch[0]);
         }
      }

      if (!originalPriceUSD || isNaN(originalPriceUSD)) {
          throw new Error('لم يتم العثور على منتج مطابق أو تعذر استخراج السعر');
      }

      // Update interactive state
      setBasePriceUSD(originalPriceUSD);
      setBaseWeightKg(weightKg);
      setHasResult(true);
      toast.success('تم جلب البيانات! يمكنك تعديل السعر والوزن يدوياً');
      
    } catch (error: any) {
      console.error('Smart Import Error:', error);
      toast.error(error.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <DashboardLayout
      title="الاستيراد الذكي / حاسبة الأسعار (خاص بالإدارة)"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'سوق الطلبات', href: '/admin/requests', icon: <Package size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'الصفحات', href: '/admin/pages', icon: <LayoutDashboard size={20} /> },
        { label: 'الأسئلة الشائعة', href: '/admin/faqs', icon: <MessageSquare size={20} /> },
        { label: 'الشكاوى', href: '/admin/complaints', icon: <Users size={20} /> },
        { label: 'الاقتراحات', href: '/admin/suggestions', icon: <Lightbulb size={20} /> },
        { label: 'الاستيراد الذكي', href: '/admin/smart-import', icon: <Search size={20} /> },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
          <Search className="text-blue-600 mt-1 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-blue-900">ميزة الاستيراد الذكي (Admin Only)</h3>
            <p className="text-sm text-blue-800 mt-1">
              هذه الأداة مخصصة للإدارة فقط للبحث عن المنتجات بالصور عبر AliExpress (عبر RapidAPI)، وتقدير الأسعار والتكاليف النهائية تلقائياً للعميل بناءً على سعر الدولار وهامش ربح المنصة. يمكنك تعديل السعر والوزن بعد البحث للحصول على نتائج أدق.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-bold text-gray-900 mb-4">اختر صورة المنتج</h3>
            
            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer p-6 relative overflow-hidden min-h-[250px]">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
              
              {imagePreview ? (
                <div className="absolute inset-0 p-2">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                    <span className="text-white font-bold flex items-center gap-2"><ImageIcon size={20} /> تغيير الصورة</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <ImageIcon size={48} className="mx-auto mb-3 text-gray-400" />
                  <p className="font-bold">انقر لاختيار صورة أو اسحبها هنا</p>
                  <p className="text-sm mt-1">JPG, PNG, WEBP (الحد الأقصى 5MB)</p>
                </div>
              )}
            </label>

            <button 
              onClick={handleProcessImage}
              disabled={loading || !imageFile}
              className="mt-4 w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {loadingStep}
                </>
              ) : (
                <>
                  <Search size={20} />
                  بحث وحساب التكلفة
                </>
              )}
            </button>
          </div>

          {/* Result Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden">
             {!hasResult && !loading && (
               <div className="text-center text-gray-400">
                 <Search size={64} className="mx-auto mb-4 opacity-50" />
                 <p className="font-bold text-lg">النتيجة ستظهر هنا</p>
                 <p className="text-sm">قم برفع الصورة واضغط على زر البحث</p>
               </div>
             )}

             {loading && (
               <div className="text-center text-[#4f46e5]">
                 <Loader2 size={48} className="mx-auto mb-4 animate-spin" />
                 <p className="font-bold animate-pulse">{loadingStep}</p>
               </div>
             )}

             {hasResult && !loading && (
               <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                 <div className="flex items-center gap-2 text-green-600 mb-4 pb-4 border-b border-gray-100">
                   <CheckCircle2 size={24} />
                   <h3 className="font-bold text-lg">تم جلب بيانات المورد بنجاح</h3>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-[#4f46e5] transition group">
                     <label className="flex items-center justify-between text-sm text-gray-500 mb-1">
                       السعر الأصلي ($)
                       <Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-[#4f46e5] transition" />
                     </label>
                     <input 
                       type="number" 
                       min="0"
                       step="0.01"
                       value={basePriceUSD} 
                       onChange={(e) => setBasePriceUSD(parseFloat(e.target.value) || 0)}
                       className="w-full bg-transparent border-b-2 border-transparent focus:border-[#4f46e5] outline-none text-xl font-black text-gray-900 transition-colors py-1"
                     />
                   </div>
                   
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-[#4f46e5] transition group">
                     <label className="flex items-center justify-between text-sm text-gray-500 mb-1">
                       الوزن (kg)
                       <Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-[#4f46e5] transition" />
                     </label>
                     <input 
                       type="number" 
                       min="0"
                       step="0.01"
                       value={baseWeightKg} 
                       onChange={(e) => setBaseWeightKg(parseFloat(e.target.value) || 0)}
                       className="w-full bg-transparent border-b-2 border-transparent focus:border-[#4f46e5] outline-none text-xl font-bold text-gray-900 transition-colors py-1"
                     />
                   </div>

                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <p className="text-sm text-gray-500 mb-1">تكلفة الشحن (15$/kg)</p>
                     <p className="text-xl font-bold text-orange-600">${shippingCostUSD.toFixed(2)}</p>
                   </div>
                   
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <p className="text-sm text-gray-500 mb-1">التكلفة الإجمالية</p>
                     <p className="text-xl font-bold text-gray-900">${totalCostUSD.toFixed(2)}</p>
                   </div>
                 </div>

                 <div className="bg-[#4f46e5] bg-opacity-10 border border-[#4f46e5] border-opacity-20 rounded-xl p-6 mt-4 flex flex-col items-center justify-center text-center">
                   <h4 className="font-bold text-[#4f46e5] mb-1">السعر النهائي المقترح للعميل</h4>
                   <p className="text-sm text-[#4f46e5] opacity-80 mb-3">(يشمل التكلفة + 10% هامش المنصة، تحويل بـ 1 DZD = 220 USD)</p>
                   <div className="text-4xl font-black text-[#4f46e5]">
                     DA {finalPriceDZD.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                   </div>
                 </div>

               </div>
             )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
