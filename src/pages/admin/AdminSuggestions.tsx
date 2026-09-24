import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  LayoutDashboard, Users, ShoppingBag, MessageSquare, Ticket, FileText, 
  HelpCircle, AlertTriangle, Plus, Edit2, Trash2, Check, X, Package, Lightbulb
, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Suggestion {
  id: string;
  admin_id: string;
  content: string;
  category: string;
  created_at: string;
  admin?: { name: string };
}

export default function AdminSuggestions() {
  const { user } = useAuthStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    content: '',
    category: 'مهم وعاجل'
  });

  const categories = [
    'مهم وعاجل',
    'مهم وغير عاجل',
    'غير مهم وعاجل',
    'غير مهم وغير عاجل'
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'مهم وعاجل': return 'bg-red-100 text-red-800';
      case 'مهم وغير عاجل': return 'bg-orange-100 text-orange-800';
      case 'غير مهم وعاجل': return 'bg-yellow-100 text-yellow-800';
      case 'غير مهم وغير عاجل': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_suggestions')
        .select(`
          *,
          admin:users!admin_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setSuggestions(data as any);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('حدث خطأ أثناء جلب الاقتراحات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (suggestion?: Suggestion) => {
    if (suggestion) {
      setEditingId(suggestion.id);
      setFormData({
        content: suggestion.content,
        category: suggestion.category
      });
    } else {
      setEditingId(null);
      setFormData({
        content: '',
        category: 'مهم وعاجل'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.content) {
      toast.error('يرجى تعبئة نص الاقتراح');
      return;
    }
    if (!user) return;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('admin_suggestions')
          .update({
            content: formData.content,
            category: formData.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('تم تعديل الاقتراح بنجاح');
      } else {
        const { error } = await supabase
          .from('admin_suggestions')
          .insert([{
            admin_id: user.id,
            content: formData.content,
            category: formData.category
          }]);
        
        if (error) throw error;
        toast.success('تمت إضافة الاقتراح بنجاح');
      }
      
      handleCloseModal();
      fetchSuggestions();
    } catch (error: any) {
      console.error('Error saving suggestion:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاقتراح؟')) return;
    
    try {
      const { error } = await supabase
        .from('admin_suggestions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      toast.success('تم حذف الاقتراح بنجاح');
      fetchSuggestions();
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  return (
    <DashboardLayout
      title="اقتراحات الإدارة"
      sidebarLinks={[
        { label: 'الرئيسية', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'المستخدمين', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'الطلبات العامة', href: '/admin/orders', icon: <ShoppingBag size={20} /> },
        { label: 'سوق الطلبات', href: '/admin/requests', icon: <Package size={20} /> },
        { label: 'الكوبونات', href: '/admin/coupons', icon: <Ticket size={20} /> },
        { label: 'الإشعارات (تلغرام)', href: '/admin/notifications', icon: <MessageSquare size={20} /> },
        { label: 'الصفحات', href: '/admin/pages', icon: <FileText size={20} /> },
        { label: 'الأسئلة الشائعة', href: '/admin/faqs', icon: <HelpCircle size={20} /> },
        { label: 'الشكاوى', href: '/admin/complaints', icon: <AlertTriangle size={20} /> },
        { label: 'الاقتراحات', href: '/admin/suggestions', icon: <Lightbulb size={20} /> },
        { label: 'الاستيراد الذكي', href: '/admin/smart-import', icon: <Search size={20} /> },
        { label: 'بحث علي بابا', href: '/admin/alibaba-search', icon: <Search size={20} /> },
      ]}
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">اقتراحات الإدارة (مصفوفة أيزنهاور)</h2>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#4f46e5] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#4338ca] transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة اقتراح جديد
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {categories.map(cat => (
              <div key={cat} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900">
                <h3 className={`font-bold mb-4 inline-block px-3 py-1 rounded-md text-sm ${getCategoryColor(cat)}`}>
                  {cat}
                </h3>
                <div className="space-y-3">
                  {suggestions.filter(s => s.category === cat).map((suggestion) => (
                    <div key={suggestion.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          كتب بواسطة: {suggestion.admin?.name || 'مجهول'}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(suggestion)}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(suggestion.id)}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap text-sm">{suggestion.content}</p>
                      <div className="text-xs text-gray-400 mt-2 text-left">
                        {new Date(suggestion.created_at).toLocaleDateString('ar-DZ')}
                      </div>
                    </div>
                  ))}
                  {suggestions.filter(s => s.category === cat).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">لا توجد اقتراحات في هذا التصنيف</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                {editingId ? 'تعديل الاقتراح' : 'إضافة اقتراح جديد'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">التصنيف (مصفوفة أيزنهاور)</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none bg-gray-50 dark:bg-gray-900"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">نص الاقتراح</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent outline-none h-32 bg-gray-50 dark:bg-gray-900 resize-none"
                    placeholder="اكتب تفاصيل الاقتراح هنا..."
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="bg-[#4f46e5] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#4338ca] transition-colors flex items-center gap-2"
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
