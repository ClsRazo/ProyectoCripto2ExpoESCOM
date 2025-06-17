import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { user, token, loading } = useAuth();
  
  // Mostrar loading mientras se carga el estado desde localStorage
  if (loading) return <div>Cargando...</div>;
  
  // Si no hay token después de cargar, redirigir al login
  if (!token) return <Navigate to='/login' />;
  
  // Si se requiere un rol específico y el usuario no lo tiene, redirigir
  if (role && user?.rol !== role) return <Navigate to="/" />;
  
  return <>{children}</>;
}