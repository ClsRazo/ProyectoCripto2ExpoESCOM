import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/admin/condominios')
      .then(res => setData(res.data))
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard Admin</h2>
      <table border={1} cellPadding={8} style={{ width: '100%', marginTop: 20 }}>
        <thead>
          <tr>
            <th>Condominio</th>
            <th>Usuarios</th>
            <th>Código</th>
            <th>Operaciones</th>
            <th><button>➕</button></th>
          </tr>
        </thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.num_usuarios}</td>
              <td>{c.codigo}</td>
              <td>
                <button>Subir</button>
                <button>Editar</button>
                <button>Ver</button>
              </td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}