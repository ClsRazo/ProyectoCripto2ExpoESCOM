import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

export default function CondDashboard() {
  const [cond, setCond] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/condominio/1')  // id ficticio
      .then(res => setCond(res.data))
      .catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        title={cond?.nombre || 'Sin condominio'}
        items={cond ? [{ id: cond.admin.id, nombre: cond.admin.nombre }] : []}
        onSelect={setSelected}
      />
      <main style={{ flex: 1, padding: 20 }}>
        {selected ? <div>Detalles de {selected.nombre}</div> : <h2>Bienvenido</h2>}
      </main>
    </div>
  );
}