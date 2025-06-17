// src/components/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [successMsg, setSuccessMsg] = useState('');

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handle = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const data = await login({ correo, password });
      setSuccessMsg('¡Login exitoso! Bienvenido, ' + data.usuario.nombre);
      navigate(data.usuario.rol === 'admin' ? '/admin' : '/condominio');
    } catch (err) {
      setErrorMsg(err.error || 'Error en el servidor');
      // setError(err.error);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h2>Iniciar Sesión</h2>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}
      {/* <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          
        </div>
        <div style={{ marginBottom: 10 }}>
          
        </div>
      </form> */}
      <form onSubmit={handle}>
        <label>Correo:</label>
        <input 
          placeholder='Correo'
          value={correo}
          onChange={e => setCorreo(e.target.value)}
          style={{ width: '100%', padding: 8, margin: '8px 0' }}
        />
        <label>Contraseña:</label>
        <input
          type='password'
          placeholder='Contraseña'
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: 8 }}
        />
        <button type='submit' style={{ marginTop: 10 }}>Iniciar Sesión</button>
      </form>
      <p><Link to='/register'>¿Aún no tienes cuenta? Regístrate</Link></p>
    </div>
  );
}
