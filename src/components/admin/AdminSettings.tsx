import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function AdminSettings() {
  const settingsStore = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
    const [localSettings, setLocalSettings] = useState({
    minQuantity: settingsStore.minQuantity,
    exchangeRate: settingsStore.exchangeRate || 135,
    adTitle: settingsStore.adTitle || '',
    adSubtitle: settingsStore.adSubtitle || '',
    adImageUrl: settingsStore.adImageUrl || '',
    adLinkUrl: settingsStore.adLinkUrl || '',
    chargilyLiveKey: settingsStore.chargilyLiveKey || '',
    heroImageUrl: settingsStore.heroImageUrl || '',
    heroImageUrl2: settingsStore.heroImageUrl2 || '',
    referralCommissionPercentage: settingsStore.referralCommissionPercentage || 0,
    platformFeePercentage: settingsStore.platformFeePercentage || 0,
    loyaltyPointsPerOrder: settingsStore.loyaltyPointsPerOrder || 50,
    loyaltyPointsToDzdRatio: settingsStore.loyaltyPointsToDzdRatio || 10,
    loyaltyPointsMinConversion: settingsStore.loyaltyPointsMinConversion || 500,
    productCategories: settingsStore.productCategories || []
  });

  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    setLocalSettings({
      minQuantity: settingsStore.minQuantity,
      exchangeRate: settingsStore.exchangeRate || 135,
      adTitle: settingsStore.adTitle || '',
      adSubtitle: settingsStore.adSubtitle || '',
      adImageUrl: settingsStore.adImageUrl || '',
      adLinkUrl: settingsStore.adLinkUrl || '',
      chargilyLiveKey: settingsStore.chargilyLiveKey || '',
      heroImageUrl: settingsStore.heroImageUrl || '',
      heroImageUrl2: settingsStore.heroImageUrl2 || '',
      referralCommissionPercentage: settingsStore.referralCommissionPercentage || 0,
      platformFeePercentage: settingsStore.platformFeePercentage || 0,
      loyaltyPointsPerOrder: settingsStore.loyaltyPointsPerOrder || 50,
      loyaltyPointsToDzdRatio: settingsStore.loyaltyPointsToDzdRatio || 10,
      loyaltyPointsMinConversion: settingsStore.loyaltyPointsMinConversion || 500,
      productCategories: settingsStore.productCategories || []
    });
  }, [settingsStore.minQuantity, settingsStore.exchangeRate, settingsStore.adTitle, settingsStore.adSubtitle, settingsStore.adImageUrl, settingsStore.adLinkUrl, settingsStore.chargilyLiveKey, settingsStore.heroImageUrl, settingsStore.heroImageUrl2, settingsStore.referralCommissionPercentage, settingsStore.platformFeePercentage, settingsStore.loyaltyPointsPerOrder, settingsStore.loyaltyPointsToDzdRatio, settingsStore.loyaltyPointsMinConversion, settingsStore.productCategories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingImage(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `ad_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('platform_assets')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('platform_assets').getPublicUrl(filePath);
      
      setLocalSettings(prev => ({ ...prev, adImageUrl: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة. تأكد من إنشاء الـ Bucket في قاعدة البيانات.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSecond = false) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingImage(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `hero_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('platform_assets')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('platform_assets').getPublicUrl(filePath);
      
      if (isSecond) {
        setLocalSettings(prev => ({ ...prev, heroImageUrl2: data.publicUrl }));
      } else {
        setLocalSettings(prev => ({ ...prev, heroImageUrl: data.publicUrl }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ 
          min_request_quantity: parseInt(localSettings.minQuantity.toString()) || 1,
          exchange_rate: parseFloat(localSettings.exchangeRate.toString()) || 135,
          ad_title: localSettings.adTitle || null,
          ad_subtitle: localSettings.adSubtitle || null,
          ad_image_url: localSettings.adImageUrl || null,
          ad_link_url: localSettings.adLinkUrl || null,
          chargily_live_key: localSettings.chargilyLiveKey || null,
          hero_image_url: localSettings.heroImageUrl || null,
          hero_image_url_2: localSettings.heroImageUrl2 || null,
          referral_commission_percentage: parseFloat(localSettings.referralCommissionPercentage.toString()) || 0,
          platform_fee_percentage: parseFloat(localSettings.platformFeePercentage.toString()) || 0,
          loyalty_points_per_order: parseInt(localSettings.loyaltyPointsPerOrder.toString()) || 0,
          loyalty_points_to_dzd_ratio: parseFloat(localSettings.loyaltyPointsToDzdRatio.toString()) || 0,
          loyalty_points_min_conversion: parseInt(localSettings.loyaltyPointsMinConversion.toString()) || 0,
          product_categories: localSettings.productCategories
        })
        .eq('id', 1);

      if (error) throw error;
      
      await settingsStore.fetchSettings(); // Refresh local Zustand store
      alert('تم تحديث الإعدادات بنجاح!');
    } catch (error) {
      console.error('Error saving settings', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Min Quantity */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">إعدادات الطلبات المخصصة</h3>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          الحد الأدنى لكمية الطلب المخصصة (Min Request Quantity)
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            min="1"
            name="minQuantity"
            value={localSettings.minQuantity}
            onChange={handleChange}
            className="block w-48 px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
          />
        </div>
        <p className="text-gray-500 text-sm mt-2">
          هذا الرقم سيظهر كتوجيه أولي للتجار عند فتحهم لطلب استيراد مخصص جديد.
        </p>
      </div>

      {/* Exchange Rate */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">إعدادات التحويل (العملة)</h3>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          سعر الصرف (1 دولار كم يساوي بالدينار)
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            min="1"
            step="0.01"
            name="exchangeRate"
            value={localSettings.exchangeRate}
            onChange={handleChange}
            className="block w-48 px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
          />
        </div>
        <p className="text-gray-500 text-sm mt-2">
          ملاحظة مهمة: يجب عليك إضافة عمود `exchange_rate` في قاعدة البيانات (جدول `platform_settings`) لكي يتم حفظ هذا التعديل.
        </p>
      </div>

      {/* Platform Fees and Referrals */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">رسوم المنصة ونظام الإحالة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نسبة ربح المنصة من الطلبات (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              name="platformFeePercentage"
              value={localSettings.platformFeePercentage}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">تستخدم لحساب ربح المنصة من المبيعات.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نسبة عمولة التاجر المُحيل (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              name="referralCommissionPercentage"
              value={localSettings.referralCommissionPercentage}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">تؤخذ من ربح المنصة.</p>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-800 mb-4 mt-8 border-b pb-2">نظام نقاط الولاء</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              النقاط عن كل طلب
            </label>
            <input
              type="number"
              min="0"
              name="loyaltyPointsPerOrder"
              value={localSettings.loyaltyPointsPerOrder}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">النقاط الممنوحة عند اكتمال الطلب.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              قيمة النقطة (دج)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              name="loyaltyPointsToDzdRatio"
              value={localSettings.loyaltyPointsToDzdRatio}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">قيمة النقطة الواحدة بالدينار.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحد الأدنى للتحويل
            </label>
            <input
              type="number"
              min="0"
              name="loyaltyPointsMinConversion"
              value={localSettings.loyaltyPointsMinConversion}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">أقل عدد نقاط يمكن تحويله.</p>
          </div>
        </div>
      </div>

      {/* Product Categories */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">تصنيفات المنتجات</h3>
        <p className="text-gray-500 text-sm mb-4">
          أضف أو احذف التصنيفات التي يمكن للموردين اختيارها لمنتجاتهم والتي تظهر كفلاتر في صفحة المنتجات.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="إضافة تصنيف جديد..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newCategory.trim() && !localSettings.productCategories.includes(newCategory.trim())) {
                  setLocalSettings(prev => ({ ...prev, productCategories: [...prev.productCategories, newCategory.trim()] }));
                  setNewCategory('');
                }
              }
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
          />
          <button
            onClick={() => {
              if (newCategory.trim() && !localSettings.productCategories.includes(newCategory.trim())) {
                setLocalSettings(prev => ({ ...prev, productCategories: [...prev.productCategories, newCategory.trim()] }));
                setNewCategory('');
              }
            }}
            className="px-4 py-2 bg-[#065f46] text-white rounded-xl text-sm font-bold hover:bg-[#044c38] transition-colors"
          >
            إضافة
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {localSettings.productCategories.map((cat, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-gray-700">{cat}</span>
              <button
                onClick={() => setLocalSettings(prev => ({ ...prev, productCategories: prev.productCategories.filter(c => c !== cat) }))}
                className="text-red-500 hover:text-red-700 font-bold"
                title="حذف"
              >
                &times;
              </button>
            </div>
          ))}
          {localSettings.productCategories.length === 0 && (
            <span className="text-sm text-gray-400">لا توجد تصنيفات، يرجى إضافة بعضها.</span>
          )}
        </div>
      </div>

      {/* Chargily */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">إعدادات الدفع (Chargily)</h3>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          مفتاح Live السري (Live Secret Key)
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            name="chargilyLiveKey"
            placeholder="live_sk_..."
            value={localSettings.chargilyLiveKey}
            onChange={handleChange}
            className="block w-full max-w-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
          />
        </div>
        <p className="text-gray-500 text-sm mt-2">
          إذا وضعت مفتاحاً هنا، سيتم توجيه جميع المدفوعات للبيئة الحقيقية. اتركه فارغاً للعودة للوضع التجريبي (Test).
        </p>
      </div>

      {/* Landing Page Images */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 mt-8 border-b pb-2">صور واجهة الموقع (Landing Page)</h3>
        <p className="text-gray-500 text-sm mb-4">
          قم بتغيير الصورتين اللتين تظهران بشكل متحرك في صفحة الهبوط.
        </p>
        <div className="space-y-6">
          {/* الصورة الأولى */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الصورة الأولى (رفع)</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleHeroImageUpload(e, false)}
                  disabled={uploadingImage}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#065f46] file:text-white hover:file:bg-[#044c38] transition-colors"
                />
              </div>
              {localSettings.heroImageUrl && (
                <div className="mt-2 text-xs text-green-600 font-bold">تم إضافة الصورة الأولى.</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">أو ضع رابط الصورة الأولى مباشرة (URL)</label>
              <input
                type="text"
                name="heroImageUrl"
                placeholder="https://..."
                value={localSettings.heroImageUrl || ''}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* الصورة الثانية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الصورة الثانية (رفع)</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleHeroImageUpload(e, true)}
                  disabled={uploadingImage}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#065f46] file:text-white hover:file:bg-[#044c38] transition-colors"
                />
              </div>
              {localSettings.heroImageUrl2 && (
                <div className="mt-2 text-xs text-green-600 font-bold">تم إضافة الصورة الثانية.</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">أو ضع رابط الصورة الثانية مباشرة (URL)</label>
              <input
                type="text"
                name="heroImageUrl2"
                placeholder="https://..."
                value={localSettings.heroImageUrl2 || ''}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ad Banner */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">الإشهار (Ad Banner)</h3>
        <p className="text-gray-500 text-sm mb-4">
          سيظهر هذا الإشهار في أعلى شاشة التاجر والمورد إذا تم إدخال "العنوان الرئيسي" على الأقل.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان الرئيسي</label>
            <input
              type="text"
              name="adTitle"
              placeholder="مثال: خصم خاص 20% على رسوم المنصة!"
              value={localSettings.adTitle}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان الفرعي (وصف قصير)</label>
            <input
              type="text"
              name="adSubtitle"
              placeholder="مثال: صالح لمدة 3 أيام فقط للتجار الجدد."
              value={localSettings.adSubtitle}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رفع صورة للإشهار</label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#065f46] file:text-white hover:file:bg-[#044c38] transition-colors"
              />
              {uploadingImage && <span className="text-sm text-gray-500 self-center">جاري الرفع...</span>}
            </div>
            {localSettings.adImageUrl && (
              <div className="mt-2 text-xs text-green-600 font-bold">
                تمت إضافة صورة للإشهار. (يمكنك حفظ الإعدادات الآن)
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رابط التوجيه عند الضغط (Link URL)</label>
            <input
              type="text"
              name="adLinkUrl"
              placeholder="https://..."
              value={localSettings.adLinkUrl}
              onChange={handleChange}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#065f46] focus:border-[#065f46] sm:text-sm bg-gray-50 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-[#065f46] text-white rounded-xl font-bold hover:bg-[#044c38] transition-colors disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}
