import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api/condominio';
import axios from 'axios';

export default function CondDashboard() {
  const { user, clavePrivada } = useAuth();
  const [cond, setCond] = useState(null);
  const [selected, setSelected] = useState(null);
  const [joining, setJoining] = useState(false);
  const [code, setCode]=useState('');
  const [file, setFile]=useState(null);

  useEffect(() => {
    if (user && user.condominioId) {
      api.getCondominio(user.condominioId).then(setCond).catch(() => setCond(null));
    }
  }, [user]);

  const handleJoin = ()=> setJoining(true);
  const confirmJoin = ()=> api.unirseCondominio(null,file,clavePrivada,code).then(()=>window.location.reload());

  const handleViewEstado = ()=> {/*fetch metadata*/};
  const handleDescifrar = ()=>{/*descifrarEstado*/};
  const handleViewBalance = ()=>{/*getBalance*/};
  const handleFirmarComp = ()=>{/*firmarComprobante*/};

  // useEffect(() => {
  //   axios.get('/api/condominio/1')  // id ficticio
  //     .then(res => setCond(res.data))
  //     .catch(console.error);
  // }, []);
  if(!cond) return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>🏠 Dashboard del Condómino</h2>
          <p>No perteneces a ningún condominio todavía</p>
        </div>
        <div className="card-body">
          <div className="text-center">
            <p>Para acceder a las funciones del sistema, primero debes unirte a un condominio.</p>
            <button onClick={handleJoin} className="btn btn-primary">
              Unirse a Condominio
            </button>
          </div>
          
          {joining && (
            <div className="form-section">
              <h3>Datos para unirse</h3>
              <div className="form-group">
                <input 
                  placeholder="Código del condominio" 
                  value={code} 
                  onChange={e=>setCode(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <input 
                  type="file" 
                  onChange={e=>setFile(e.target.files[0])}
                  className="form-control"
                  accept=".pdf"
                />
                <small className="form-text">Sube tu estado de cuenta (PDF)</small>
              </div>
              <div className="button-group">
                <button onClick={confirmJoin} className="btn btn-primary">
                  Confirmar
                </button>
                <button onClick={() => setJoining(false)} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  return (
    <div className="dashboard-layout">
      <Sidebar
        title={cond?.nombre || 'Sin condominio'}
        items={cond ? [{ id: cond.admin.id, nombre: cond.admin.nombre }] : []}
        onSelect={setSelected}
        joinAction={handleJoin}
      />
      <main className="dashboard-main">
        <div className="container">
          {selected ? (
            <div className="card">
              <div className="card-header">
                <h2>Detalles de {selected.nombre}</h2>
              </div>
              <div className="card-body">
                <div className="button-group">
                  <button onClick={handleViewEstado} className="btn btn-primary">
                    📄 Estado de cuenta
                  </button>
                  <button onClick={handleViewBalance} className="btn btn-primary">
                    📊 Balance general
                  </button>
                  <button onClick={handleFirmarComp} className="btn btn-success">
                    ✍️ Firmar comprobante
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h2>🏠 Bienvenido, {user.nombre}</h2>
              </div>
              <div className="card-body">
                <p>Has sido autenticado correctamente en tu condominio <strong>{cond?.nombre}</strong>.</p>
                <p>Selecciona una opción del menú lateral para comenzar.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}