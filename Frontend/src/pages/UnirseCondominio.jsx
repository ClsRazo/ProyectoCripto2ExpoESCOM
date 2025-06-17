import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

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
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Código de condominio"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        required
      />
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files[0])}
        required
      />
      <button type="submit">Unirme y subir estado</button>
      {msg && <p>{msg}</p>}
    </form>
  );
}
