// src/components/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/auth.css';

export default function Login() {
  const [successMsg, setSuccessMsg] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  // Validaciones de contraseña
  const validatePassword = (password) => {
    return {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  const validation = validatePassword(password);
  const isPasswordValid = Object.values(validation).every(Boolean);
  const handle = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Solo validar contraseña si el usuario ha empezado a escribir
    if (password && !isPasswordValid) {
      setErrorMsg('La contraseña no cumple con los requisitos de seguridad');
      return;
    }

    try {
      const data = await login({ correo, password });
      setSuccessMsg('¡Login exitoso! Bienvenido, ' + data.usuario.nombre);
      navigate(data.usuario.rol === 'admin' ? '/admin' : '/condominio');
    } catch (err) {
      setErrorMsg(err.error || 'Error en el servidor');
    }
  };return (
    <div className="auth-container">
      {/* Navbar superior */}
      <nav className="auth-navbar">
        <div className="auth-navbar-content">
          <div className="auth-navbar-brand">
            <span className="auth-navbar-logo">S.</span>
            <h1 className="auth-navbar-title">Sagitarium</h1>
          </div>
          <button 
            className="auth-theme-toggle"
            onClick={toggleTheme}
            title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Iniciar Sesión</h2>
          </div>
          <div className="auth-card-body">
            {errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}
            {successMsg && <div className="auth-alert auth-alert-success">{successMsg}</div>}
            
            <form onSubmit={handle} className="auth-form">
              <div className="auth-form-group">
                <label htmlFor="correo" className="auth-form-label">Correo:</label>
                <input 
                  id="correo"
                  type="email"
                  placeholder="Correo electrónico"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  className="auth-form-input"
                  required
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="password" className="auth-form-label">Contraseña:</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setShowValidation(true)}
                  className="auth-form-input"
                  required
                />
                
                {/* Validaciones de contraseña */}
                {showValidation && password && (
                  <div className="auth-password-validation">
                    <h4>Requisitos de contraseña:</h4>
                    <div className="auth-validation-item">
                      <span className={`auth-validation-icon ${validation.length ? 'auth-validation-valid' : 'auth-validation-invalid'}`}>
                        {validation.length ? '✓' : '✗'}
                      </span>
                      <span className="auth-validation-text">Mínimo 12 caracteres</span>
                    </div>
                    <div className="auth-validation-item">
                      <span className={`auth-validation-icon ${validation.uppercase ? 'auth-validation-valid' : 'auth-validation-invalid'}`}>
                        {validation.uppercase ? '✓' : '✗'}
                      </span>
                      <span className="auth-validation-text">Al menos una mayúscula</span>
                    </div>
                    <div className="auth-validation-item">
                      <span className={`auth-validation-icon ${validation.lowercase ? 'auth-validation-valid' : 'auth-validation-invalid'}`}>
                        {validation.lowercase ? '✓' : '✗'}
                      </span>
                      <span className="auth-validation-text">Al menos una minúscula</span>
                    </div>
                    <div className="auth-validation-item">
                      <span className={`auth-validation-icon ${validation.number ? 'auth-validation-valid' : 'auth-validation-invalid'}`}>
                        {validation.number ? '✓' : '✗'}
                      </span>
                      <span className="auth-validation-text">Al menos un número</span>
                    </div>
                    <div className="auth-validation-item">
                      <span className={`auth-validation-icon ${validation.special ? 'auth-validation-valid' : 'auth-validation-invalid'}`}>
                        {validation.special ? '✓' : '✗'}
                      </span>
                      <span className="auth-validation-text">Al menos un carácter especial</span>
                    </div>
                  </div>
                )}
              </div>
                <button 
                type="submit" 
                className="auth-btn-primary"
              >
                Iniciar Sesión
              </button>
            </form>
              <div className="auth-links">
              <Link to="/register" className="auth-link">¿Aún no tienes cuenta? Regístrate</Link>
              <Link to="/forgot-password" className="auth-link">¿Olvidaste tu contraseña?</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
