import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Package, Plus, X, DollarSign, Upload, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SupplierProducts() {
  const { user } = useAuthStore();
  const { formatCurrency, productCategories } = useSettingsStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price_usd: 0, cost_price_usd: 0, moq: 1, image_url: '', advance_percentage: 20, discount_price_usd: 0, category: '' });
  const exchangeRate = useSettingsStore(state => state.exchangeRate) || 135;
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setForm({ title: '', description: '', price_usd: 0, cost_price_usd: 0, moq: 1, image_url: '', advance_percentage: 20, discount_price_usd: 0, category: productCategories[0] || '' });
    setImageFile(null);
    setEditingProductId(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: any) => {
    setForm({
      title: product.title,
      description: product.description,
      price_usd: product.price_usd || (product.price / exchangeRate),
      cost_price_usd: product.cost_price_usd || (product.cost_price / exchangeRate),
      discount_price_usd: product.discount_price_usd || (product.discount_price ? product.discount_price / exchangeRate : 0),
      moq: product.moq,
      advance_percentage: product.advance_percentage || 20,
      category: product.category || productCategories[0] || '',
      image_url: product.images && product.images.length > 0 ? product.images[0] : ''
    });
    setImageFile(null);
    setEditingProductId(product.id);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== productId)); // Optimistic UI
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('حدث خطأ أثناء حذف المنتج.');
    }
  };

  useEffect(() => {
    fetchProducts();
    
    const handleRefresh = () => fetchProducts();
    window.addEventListener('refresh_data', handleRefresh);
    return () => window.removeEventListener('refresh_data', handleRefresh);
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, cost_price, moq, advance_percentage, discount_price, images, created_at, supplier_id, category, price_usd, cost_price_usd, discount_price_usd')
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) {
        console.error('Products fetch error:', error);
        return; // Ignore if table doesn't exist yet
      }
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const sellingPrice = form.discount_price_usd > 0 ? form.discount_price_usd : form.price_usd;
    if (sellingPrice <= form.cost_price_usd) {
      alert('الرجاء التأكد من أن السعر (أو السعر بعد التخفيض) أكبر من سعر التكلفة لتحقيق ربح.');
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = form.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert('حدث خطأ أثناء رفع الصورة. يرجى التأكد من إنشاء Storage Bucket باسم products.');
          setSubmitting(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      if (editingProductId) {
        const { error } = await supabase.from('products').update({
          title: form.title,
          description: form.description,
          price: Math.round(form.price_usd * exchangeRate),
          price_usd: form.price_usd,
          cost_price: Math.round(form.cost_price_usd * exchangeRate),
          cost_price_usd: form.cost_price_usd,
          moq: form.moq,
          advance_percentage: form.advance_percentage,
          discount_price: form.discount_price_usd > 0 ? Math.round(form.discount_price_usd * exchangeRate) : null,
          discount_price_usd: form.discount_price_usd > 0 ? form.discount_price_usd : null,
          images: finalImageUrl ? [finalImageUrl] : [],
          category: form.category
        }).eq('id', editingProductId);
        if (error) throw error;
      } else {
        const productData = {
          supplier_id: user.id,
          title: form.title,
          description: form.description,
          price: Math.round(form.price_usd * exchangeRate),
          price_usd: form.price_usd,
          cost_price: Math.round(form.cost_price_usd * exchangeRate),
          cost_price_usd: form.cost_price_usd,
          moq: form.moq,
          advance_percentage: form.advance_percentage,
          discount_price: form.discount_price_usd > 0 ? Math.round(form.discount_price_usd * exchangeRate) : null,
          discount_price_usd: form.discount_price_usd > 0 ? form.discount_price_usd : null,
          images: finalImageUrl ? [finalImageUrl] : [],
          category: form.category
        };
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setForm({ title: '', description: '', price_usd: 0, cost_price_usd: 0, moq: 1, image_url: '', advance_percentage: 20, discount_price_usd: 0, category: '' });
      setImageFile(null);
      setEditingProductId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('حدث خطأ أثناء إضافة المنتج. يرجى التأكد من إنشاء جدول products وصلاحيات قاعدة البيانات (RLS).');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="منتجاتي"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/supplier', icon: <Package size={20} /> },
        { label: 'منتجاتي', href: '/supplier/products', icon: <Package size={20} /> },
        { label: 'سوق الطلبات', href: '/supplier/requests', icon: <Package size={20} /> },
        { label: 'الطلبات الواردة', href: '/supplier/orders', icon: <Package size={20} /> },
        { label: 'التقارير المالية', href: '/supplier/financials', icon: <DollarSign size={20} /> },
      ]}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">إدارة المنتجات</h2>
        <button 
          onClick={handleOpenAddModal}
          className="bg-[#4f46e5] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#4338ca] transition-colors"
        >
          <Plus size={20} />
          <span>إضافة منتج جديد</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : products.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد منتجات بعد</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            قم بإضافة منتجاتك الأولى للبدء في تلقي طلبات الشراء من التجار.
          </p>
          <button 
            onClick={handleOpenAddModal}
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            إنشاء منتج
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <div className="w-full h-48 bg-gray-50 flex items-center justify-center p-2">
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <Package size={40} className="text-gray-400" />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{product.title}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditProduct(product)} className="text-gray-400 hover:text-blue-600 transition-colors" title="تعديل">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="حذف">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mt-1 truncate">{product.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex flex-col">
                    {product.discount_price > 0 && product.discount_price < product.price ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#4f46e5]">{formatCurrency(product.discount_price)}</span>
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">-{Math.round(((product.price - product.discount_price) / product.price) * 100)}%</span>
                        </div>
                      </>
                    ) : (
                      <span className="font-bold text-[#4f46e5]">{formatCurrency(product.price)}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">أقل كمية: {product.moq}</span>
                    <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-md">عربون: {product.advance_percentage || 20}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 pb-12 max-h-[85vh] md:max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingProductId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h2>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 text-sm text-blue-800">
              <strong>ملاحظة هامة:</strong> يرجى إدخال جميع الأسعار بالدينار الجزائري (د.ج) دائماً. سيقوم النظام تلقائياً بتحويلها وعرضها بالدولار للتجار الذين يفضلون ذلك، مع الحفاظ على تسعيرتك الأصلية ثابتة مهما تغير سعر الصرف.
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج</label>
                <input 
                  type="text" required 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  placeholder="مثال: حقيبة سفر جلدية"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <select 
                  required 
                  value={form.category} 
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                >
                  <option value="" disabled>اختر التصنيف</option>
                  {productCategories.map((cat, index) => (
                    <option key={index} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea 
                  required rows={3}
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر الجملة بالدولار ($)</label>
                  <input 
                    type="number" step="0.01" required min="0"
                    value={form.price_usd || ''} 
                    onChange={e => setForm({...form, price_usd: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">يساوي: {formatCurrency(Math.round((form.price_usd || 0) * exchangeRate))}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الدفعة المقدمة (العربون) %</label>
                  <input 
                    type="number" required min="0" max="100"
                    value={form.advance_percentage || ''} 
                    onChange={e => setForm({...form, advance_percentage: parseInt(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة الحقيقي للوحدة بالدولار ($)</label>
                <p className="text-xs text-gray-500 mb-2">سعر التكلفة مخفي عن التاجر، ويُستخدم فقط لحساب رسوم المنصة من ربحك الصافي.</p>
                <input 
                  type="number" required min="0" step="0.01"
                  value={form.cost_price_usd || ''} 
                  onChange={e => setForm({...form, cost_price_usd: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">يساوي: {formatCurrency(Math.round((form.cost_price_usd || 0) * exchangeRate))}</p>
              </div>

              {((form.discount_price_usd > 0 ? form.discount_price_usd : form.price_usd) > form.cost_price_usd && form.cost_price_usd > 0) && (
                <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center text-sm">
                  <span className="text-green-700 font-bold">ربحك الصافي للوحدة:</span>
                  <span className="font-bold text-green-800">{formatCurrency(Math.round(((form.discount_price_usd > 0 ? form.discount_price_usd : form.price_usd) - form.cost_price_usd) * exchangeRate))}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعر بعد التخفيض بالدولار ($)</label>
                  <input 
                    type="number" step="0.01" min="0"
                    value={form.discount_price_usd || ''} 
                    onChange={e => setForm({...form, discount_price_usd: parseFloat(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                    placeholder="اختياري"
                  />
                  {form.discount_price_usd > 0 && <p className="text-xs text-gray-500 mt-1">يساوي: {formatCurrency(Math.round((form.discount_price_usd || 0) * exchangeRate))}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">أقل كمية للطلب (MOQ)</label>
                  <input 
                    type="number" required min="1"
                    value={form.moq || ''} 
                    onChange={e => setForm({...form, moq: parseInt(e.target.value) || 0})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة المنتج (رابط أو رفع ملف)</label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer border-2 border-dashed border-gray-300 hover:border-[#4f46e5] transition-colors rounded-xl p-3 text-center bg-gray-50">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Upload size={18} />
                        <span>{imageFile ? imageFile.name : 'اختر صورة من جهازك'}</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)}
                      />
                    </label>
                    {imageFile && (
                      <button type="button" onClick={() => setImageFile(null)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl">
                        <X size={20} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">أو</span>
                  </div>
                  <input 
                    type="url"
                    value={form.image_url} 
                    onChange={e => setForm({...form, image_url: e.target.value})}
                    disabled={!!imageFile}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-gray-50 disabled:opacity-50"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
