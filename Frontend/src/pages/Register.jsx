import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/auth.css';

export default function Register() {
  const { register } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const navigate = useNavigate();

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
  const passwordsMatch = password === confirmPassword;

  /**
   * Descarga automática de un archivo .pem con la clave privada
   * `clavePem`: string con el contenido PEM completo ("-----BEGIN PRIVATE KEY-----\n...")
   * `fileName`: nombre con que queremos guardar el archivo, p.ej. "clave_privada.pem"
   */
  function downloadPrivateKey(clavePem, fileName = 'clave_privada.pem') {
    // Creamos un Blob con el texto PEM y especificamos tipo MIME
    const blob = new Blob([clavePem], { type: 'application/x-pem-file' });
    // Creamos una URL temporal para el Blob
    const url = window.URL.createObjectURL(blob);
    // Creamos un enlace <a> invisible que apunte a esa URL y forzaremos la descarga
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    // Luego liberamos la URL creada
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setModalContent('');

    // Validar contraseña
    if (!isPasswordValid) {
      setErrorMsg('La contraseña no cumple con los requisitos de seguridad');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    try {
      // Llamamos al contexto para registrarnos; esperamos recibir { message, clave_privada, usuario }
      const data = await register({ nombre, correo, password });
      // console.log('Registro exitoso:', data);

      // Si el backend devolvió la clave privada, la descargamos
      if (data.clave_privada) {
        downloadPrivateKey(data.clave_privada, 'clave_privada.pem');
      }

      // Preparamos el contenido del modal
      // Si nos devolvieron mensaje, lo incluimos; de lo contrario, construimos un mensaje genérico
      const textoBase = data.message
        ? data.message
        : '¡Registro exitoso! Revisa tu correo para verificar tu cuenta.';
      const advertencia = data.clave_privada
        ? '\n\n🔒 Tu clave privada se ha descargado automáticamente como “clave_privada.pem”. ¡Guárdala muy bien! No se volverá a generar ni se podrá recuperar.'
        : '\n\n⚠︎ No se recibió clave privada. Comunícate con el soporte si crees que es un error.';
      setModalContent(textoBase + advertencia);
      setModalOpen(true);
    } catch (err) {
      console.error('Error al registrar condómino:', err);
      setErrorMsg(err.error || 'Error en el servidor al registrar condómino.');
    }
  }  return (
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
            <h2>Registro de Condómino</h2>
          </div>
          <div className="auth-card-body">
            {errorMsg && <div className="auth-alert auth-alert-error">{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-form-group">
                <label htmlFor="nombre" className="auth-form-label">Nombre completo:</label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="auth-form-input"
                  placeholder="Ingresa tu nombre completo"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="correo" className="auth-form-label">Correo:</label>
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  className="auth-form-input"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              
              <div className="auth-form-group">
                <label htmlFor="password" className="auth-form-label">Contraseña:</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowValidation(true)}
                  required
                  className="auth-form-input"
                  placeholder="Contraseña segura"
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
              
              <div className="auth-form-group">
                <label htmlFor="confirmPassword" className="auth-form-label">Confirmar contraseña:</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="auth-form-input"
                  placeholder="Repite tu contraseña"
                />
                {confirmPassword && !passwordsMatch && (
                  <div className="auth-password-validation">
                    <div className="auth-validation-item">
                      <span className="auth-validation-icon auth-validation-invalid">
                        ✗
                      </span>
                      <span className="auth-validation-text">Las contraseñas no coinciden</span>
                    </div>
                  </div>
                )}
                {confirmPassword && passwordsMatch && (
                  <div className="auth-password-validation">
                    <div className="auth-validation-item">
                      <span className="auth-validation-icon auth-validation-valid">
                        ✓
                      </span>
                      <span className="auth-validation-text">Las contraseñas coinciden</span>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                type="submit" 
                className="auth-btn-primary"
                disabled={!isPasswordValid || !passwordsMatch}
              >
                Registrarme
              </button>
            </form>
            
            <div className="auth-links">
              <Link to="/login" className="auth-link">¿Ya tienes cuenta? Inicia sesión</Link>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registro Exitoso</h3>
            </div>
            <div className="modal-body">
              <div className="auth-alert auth-alert-success" style={{ whiteSpace: 'pre-wrap' }}>
                {modalContent}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => { setModalOpen(false); navigate('/login'); }} 
                className="auth-btn-primary"
              >
                Ir al Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
