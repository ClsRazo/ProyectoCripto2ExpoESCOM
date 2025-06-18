import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };  return (
    <nav className="navbar">
      <div className="navbar-logo">S.</div>
      <div className="navbar-brand">Sagitarium</div>
      
      {user && (
        <div className="navbar-user">
          <div className="user-info">
            <span>👤</span>
            <div>
              <div className="user-name">{user.nombre}</div>
              <div className="user-role">{user.rol.toUpperCase()}</div>
            </div>
          </div>
          
          <button
            onClick={toggleTheme}
            className="btn btn-secondary theme-toggle"
            title={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          
          <button
            onClick={handleLogout}
            className="btn btn-danger"
          >
            Cerrar Sesión
          </button>
        </div>
      )}
    </nav>
  );
}