import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';
import LandingPage from './pages/public/LandingPage';
import PageViewer from './pages/public/PageViewer';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminOrders from './pages/admin/AdminOrders';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminPages from './pages/admin/AdminPages';
import AdminFaqs from './pages/admin/AdminFaqs';
import AdminComplaints from './pages/admin/AdminComplaints';
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
import { Toaster } from 'react-hot-toast';
function App() {
  const { checkSession, isLoading } = useAuthStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    checkSession();
    fetchSettings();
  }, [checkSession, fetchSettings]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { fontFamily: 'Tajawal', padding: '16px', borderRadius: '12px' } }} />
      <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-['Tajawal']">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/page/:slug" element={<PageViewer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
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
