import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/login" />;
  if (role && user.rol !== role) return <Navigate to="/" />;
  return <>{children}</>;
}