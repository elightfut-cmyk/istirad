import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShoppingBag, MessageSquare, Ticket, Search, Plus, Edit, Trash2, CheckCircle, Ban } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  const [formData, setFormData] = useState({
    code: '',
    discount_percentage: 0,
    advertiser_name: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || formData.discount_percentage <= 0) {
      alert('الرجاء إدخال الكود ونسبة الخصم بشكل صحيح');
      return;
    }

    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update({
            code: formData.code.toUpperCase(),
            discount_percentage: formData.discount_percentage,
            advertiser_name: formData.advertiser_name,
          })
          .eq('id', editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert({
            code: formData.code.toUpperCase(),
            discount_percentage: formData.discount_percentage,
            advertiser_name: formData.advertiser_name,
          });
        if (error) throw error;
      }

      setShowModal(false);
      setEditingCoupon(null);
      setFormData({ code: '', discount_percentage: 0, advertiser_name: '' });
      fetchCoupons();
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      alert(error.message.includes('unique') ? 'هذا الكود موجود مسبقاً' : 'حدث خطأ أثناء حفظ الكوبون');
    }
  };

  const handleToggleStatus = async (coupon: any) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);
      
      if (error) throw error;
      fetchCoupons();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('حدث خطأ أثناء تغيير الحالة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('لا يمكن حذف كوبون تم استخدامه من قبل');
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.advertiser_name && c.advertiser_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout
      title="إدارة الكوبونات والإشهار"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
      ]}
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="ابحث بالكود أو اسم المشهر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          <button
            onClick={() => {
              setEditingCoupon(null);
              setFormData({ code: '', discount_percentage: 0, advertiser_name: '' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-[#4f46e5] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#4338ca] transition"
          >
            <Plus size={20} />
            كوبون جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="p-4 font-bold text-gray-700">الكود</th>
                <th className="p-4 font-bold text-gray-700">المشهر / المسوق</th>
                <th className="p-4 font-bold text-gray-700">الخصم (من العمولة)</th>
                <th className="p-4 font-bold text-gray-700">مرات الاستخدام</th>
                <th className="p-4 font-bold text-gray-700">الحالة</th>
                <th className="p-4 font-bold text-gray-700 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">لا توجد كوبونات</td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-[#4f46e5] bg-indigo-50 px-3 py-1 rounded-lg tracking-wider">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700">{coupon.advertiser_name || '-'}</td>
                    <td className="p-4 font-bold text-green-600">{coupon.discount_percentage}%</td>
                    <td className="p-4 font-bold text-gray-700">{coupon.usage_count} مرات</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        coupon.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {coupon.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className={`p-2 rounded-xl transition-colors ${
                            coupon.is_active ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={coupon.is_active ? 'تعطيل' : 'تفعيل'}
                        >
                          {coupon.is_active ? <Ban size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingCoupon(coupon);
                            setFormData({
                              code: coupon.code,
                              discount_percentage: coupon.discount_percentage,
                              advertiser_name: coupon.advertiser_name || ''
                            });
                            setShowModal(true);
                          }}
                          className="p-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingCoupon ? 'تعديل الكوبون' : 'إضافة كوبون جديد'}</h2>
            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كود الكوبون</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:outline-none uppercase"
                  placeholder="مثال: JIIBHA2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم (من عمولة المنصة) %</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={e => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المشهر / المسوق (اختياري)</label>
                <input
                  type="text"
                  value={formData.advertiser_name}
                  onChange={e => setFormData({ ...formData, advertiser_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-[#4f46e5] focus:outline-none"
                  placeholder="مثال: أحمد للتسويق"
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-[#4f46e5] text-white py-3 rounded-xl font-bold hover:bg-[#4338ca] transition">
                  حفظ
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
