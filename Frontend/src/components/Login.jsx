// src/components/Login.jsx
import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Login() {
  const { login } = useAuth();

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = await login({ correo, password });
      setSuccessMsg('¡Login exitoso! Bienvenido, ' + data.usuario.nombre);
      // Aquí podrías redirigir a otra página, p.ej. dashboard
    } catch (err) {
      // err puede ser { error: "mensaje" } o { error: "...", detalle: "..." }
      setErrorMsg(err.error || 'Error en el servidor');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Iniciar Sesión</h2>
      {errorMsg && <div style={{ color: 'red' }}>{errorMsg}</div>}
      {successMsg && <div style={{ color: 'green' }}>{successMsg}</div>}
      <form onSubmit={handleSubmit}>
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
        <button type="submit" style={{ padding: '8px 16px' }}>
          Iniciar Sesión
        </button>
      </form>
    </div>
  );
}
