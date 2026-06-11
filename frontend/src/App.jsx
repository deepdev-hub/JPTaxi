import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BillConfirmPage from '../pages/BillConfirmPage.jsx';
import DriverAvailablePage from '../pages/DriverAvailablePage.jsx';
import DriverDispatchPage from '../pages/DriverDispatchPage.jsx';
import DriverHomePage from '../pages/DriverHomePage.jsx';
import DriverInfoPage from '../pages/DriverInfoPage.jsx';
import DriverRegisterPage from '../pages/DriverRegisterPage.jsx';
import DriverReviewPage from '../pages/DriverReviewPage.jsx';
import DriverRideStatusPage from '../pages/DriverRideStatusPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import InvoicePage from '../pages/InvoicePage.jsx';
import LocationSearchPage from '../pages/LocationSearchPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import MessagesPage from '../pages/MessagesPage.jsx';
import PaymentPage from '../pages/PaymentPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import RideConfirmPage from '../pages/RideConfirmPage.jsx';
import RideStatusPage from '../pages/RideStatusPage.jsx';
import SearchCarPage from '../pages/SearchCarPage.jsx';
import UserInfoPage from '../pages/UserInfoPage.jsx';
import RuntimePageTranslator from '../i18n/RuntimePageTranslator.jsx';
import ActiveRideNavigationGuard from '../components/ActiveRideNavigationGuard.jsx';
import { getAuthRole, getAuthToken } from '../utils/session.js';

function getLoggedInRole() {
  return getAuthRole();
}

function getRoleToken() {
  return getAuthToken();
}

function ProtectedRoute({ children, role }) {
  const location = useLocation();
  const currentRole = getLoggedInRole();
  const token = getRoleToken();

  if ((!currentRole && !role) || !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && currentRole !== role) {
    return <Navigate to={currentRole === 'driver' ? '/driver-home' : '/home'} replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const currentRole = getLoggedInRole();
  const token = getRoleToken();
  if (!currentRole || !token) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={currentRole === 'driver' ? '/driver-home' : '/home'} replace />;
}

export default function App() {
  return (
    <>
      <RuntimePageTranslator />
      <ActiveRideNavigationGuard>
        <Routes>
          <Route path="/" element={<RoleHomeRedirect />} />
          <Route path="/home" element={<ProtectedRoute role="customer"><HomePage /></ProtectedRoute>} />
          <Route path="/driver-home" element={<ProtectedRoute role="driver"><DriverHomePage /></ProtectedRoute>} />
          <Route path="/driver_home.html" element={<Navigate to="/driver-home" replace />} />
          <Route path="/xacnhancuocxe" element={<ProtectedRoute role="driver"><DriverDispatchPage /></ProtectedRoute>} />
          <Route path="/driver-ride-status" element={<ProtectedRoute role="driver"><DriverRideStatusPage /></ProtectedRoute>} />
          <Route path="/driver-invoice" element={<ProtectedRoute role="driver"><InvoicePage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/messages/:audience" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login.html" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register.html" element={<Navigate to="/register" replace />} />
          <Route path="/driver-register" element={<DriverRegisterPage />} />
          <Route path="/driver_register.html" element={<Navigate to="/driver-register" replace />} />
          <Route path="/driver-available" element={<ProtectedRoute role="driver"><DriverAvailablePage /></ProtectedRoute>} />
          <Route path="/driver_available.html" element={<Navigate to="/driver-available" replace />} />
          <Route path="/user-info" element={<ProtectedRoute role="customer"><Navigate to="/user-info/profile" replace /></ProtectedRoute>} />
          <Route path="/user-info/:section" element={<ProtectedRoute role="customer"><UserInfoPage /></ProtectedRoute>} />
          <Route path="/user_info.html" element={<Navigate to="/user-info" replace />} />
          <Route path="/driver-info" element={<ProtectedRoute role="driver"><Navigate to="/driver-info/basic" replace /></ProtectedRoute>} />
          <Route path="/driver-info/:section" element={<ProtectedRoute role="driver"><DriverInfoPage /></ProtectedRoute>} />
          <Route path="/driver_info.html" element={<Navigate to="/driver-info" replace />} />
          <Route path="/bill-confirm" element={<ProtectedRoute role="customer"><BillConfirmPage /></ProtectedRoute>} />
          <Route path="/bill_confirm.html" element={<Navigate to="/bill-confirm" replace />} />
          <Route path="/xacnhandatxe.html" element={<Navigate to="/bill-confirm" replace />} />
          <Route path="/search-car" element={<ProtectedRoute role="customer"><SearchCarPage /></ProtectedRoute>} />
          <Route path="/search_car.html" element={<Navigate to="/search-car" replace />} />
          <Route path="/timxe.html" element={<Navigate to="/search-car" replace />} />
          <Route path="/location-search" element={<ProtectedRoute role="customer"><LocationSearchPage /></ProtectedRoute>} />
          <Route path="/timkiemvachondiadiem.html" element={<Navigate to="/location-search" replace />} />
          <Route path="/ride-confirm" element={<ProtectedRoute role="customer"><RideConfirmPage /></ProtectedRoute>} />
          <Route path="/Xacnhancuocxe.html" element={<Navigate to="/xacnhancuocxe" replace />} />
          <Route path="/ride-status" element={<ProtectedRoute role="customer"><RideStatusPage /></ProtectedRoute>} />
          <Route path="/trangthaicho.html" element={<Navigate to="/ride-status" replace />} />
          <Route path="/payment" element={<ProtectedRoute role="customer"><PaymentPage /></ProtectedRoute>} />
          <Route path="/thanhtoan.html" element={<Navigate to="/payment" replace />} />
          <Route path="/invoice" element={<ProtectedRoute><InvoicePage /></ProtectedRoute>} />
          <Route path="/xuathoadon.html" element={<Navigate to="/invoice" replace />} />
          <Route path="/driver-review" element={<ProtectedRoute role="customer"><DriverReviewPage /></ProtectedRoute>} />
          <Route path="/danhgiataixe.html" element={<Navigate to="/driver-review" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ActiveRideNavigationGuard>
    </>
  );
}
