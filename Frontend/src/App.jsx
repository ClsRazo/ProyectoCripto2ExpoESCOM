import React from 'react';
import './App.css';
//ESTO DE AQUI SE TENIA ANTES, PERO CAMBIO LA ESTRUCTURA
// import logo from './logo.svg';
// import { AuthProvider } from './components/AuthContext';
// import Login from './components/Login';
// import RegisterCondominio from './components/RegisterCondominio';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import CondDashboard from './pages/CondDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
