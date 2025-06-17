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
    <div className="container">
      <div className="card auth-card">
        <div className="card-header">
          <h2>Iniciar Sesión</h2>
        </div>
        <div className="card-body">
          {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}
          
          <form onSubmit={handle} className="form">
            <div className="form-group">
              <label htmlFor="correo">Correo:</label>
              <input 
                id="correo"
                type="email"
                placeholder="Correo electrónico"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                className="form-control"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Contraseña:</label>
              <input
                id="password"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-control"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-full">
              Iniciar Sesión
            </button>
          </form>
          
          <div className="auth-links">
            <Link to="/register" className="link">¿Aún no tienes cuenta? Regístrate</Link>
            <Link to="/forgot" className="link">¿Olvidaste tu contraseña?</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
