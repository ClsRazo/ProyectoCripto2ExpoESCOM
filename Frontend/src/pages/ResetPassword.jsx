import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/auth.css';
import API_CONFIG from '../config/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Verificar token al cargar la página
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/auth/verify-reset-token/${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
          setUserInfo({ correo: data.correo, nombre: data.nombre });
        } else {
          setError(data.error || 'Token inválido o expirado');
        }
      } catch (err) {
        setError('Error al verificar el token');
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setError('Token no proporcionado');
      setVerifying(false);
    }
  }, [token]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validaciones de contraseña (mismas que login/register)
  const getPasswordValidation = (password) => {
    return {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  const validatePassword = () => {
    const validation = getPasswordValidation(formData.password);
    const isPasswordValid = Object.values(validation).every(Boolean);
    
    if (!isPasswordValid) {
      setError('La contraseña debe tener al menos 12 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos especiales');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validatePassword()) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          nueva_password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Error al restablecer la contraseña');
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };  if (verifying) {
    return (
      <div className="auth-container">
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
            <div className="auth-card-body">
              <div className="loading-message">
                <div className="loading-spinner"></div>
                <p>Verificando enlace...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }  if (!tokenValid) {
    return (
      <div className="auth-container">
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
              <h1>Enlace Inválido</h1>
              <p>El enlace de restablecimiento es inválido o ha expirado.</p>
            </div>

            <div className="auth-card-body">
              <div className="auth-alert auth-alert-error">
                <span className="error-icon">❌</span>
                {error}
              </div>

              <div className="auth-links">
                <Link to="/forgot-password" className="auth-link">
                  Solicitar nuevo enlace
                </Link>
                <Link to="/login" className="auth-link">
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
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
            <h1>Nueva Contraseña</h1>
            {userInfo && (
              <p>Hola <strong>{userInfo.nombre}</strong>, establece tu nueva contraseña para <strong>{userInfo.correo}</strong></p>
            )}
          </div>

          <div className="auth-card-body">
            {message && (
              <div className="auth-alert auth-alert-success">
                {message}
                <br />
                <small>Serás redirigido al login en unos segundos...</small>
              </div>
            )}

            {error && (
              <div className="auth-alert auth-alert-error">
                <span className="error-icon">❌</span>
                {error}
              </div>
            )}

            {!message && (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-form-group">
                  <label htmlFor="password" className="auth-form-label">Nueva Contraseña</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Mínimo 12 caracteres, incluye mayúsculas, minúsculas, números y símbolos"
                    required
                    disabled={loading}
                    className="auth-form-input"
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="confirmPassword" className="auth-form-label">Confirmar Contraseña</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Repite la contraseña"
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
                  {loading ? 'Actualizando...' : 'Establecer Nueva Contraseña'}
                </button>
              </form>
            )}

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

export default ResetPassword;
