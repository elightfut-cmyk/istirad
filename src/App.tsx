import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useThemeStore } from './store/useThemeStore';
import LandingPage from './pages/public/LandingPage';
import PageViewer from './pages/public/PageViewer';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import { supabase } from './lib/supabase';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminOrders from './pages/admin/AdminOrders';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminPages from './pages/admin/AdminPages';
import AdminFaqs from './pages/admin/AdminFaqs';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminSuggestions from './pages/admin/AdminSuggestions';
import AdminMainVideo from './pages/admin/AdminMainVideo';
import MerchantDashboard from './pages/merchant/MerchantDashboard';
import Marketplace from './pages/merchant/Marketplace';
import MerchantOrders from './pages/merchant/MerchantOrders';
import MerchantWallet from './pages/merchant/MerchantWallet';
import MerchantReferrals from './pages/merchant/MerchantReferrals';
import MerchantWishlist from './pages/merchant/MerchantWishlist';
import MerchantComplaints from './pages/merchant/MerchantComplaints';
import SupplierDashboard from './pages/supplier/SupplierDashboard';
import SupplierRequests from './pages/supplier/SupplierRequests';
import SupplierProducts from './pages/supplier/SupplierProducts';
import SupplierOrders from './pages/supplier/SupplierOrders';
import SupplierFinancials from './pages/supplier/SupplierFinancials';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/profile/Profile';
import toast, { Toaster } from 'react-hot-toast';
import FacebookPixel from './components/FacebookPixel';
import AppSplashScreen from './components/AppSplashScreen';
import AppVersionModal from './components/AppVersionModal';
import { useNotificationStore } from './store/useNotificationStore';
import { usePushNotifications } from './hooks/usePushNotifications';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import SupplierPublicProfile from './pages/supplier/SupplierPublicProfile';
import { loginOneSignalUser } from './lib/onesignal';

function App() {
  // 1. Root-Level Custom Hook: Unconditional OneSignal setup & reactive identity binding
  usePushNotifications();

  const { user, checkSession } = useAuthStore();

  // 2. Strict Session-Switching Protocol for OneSignal (Ghost State Prevention)
  useEffect(() => {
    if (user?.id) {
      loginOneSignalUser(user.id, user.role || undefined);
    }
  }, [user?.id, user?.role]);
  const { fetchNotifications, subscribeToNotifications } = useNotificationStore();
  const { fetchSettings } = useSettingsStore();
  const { theme } = useThemeStore();
  // Show splash on native mobile application OR mobile web browser viewport
  const [showSplash, setShowSplash] = useState(() => {
    if (Capacitor.isNativePlatform()) return true;
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth <= 768;
    const hasSeen = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('jiibha_splash_seen');
    return Boolean(isMobileViewport && !hasSeen);
  });

  // Global notification listener: Ensure every notification entering the bell alerts the user immediately across any page
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      const unsub = subscribeToNotifications(user.id);

      return () => {
        unsub();
      };
    }
  }, [user?.id, fetchNotifications, subscribeToNotifications]);

  // Zero-Background Polling: Halt Supabase Realtime in background, resume when foregrounded
  useEffect(() => {
    let listenerHandle: any = null;

    try {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        console.log('📱 App State Changed - isActive:', isActive);
        if (!isActive) {
          // Immediately unsubscribe from Supabase Realtime to save quota
          useNotificationStore.getState().pauseRealtime();
        } else {
          // Resume Realtime only when app returns to foreground
          useNotificationStore.getState().resumeRealtime();
          // Silently re-validate/refresh session tokens without interrupting user
          useAuthStore.getState().checkSession();
        }
      }).then(handle => {
        listenerHandle = handle;
      }).catch(err => {
        console.warn('Capacitor App state listener error:', err);
      });
    } catch (e) {
      console.warn('Capacitor App not available in web context:', e);
    }

    // Web visibility change fallback
    const handleVisibilityChange = () => {
      if (document.hidden) {
        useNotificationStore.getState().pauseRealtime();
      } else {
        useNotificationStore.getState().resumeRealtime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (listenerHandle?.remove) {
        listenerHandle.remove();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Safety fallback: Ensure splash/loading screen dismisses even on slow mobile networks
    const fallbackTimer = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
    }, 4000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    checkSession();
    fetchSettings();
  }, [checkSession, fetchSettings]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  useEffect(() => {
    // If URL has otp_expired or access_denied hash from email change link
    if (window.location.hash && (window.location.hash.includes('otp_expired') || window.location.hash.includes('error_code='))) {
      toast.error('رابط التأكيد منتهي الصلاحية أو تم استهلاكه. يُرجى إلغاء تفعيل "Confirm email change" في Supabase لتحديث البريد فوراً بدون روابط.');
      window.history.replaceState(null, '', window.location.pathname);
    }

    // If user enters with recovery hash and isn't on reset-password
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      if (window.location.pathname !== '/reset-password') {
        window.location.href = `/reset-password${window.location.hash}`;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (window.location.pathname !== '/reset-password') {
          window.location.href = `/reset-password${window.location.hash}`;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      {/* Non-blocking splash overlay: allows App tree & OneSignal to mount and register in parallel */}
      {showSplash && (
        <AppSplashScreen 
          minDurationMs={2600} 
          onFinish={() => {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('jiibha_splash_seen', '1');
            }
            setShowSplash(false);
          }} 
        />
      )}
      <FacebookPixel />
      <AppVersionModal />
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontFamily: 'Tajawal', padding: '16px', borderRadius: '12px' } }} />
      <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-['Tajawal'] dark:bg-[#121212] dark:text-gray-100 transition-colors">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/page/:slug" element={<PageViewer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['admin', 'merchant', 'supplier']}>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/coupons" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCoupons />
            </ProtectedRoute>
          } />

          <Route path="/admin/orders" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOrders />
            </ProtectedRoute>
          } />
          
          {/* Redirect old requests route to unified admin orders & tenders page */}
          <Route path="/admin/requests" element={<Navigate to="/admin/orders" replace />} />
          
          <Route path="/admin/notifications" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminNotifications />
            </ProtectedRoute>
          } />

          <Route path="/admin/pages" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPages />
            </ProtectedRoute>
          } />

          <Route path="/admin/faqs" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminFaqs />
            </ProtectedRoute>
          } />

          <Route path="/admin/complaints" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminComplaints />
            </ProtectedRoute>
          } />

          <Route path="/admin/suggestions" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSuggestions />
            </ProtectedRoute>
          } />

          <Route path="/admin/main-video" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMainVideo />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant/marketplace" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <Marketplace />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant/orders" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantOrders />
            </ProtectedRoute>
          } />

          <Route path="/merchant/wallet" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantWallet />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant/referrals" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantReferrals />
            </ProtectedRoute>
          } />

          
          <Route path="/merchant/wishlist" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantWishlist />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant/complaints" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantComplaints />
            </ProtectedRoute>
          } />
          
          <Route path="/supplier" element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierDashboard />
            </ProtectedRoute>
          } />

          <Route path="/supplier/products" element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierProducts />
            </ProtectedRoute>
          } />

          <Route path="/supplier/orders" element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierOrders />
            </ProtectedRoute>
          } />

          <Route path="/supplier/financials" element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierFinancials />
            </ProtectedRoute>
          } />

          <Route path="/supplier/requests" element={
            <ProtectedRoute allowedRoles={['supplier']}>
              <SupplierRequests />
            </ProtectedRoute>
          } />

          <Route path="/supplier/profile" element={<SupplierPublicProfile />} />
          <Route path="/supplier/profile/:supplierId" element={<SupplierPublicProfile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
