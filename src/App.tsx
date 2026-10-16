import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import AdminRequests from './pages/admin/AdminRequests';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminPages from './pages/admin/AdminPages';
import AdminFaqs from './pages/admin/AdminFaqs';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminSuggestions from './pages/admin/AdminSuggestions';
import AdminSmartImport from './pages/admin/AdminSmartImport';
import AdminAlibabaSearch from './pages/admin/AdminAlibabaSearch';
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
import { initOneSignal } from './lib/onesignal';
import AppSplashScreen from './components/AppSplashScreen';
import ForceUpdateModal from './components/ForceUpdateModal';

function App() {
  const { checkSession, isLoading } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    // OneSignal Native Push Initialization for Android (slight delay to let React finish initial paint)
    const initTimer = setTimeout(() => {
      initOneSignal();
    }, 600);

    // Safety fallback: Ensure splash/loading screen dismisses even on slow mobile networks
    const fallbackTimer = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
    }, 1500);

    return () => {
      clearTimeout(initTimer);
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

  if (isLoading) {
    return <AppSplashScreen minDurationMs={1200} />;
  }

  return (
    <Router>
      <FacebookPixel />
      <ForceUpdateModal />
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

          <Route path="/admin/requests" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminRequests />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/orders" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOrders />
            </ProtectedRoute>
          } />
          
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

          <Route path="/admin/smart-import" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminSmartImport />
            </ProtectedRoute>
          } />

          <Route path="/admin/alibaba-search" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAlibabaSearch />
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
