import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import MiPerfil from './MiPerfil';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowProfileMenu(false);
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setShowProfileMenu(false);
  };
  return (
    <nav className="navbar">
      <div className="navbar-logo">S.</div>
      <div className="navbar-brand">Sagitarium</div>
      
      {user && (
        <div className="navbar-user">
          <button
            onClick={toggleTheme}
            className="btn btn-secondary theme-toggle"
            title={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          
          <div className="profile-dropdown">
            <button
              className="profile-button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="Mi perfil"
            >
              <span className="profile-icon">👤</span>
              <span className="profile-name">{user.nombre}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            
            {showProfileMenu && (
              <div className="profile-menu">
                <div className="profile-menu-header">
                  <div className="profile-info">
                    <strong>{user.nombre}</strong>
                    <span className="profile-role">{user.rol.toUpperCase()}</span>
                  </div>
                </div>
                <div className="profile-menu-items">
                  <button 
                    className="profile-menu-item"
                    onClick={handleProfileClick}
                  >
                    <span className="menu-icon">⚙️</span>
                    Mi Perfil
                  </button>
                  <button 
                    className="profile-menu-item logout-item"
                    onClick={handleLogout}
                  >
                    <span className="menu-icon">🚪</span>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        {/* Overlay para cerrar el menú */}
      {showProfileMenu && (
        <div 
          className="dropdown-overlay"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
      
      {/* Modal Mi Perfil */}
      <MiPerfil 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </nav>
  );
}
