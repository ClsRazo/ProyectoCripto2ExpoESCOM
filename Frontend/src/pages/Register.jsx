import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const navigate = useNavigate();

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
  }
  return (
    <div className="container">
      <div className="card auth-card">
        <div className="card-header">
          <h2>Registro de Condómino</h2>
        </div>
        <div className="card-body">
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="nombre">Nombre completo:</label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="form-control"
                placeholder="Ingresa tu nombre completo"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="correo">Correo:</label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                className="form-control"
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Contraseña:</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-control"
                placeholder="Contraseña segura"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña:</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="form-control"
                placeholder="Repite tu contraseña"
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-full">
              Registrarme
            </button>
          </form>
          
          <div className="auth-links">
            <Link to="/login" className="link">¿Ya tienes cuenta? Inicia sesión</Link>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registro Exitoso</h3>
            </div>
            <div className="modal-body">
              <div className="alert alert-success" style={{ whiteSpace: 'pre-wrap' }}>
                {modalContent}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => { setModalOpen(false); navigate('/login'); }} 
                className="btn btn-primary"
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
