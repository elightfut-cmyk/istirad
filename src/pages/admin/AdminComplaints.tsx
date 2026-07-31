import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, Users, ShoppingBag, MessageSquare, Ticket, FileText, HelpCircle, AlertTriangle, Eye, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Complaint {
  id: string;
  merchant_id: string;
  complaint_type: string;
  message: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  users: {
    name: string;
    company_name: string;
    phone: string;
  };
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          users!merchant_id (name, company_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setComplaints(data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast.error('حدث خطأ أثناء جلب الشكاوى');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      toast.success('تم تحديث حالة الشكوى بنجاح');
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">قيد الانتظار</span>;
      case 'resolved':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">محلولة</span>;
      case 'dismissed':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">مرفوضة</span>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      title="إدارة الشكاوى"
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
        <h2 className="text-xl font-bold text-gray-800 mb-6">قائمة الشكاوى الواردة</h2>

        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-bold text-gray-700">تاريخ الشكوى</th>
                  <th className="p-4 font-bold text-gray-700">التاجر (الشركة)</th>
                  <th className="p-4 font-bold text-gray-700">نوع الشكوى</th>
                  <th className="p-4 font-bold text-gray-700">الحالة</th>
                  <th className="p-4 font-bold text-gray-700">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-4 text-gray-600" dir="ltr">
                      {new Date(complaint.created_at).toLocaleString('ar-DZ')}
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      {complaint.users?.name} <br/>
                      <span className="text-sm text-gray-500">{complaint.users?.company_name}</span>
                    </td>
                    <td className="p-4 text-gray-600">{complaint.complaint_type}</td>
                    <td className="p-4">
                      {getStatusBadge(complaint.status)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedComplaint(complaint)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {complaints.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      لا توجد شكاوى حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for viewing complaint details */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" />
                تفاصيل الشكوى
              </h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-sm text-gray-500 mb-1">التاجر</p>
                  <p className="font-bold text-gray-900">{selectedComplaint.users?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">رقم الهاتف</p>
                  <p className="font-bold text-gray-900" dir="ltr">{selectedComplaint.users?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">نوع الشكوى</p>
                  <p className="font-bold text-gray-900">{selectedComplaint.complaint_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">تاريخ الشكوى</p>
                  <p className="font-bold text-gray-900" dir="ltr">{new Date(selectedComplaint.created_at).toLocaleString('ar-DZ')}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-2">نص الرسالة/الشكوى:</p>
                <div className="bg-white p-4 rounded-xl border border-gray-200 text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {selectedComplaint.message}
                </div>
              </div>
              
              {selectedComplaint.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'dismissed')}
                    className="px-6 py-2 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <XCircle size={18} />
                    رفض / إغلاق
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'resolved')}
                    className="px-6 py-2 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    تحديد كمحلولة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
