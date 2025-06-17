import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function UnirseCondominio() {
  const { user, token, clavePrivada } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setMsg('Selecciona tu estado de cuenta');
      return;
    }
    const form = new FormData();
    form.append('codigo_condominio', codigo);
    form.append('estado_de_cuenta', file);

    // Incluimos un header custom para enviar la clave privada al backend (si decides firmar allí)
    axios.defaults.headers.common['X-Private-Key'] = clavePrivada;

    try {
      const res = await axios.post('http://localhost:5000/api/condominio/unirse', form);
      setMsg(res.data.message);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al unirse');
    }
  }
  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>Unirse a Condominio</h2>
          <p>Ingresa el código de tu condominio y sube tu estado de cuenta</p>
        </div>
        <div className="card-body">
          {msg && (
            <div className={`alert ${msg.includes('Error') ? 'alert-error' : 'alert-success'}`}>
              {msg}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="codigo">Código de condominio:</label>
              <input
                id="codigo"
                type="text"
                placeholder="Código de condominio"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="form-control"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="estado_cuenta">Estado de cuenta (PDF):</label>
              <input
                id="estado_cuenta"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="form-control"
                required
              />
              <small className="form-text">
                Selecciona tu estado de cuenta en formato PDF
              </small>
            </div>
            
            <button type="submit" className="btn btn-primary btn-full">
              Unirme y subir estado
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
