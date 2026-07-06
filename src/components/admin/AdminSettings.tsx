import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/useSettingsStore';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const settingsStore = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
    const [localSettings, setLocalSettings] = useState({
    minQuantity: settingsStore.minQuantity,
    exchangeRate: settingsStore.exchangeRate || 135,
    adTitle: settingsStore.adTitle || '',
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
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
          />
          <button
            onClick={() => {
              if (newCategory.trim() && !localSettings.productCategories.includes(newCategory.trim())) {
                setLocalSettings(prev => ({ ...prev, productCategories: [...prev.productCategories, newCategory.trim()] }));
                setNewCategory('');
              }
            }}
            className="px-4 py-2 bg-[#4f46e5] text-white rounded-xl text-sm font-bold hover:bg-[#4338ca] transition-colors"
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
            className="block w-full max-w-lg px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
                  className="block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#4f46e5] file:text-white hover:file:bg-[#4338ca] transition-colors"
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
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
                  className="block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#4f46e5] file:text-white hover:file:bg-[#4338ca] transition-colors"
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
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
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
                className="block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#4f46e5] file:text-white hover:file:bg-[#4338ca] transition-colors"
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
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm bg-gray-50 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-[#4f46e5] text-white rounded-xl font-bold hover:bg-[#4338ca] transition-colors disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}
