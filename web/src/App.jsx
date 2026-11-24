// [YATHREB] Routes de l'application
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import FoodBackground from './components/FoodBackground';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Offers from './pages/student/Offers';
import Cart from './pages/student/Cart';
import MyOrders from './pages/student/MyOrders';
import PaymentResult from './pages/student/PaymentResult';
import StudentDashboard from './pages/student/StudentDashboard';
import MyCommerce from './pages/merchant/MyCommerce';
import MyOffers from './pages/merchant/MyOffers';
import MerchantOrders from './pages/merchant/MerchantOrders';
import MerchantDashboard from './pages/merchant/MerchantDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCommerces from './pages/admin/AdminCommerces';
import AdminUsers from './pages/admin/AdminUsers';
import CommerceProfile from './pages/CommerceProfile';
import UserProfile from './pages/UserProfile';
import CampusRadar from './pages/student/CampusRadar';

const P = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;
const S = ['etudiant'], M = ['commercant'], A = ['admin'];

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <FoodBackground />
      <Navbar />
      <main key={pathname} className={pathname === '/' ? 'home-main' : 'container page-in'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/offres" element={<Offers />} />
          <Route path="/profil" element={P(null, <Profile />)} />
          <Route path="/commerces/:id" element={<CommerceProfile />} />
          <Route path="/campus-radar" element={<CampusRadar />} />
          <Route path="/utilisateurs/:id" element={P(null, <UserProfile />)} />

          <Route path="/panier" element={P(S, <Cart />)} />
          <Route path="/mes-commandes" element={P(S, <MyOrders />)} />
          <Route path="/paiement/resultat" element={P(S, <PaymentResult />)} />
          <Route path="/etudiant/tableau-de-bord" element={P(S, <StudentDashboard />)} />

          <Route path="/commerce" element={P(M, <MyCommerce />)} />
          <Route path="/commerce/offres" element={P(M, <MyOffers />)} />
          <Route path="/commerce/commandes" element={P(M, <MerchantOrders />)} />
          <Route path="/commerce/tableau-de-bord" element={P(M, <MerchantDashboard />)} />

          <Route path="/admin" element={P(A, <AdminDashboard />)} />
          <Route path="/admin/commerces" element={P(A, <AdminCommerces />)} />
          <Route path="/admin/utilisateurs" element={P(A, <AdminUsers />)} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
