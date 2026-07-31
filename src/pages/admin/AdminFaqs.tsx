import { useState, useEffect } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { supabase } from '../../../lib/supabase';
import { LayoutDashboard, Users, ShoppingBag, Settings, MessageSquare, Ticket, FileText, HelpCircle, AlertTriangle, Plus, Edit2, Trash2, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
}

export default function AdminFaqs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setFaqs(data);
    } catch (error) {
      console.error('Error fetching faqs:', error);
      toast.error('حدث خطأ أثناء جلب الأسئلة الشائعة');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (faq?: FAQ) => {
    if (faq) {
      setEditingId(faq.id);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        display_order: faq.display_order,
        is_active: faq.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        question: '',
        answer: '',
        display_order: faqs.length > 0 ? Math.max(...faqs.map(f => f.display_order)) + 1 : 0,
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
    if (!formData.question || !formData.answer) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('faqs')
          .update(formData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('تم التعديل بنجاح');
      } else {
        const { error } = await supabase
          .from('faqs')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('تمت الإضافة بنجاح');
      }
      
      handleCloseModal();
      fetchFaqs();
    } catch (error: any) {
      console.error('Error saving faq:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    
    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('تم الحذف بنجاح');
      fetchFaqs();
    } catch (error) {
      console.error('Error deleting faq:', error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      toast.success(currentStatus ? 'تم التعطيل' : 'تم التفعيل');
      fetchFaqs();
    } catch (error) {
      console.error('Error toggling faq status:', error);
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === faqs.length - 1)) return;
    
    const newFaqs = [...faqs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap display_order
    const currentOrder = newFaqs[index].display_order;
    newFaqs[index].display_order = newFaqs[targetIndex].display_order;
    newFaqs[targetIndex].display_order = currentOrder;
    
    // Swap array position
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[targetIndex];
    newFaqs[targetIndex] = temp;
    
    setFaqs(newFaqs);
    
    // Save to DB
    try {
      await Promise.all([
        supabase.from('faqs').update({ display_order: newFaqs[index].display_order }).eq('id', newFaqs[index].id),
        supabase.from('faqs').update({ display_order: newFaqs[targetIndex].display_order }).eq('id', newFaqs[targetIndex].id)
      ]);
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  return (
    <DashboardLayout
      title="إدارة الأسئلة الشائعة"
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
          <h2 className="text-xl font-bold text-gray-800">قائمة الأسئلة الشائعة</h2>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#4f46e5] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#4338ca] transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة سؤال جديد
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-bold text-gray-700 w-16">الترتيب</th>
                  <th className="p-4 font-bold text-gray-700">السؤال</th>
                  <th className="p-4 font-bold text-gray-700 w-24">الحالة</th>
                  <th className="p-4 font-bold text-gray-700 w-32">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((faq, index) => (
                  <tr key={faq.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <button 
                          onClick={() => moveOrder(index, 'up')}
                          disabled={index === 0}
                          className="hover:text-[#4f46e5] disabled:opacity-30"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <span className="text-sm font-bold text-gray-700">{faq.display_order}</span>
                        <button 
                          onClick={() => moveOrder(index, 'down')}
                          disabled={index === faqs.length - 1}
                          className="hover:text-[#4f46e5] disabled:opacity-30"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-900">{faq.question}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(faq.id, faq.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          faq.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {faq.is_active ? 'مفعل' : 'معطل'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(faq)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {faqs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      لا توجد أسئلة شائعة حالياً
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
                {editingId ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">السؤال</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors"
                  placeholder="مثال: كيف أطلب منتج؟"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">الإجابة (يدعم HTML)</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full h-48 px-4 py-2 rounded-xl border border-gray-200 focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition-colors"
                  placeholder="<p>للطلب، اتبع الخطوات التالية...</p>"
                  dir="rtl"
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
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700">تفعيل السؤال (يظهر في الرئيسية)</label>
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
