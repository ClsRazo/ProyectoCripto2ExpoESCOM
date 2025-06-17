import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { registerCondominio } = useAuth();

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');

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
      const data = await registerCondominio({ nombre, correo, password });
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
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Registro de Condómino</h2>
      {errorMsg && <div style={{ color: 'red', marginBottom: 10 }}>{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Nombre completo:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Correo:</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Confirmar contraseña:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>
          Registrarme
        </button>
      </form>

      {/* Modal sencillo */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 8,
              maxWidth: '90%',
              whiteSpace: 'pre-wrap'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Registro Exitoso</h3>
            <div style={{ marginTop: 10, marginBottom: 20 }}>{modalContent}</div>
            <button onClick={() => setModalOpen(false)} style={{ padding: '6px 12px' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
