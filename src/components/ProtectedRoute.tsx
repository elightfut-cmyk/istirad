import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] dark:bg-[#121212] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === 'banned') {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-neutral-800 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">الحساب محظور</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            تم إيقاف هذا الحساب من قِبل إدارة المنصة لمخالفة شروط الاستخدام. يُرجى مراجعة إدارة منصة جيبها للمزيد من التفاصيل.
          </p>
          <button
            onClick={async () => {
              const { supabase } = await import('../lib/supabase');
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-600/30"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}
