import React from 'react';
import './App.css';
//ESTO DE AQUI SE TENIA ANTES, PERO CAMBIO LA ESTRUCTURA
// import logo from './logo.svg';
// import { AuthProvider } from './components/AuthContext';
// import Login from './components/Login';
// import RegisterCondominio from './components/RegisterCondominio';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import NavbarNew from './components/NavbarNew';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CondDashboard from './pages/CondDashboardClean';
import AdminDashboard from './pages/AdminDashboard';
import UnirseCondominio from './pages/UnirseCondominio';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

function AppContent() {
  const { user } = useAuth();
  return (
    <>
      {/* Solo mostrar Navbar si el usuario está autenticado */}
      {user && <NavbarNew />}
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/unirse"
          element={
            <ProtectedRoute role="condomino">
              <UnirseCondominio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/condominio/*"
          element={
            <ProtectedRoute role="condomino">
              <CondDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={
          user ? <Navigate to={user.rol === 'admin' ? '/admin' : '/condominio'} /> : <Navigate to="/login" />
        } />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
