import { ReactNode, useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useThemeStore } from '../store/useThemeStore';
import { useLanguageStore } from '../store/useLanguageStore';

import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, UserCircle, DollarSign, Bell, Trash2, Sun, Moon, Vote, Smartphone } from 'lucide-react';
import WhatsAppButton from '../components/WhatsAppButton';
import DashboardAlertModal from '../components/DashboardAlertModal';
import SocialLinksModal from '../components/SocialLinksModal';
import UserPollModal from '../components/UserPollModal';
import NotificationDiagnosticsModal from '../components/NotificationDiagnosticsModal';
import { pollService } from '../services/pollService';
import { isNativePlatform } from '../lib/onesignal';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  sidebarLinks: { label: string; href: string; icon: ReactNode }[];
}

export default function DashboardLayout({ children, title, sidebarLinks }: DashboardLayoutProps) {
  const { user, logout } = useAuthStore();
  const { currency, toggleCurrency, adTitle, adSubtitle, adImageUrl, adLinkUrl } = useSettingsStore();
  const { notifications, unreadCount, fetchNotifications, subscribeToNotifications, markAsRead, deleteNotification } = useNotificationStore();
  const { theme, toggleTheme } = useThemeStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isNative, setIsNative] = useState(() => isNativePlatform());

  useEffect(() => {
    setIsNative(isNativePlatform());
  }, []);

  // Modals sequence state (First Alert -> 10s delay -> Social Links)
  const [canShowSocialLinks, setCanShowSocialLinks] = useState(false);
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [hasActivePoll, setHasActivePoll] = useState(false);
  const socialTimerRef = useRef<any>(null);

  // Check if active poll exists for topbar indicator
  useEffect(() => {
    if (user && (user.role === 'merchant' || user.role === 'supplier')) {
      pollService.getPoll().then((p) => {
        if (p && p.isActive && (p.targetRole === 'all' || p.targetRole === user.role)) {
          setHasActivePoll(true);
        }
      });
    }
  }, [user]);

  // Start 10-second countdown for social links modal
  const handleStartSocialCountdown = () => {
    if (socialTimerRef.current) clearTimeout(socialTimerRef.current);
    socialTimerRef.current = setTimeout(() => {
      setCanShowSocialLinks(true);
    }, 10000); // exactly 10s after first alert
  };

  useEffect(() => {
    return () => {
      if (socialTimerRef.current) clearTimeout(socialTimerRef.current);
    };
  }, []);

  const translateLabel = (text: string) => text;

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      const unsubscribe = subscribeToNotifications(user.id);
      return () => {
        unsubscribe();
      };
    }
  }, [user?.id]);

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
    <div className="flex h-screen bg-[#f5f5f0] dark:bg-[#121212] transition-colors">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col hidden md:flex transition-colors">
        <div className="p-5 text-center border-b border-gray-100 dark:border-gray-700">
          <Link to="/" className="inline-block hover:opacity-85 transition-opacity py-1">
            <img src="/header-logo.png" alt="JIIBHA" className="h-8 mx-auto object-contain dark:brightness-125 dark:drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]" />
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium bg-gray-50 dark:bg-gray-750 py-1 px-3 rounded-full inline-block border border-gray-100 dark:border-gray-700">
            {user?.role === 'admin' ? t('role.admin') : user?.role === 'merchant' ? t('role.merchant') : t('role.supplier')}
          </p>
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-[#4f46e5] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {link.icon}
                <span className="font-medium">{translateLabel(link.label)}</span>
              </a>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-6 transition-colors">
          <div className="flex items-center md:hidden">
            <Link to="/" className="mr-3 hover:opacity-85 transition-opacity">
              <img src="/header-logo.png" alt="JIIBHA" className="h-6 sm:h-7 object-contain dark:brightness-125 dark:drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]" />
            </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden md:block">{translateLabel(title)}</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            {!isNative && (
              <a
                href="/jiibha-app.apk"
                download="jiibha-app.apk"
                className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1.5 rounded-lg transition-all text-xs border border-emerald-200/80 dark:border-emerald-800 shadow-xs whitespace-nowrap shrink-0"
                title="تحميل تطبيق جيبها للأندرويد"
              >
                <Smartphone size={15} />
                <span>حمل التطبيق</span>
              </a>
            )}
            {user && (user.role === 'merchant' || user.role === 'supplier') && hasActivePoll && (
              <button
                onClick={() => setIsPollOpen(true)}
                className="relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 hover:from-indigo-100 hover:to-purple-100 text-[#4f46e5] dark:text-indigo-300 font-bold px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs sm:text-sm border border-indigo-200/80 dark:border-indigo-800 shadow-xs"
                title={t('nav.poll_title')}
              >
                <Vote size={16} className="text-[#4f46e5] dark:text-indigo-400" />
                <span className="hidden sm:inline">{t('nav.poll')}</span>
                <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-ping"></span>
              </button>
            )}



            <button
              onClick={toggleTheme}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-yellow-400 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base border border-gray-200/60 dark:border-gray-600 shadow-xs"
              title={t('nav.theme_toggle')}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            <button
              onClick={toggleCurrency}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-[#4f46e5] dark:text-indigo-400 font-bold px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base border border-gray-200/60 dark:border-gray-600 shadow-xs"
              title={t('nav.currency_toggle')}
            >
              <DollarSign size={16} />
              <span>{currency === 'USD' ? 'USD' : 'DZD'}</span>
            </button>
            
            <Link to="/profile" className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity" title={t('nav.profile')}>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:inline">{user?.name}</span>
              <UserCircle size={28} className="text-gray-400 dark:text-gray-500 hover:text-[#4f46e5] dark:hover:text-indigo-400 transition-colors" />
            </Link>

            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen && unreadCount > 0) {
                    markAsRead();
                  }
                }}
                className={`relative p-2 rounded-full transition-colors ${unreadCount > 0 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                title={t('nav.notifications')}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-50 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 dark:text-white">{t('nav.notifications')}</h3>
                    {isNative && (
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          setShowDiagnosticsModal(true);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-200/50 dark:border-indigo-800 transition"
                        title="فحص وصول إشعارات الهاتف وتجربتها فوراً"
                      >
                        <Smartphone size={13} />
                        <span>فحص الإشعارات</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        {t('nav.no_notifications')}
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative group ${notif.is_read ? 'opacity-70' : 'bg-blue-50/30 dark:bg-indigo-900/20'}`}>
                          <div className="pr-6">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-1">{notif.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-gray-400 mt-2 block">{new Date(notif.created_at).toLocaleString('en-GB')}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="absolute top-4 left-4 z-10 text-red-500 hover:text-red-700 transition-opacity bg-red-50 dark:bg-red-900/30 p-1 rounded-md"
                            title={t('nav.delete_notification')}
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
                  <a href={adLinkUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white dark:bg-gray-800 text-blue-700 rounded-xl font-bold shadow-sm hover:bg-gray-50 dark:bg-gray-900 transition-colors whitespace-nowrap text-sm mt-4 md:mt-0">
                    {t('landing.ad_more')}
                  </a>
                )}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white dark:bg-gray-800 opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] border-t border-gray-100 dark:border-gray-700 z-50 transition-colors">
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
                  isActive ? 'text-[#4f46e5] dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#4f46e5] dark:bg-indigo-400 rounded-b-full"></div>
                )}
                <div className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                  {link.icon}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap">{translateLabel(link.label)}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex-1 min-w-[70px] flex flex-col items-center justify-center py-3 px-1 transition-colors relative text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
          >
            <div className="mb-1 transition-transform duration-200">
              <LogOut size={20} />
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap">{t('nav.logout')}</span>
          </button>
        </div>
      </nav>
      <WhatsAppButton />
      <DashboardAlertModal 
        onAlertOpened={() => {
          if (socialTimerRef.current) clearTimeout(socialTimerRef.current);
          setCanShowSocialLinks(false);
        }}
        onAlertClosed={handleStartSocialCountdown}
        onAlertNotShown={handleStartSocialCountdown}
      />
      <SocialLinksModal canShow={canShowSocialLinks} />
      <UserPollModal 
        isOpenControlled={isPollOpen} 
        onCloseControlled={() => setIsPollOpen(false)} 
      />
      {isNative && (
        <NotificationDiagnosticsModal
          isOpen={showDiagnosticsModal}
          onClose={() => setShowDiagnosticsModal(false)}
        />
      )}
    </div>
  );
}
