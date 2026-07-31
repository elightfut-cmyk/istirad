import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, Users, ShoppingBag, MessageSquare, Ticket, FileText, HelpCircle, AlertTriangle, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  is_active: boolean;
}

export default function AdminPages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    is_active: true
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('حدث خطأ أثناء جلب الصفحات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (page?: Page) => {
    if (page) {
      setEditingId(page.id);
      setFormData({
        title: page.title,
        slug: page.slug,
        content: page.content,
        is_active: page.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        slug: '',
        content: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('pages')
          .update(formData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('تم التعديل بنجاح');
      } else {
        const { error } = await supabase
          .from('pages')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('تمت الإضافة بنجاح');
      }
      
      handleCloseModal();
      fetchPages();
    } catch (error: any) {
      console.error('Error saving page:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الصفحة؟')) return;
    
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('تم الحذف بنجاح');
      fetchPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      toast.success(currentStatus ? 'تم التعطيل' : 'تم التفعيل');
      fetchPages();
    } catch (error) {
      console.error('Error toggling page status:', error);
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  return (
    <DashboardLayout
      title="إدارة الصفحات الثابتة (الفوتر)"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'الصفحات', href: '/admin/pages', icon: <FileText size={20} /> },
        { label: 'الأسئلة الشائعة', href: '/admin/faqs', icon: <HelpCircle size={20} /> },
        { label: 'الشكاوى', href: '/admin/complaints', icon: <AlertTriangle size={20} /> },
      ]}
    >
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">قائمة الصفحات</h2>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#4f46e5] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#4338ca] transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة صفحة جديدة
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-bold text-gray-700">العنوان</th>
                  <th className="p-4 font-bold text-gray-700">الرابط (Slug)</th>
                  <th className="p-4 font-bold text-gray-700">الحالة</th>
                  <th className="p-4 font-bold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-4 font-medium text-gray-900">{page.title}</td>
                    <td className="p-4 text-gray-500" dir="ltr">{page.slug}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(page.id, page.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          page.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {page.is_active ? 'مفعل' : 'معطل'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(page)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      لا توجد صفحات حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'تعديل الصفحة' : 'إضافة صفحة جديدة'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors"
                  placeholder="مثال: سياسة الخصوصية"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">الرابط (Slug)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors"
                  placeholder="مثال: privacy-policy"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">يجب أن يكون باللغة الإنجليزية وبدون مسافات.</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">المحتوى (HTML)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full h-48 px-4 py-2 rounded-xl border border-gray-200 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors"
                  placeholder="<h1>عنوان</h1><p>نص...</p>"
                  dir="ltr"
                />
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#4f46e5] rounded focus:ring-[#4f46e5]"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700">تفعيل الصفحة (تظهر في الفوتر)</label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-xl font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] transition-colors flex items-center gap-2"
              >
                <Check size={20} />
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
