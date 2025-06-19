import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/auth.css';
import API_CONFIG from '../config/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { isDark, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail(''); // Limpiar el campo
      } else {
        setError(data.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-container">      {/* Navbar */}
      <nav className="auth-navbar">
        <div className="auth-navbar-content">
          <div className="auth-navbar-brand">
            <span className="auth-navbar-logo">S.</span>
            <h1 className="auth-navbar-title">Sagitarium</h1>
          </div>
          <button 
            className="auth-theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Restablecer Contraseña</h1>
            <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
          </div>

          <div className="auth-card-body">            {message && (
              <div className="auth-alert auth-alert-success">
                {message}
              </div>
            )}

            {error && (
              <div className="auth-alert auth-alert-error">
                <span className="error-icon">❌</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-form-group">
                <label htmlFor="email" className="auth-form-label">Correo Electrónico</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  disabled={loading}
                  className="auth-form-input"
                />
              </div>

              <button 
                type="submit" 
                className="auth-form-submit"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Enlace de Restablecimiento'}
              </button>
            </form>

            <div className="auth-links">
              <Link to="/login" className="auth-link">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
