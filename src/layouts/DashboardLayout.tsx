import { ReactNode, useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, UserCircle, DollarSign, Bell, Trash2, Package } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  sidebarLinks: { label: string; href: string; icon: ReactNode }[];
}

export default function DashboardLayout({ children, title, sidebarLinks }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const { currency, toggleCurrency, adTitle, adSubtitle, adImageUrl, adLinkUrl } = useSettingsStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, deleteNotification } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
    }
  }, [user]);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#f5f5f0]">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col hidden md:flex">
        <div className="p-6 text-center border-b border-gray-100">
          <Link to="/" className="text-2xl font-bold text-[#065f46] hover:opacity-80 transition-opacity inline-block">إستيراد</Link>
          <p className="text-sm text-gray-500 mt-1">{user?.role === 'admin' ? 'الإدارة' : user?.role === 'merchant' ? 'تاجر' : 'مورد'}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(link.href);
                }}
                className={`flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-[#065f46] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.icon}
                <span className="font-medium">{link.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 space-x-reverse px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
          <div className="flex items-center md:hidden">
            <Link to="/" className="text-[#065f46] mr-4 hover:opacity-80 transition-opacity">
              <Package size={28} />
            </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-800 hidden md:block">{title}</h1>
          <div className="flex items-center gap-3 sm:gap-4">

            <button
              onClick={toggleCurrency}
              className="bg-gray-100 hover:bg-gray-200 text-[#065f46] font-bold px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              title="تغيير العملة (دولار / دينار)"
            >
              <DollarSign size={16} />
              <span>{currency === 'USD' ? 'USD' : 'DZD'}</span>
            </button>
            
            <Link to="/profile" className="hidden md:flex items-center space-x-2 space-x-reverse hover:opacity-80 transition-opacity" title="الملف الشخصي">
              <span className="text-sm font-medium text-gray-700 hidden md:inline">{user?.name}</span>
              <UserCircle size={28} className="text-gray-400 hover:text-[#065f46] transition-colors" />
            </Link>


            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen && unreadCount > 0) {
                    markAsRead();
                  }
                }}
                className={`relative p-2 rounded-full transition-colors ${unreadCount > 0 ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                title="التنبيهات"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">التنبيهات</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        لا توجد تنبيهات حالياً
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors relative group ${notif.is_read ? 'opacity-70' : 'bg-blue-50/30'}`}>
                          <div className="pr-6">
                            <h4 className="text-sm font-bold text-gray-800 mb-1">{notif.title}</h4>
                            <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-gray-400 mt-2 block">{new Date(notif.created_at).toLocaleString('ar-SA')}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition-opacity"
                            title="حذف التنبيه"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6 pb-24 md:pb-6">
          {user?.role !== 'admin' && adTitle && (
            <div className="mb-6 bg-gradient-to-l from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                {adImageUrl && (
                  <img src={adImageUrl} alt="Ad" className="w-24 h-24 object-cover rounded-xl shadow-md border-2 border-white/20" />
                )}
                <div className="flex-1 text-center md:text-right">
                  <h3 className="text-2xl font-bold mb-2">{adTitle}</h3>
                  {adSubtitle && <p className="text-blue-100 opacity-90 mb-0">{adSubtitle}</p>}
                </div>
                {adLinkUrl && (
                  <a href={adLinkUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-blue-700 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors whitespace-nowrap text-sm mt-4 md:mt-0">
                    اضغط هنا للمزيد
                  </a>
                )}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] border-t border-gray-100 z-50">
        <div className="flex w-full overflow-x-auto">
          {(() => {
            const links = [...sidebarLinks];
            if (links.length > 0) {
              links.splice(1, 0, { label: 'حسابي', href: '/profile', icon: <UserCircle size={20} /> } as any);
            }
            return links;
          })().map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex-1 min-w-[70px] flex flex-col items-center justify-center py-3 px-1 transition-colors relative ${
                  isActive ? 'text-[#065f46]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#065f46] rounded-b-full"></div>
                )}
                <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                  {link.icon}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex-1 min-w-[70px] flex flex-col items-center justify-center py-3 px-1 transition-colors relative text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <div className="mb-1 transition-transform duration-200">
              <LogOut size={20} />
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap">خروج</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
