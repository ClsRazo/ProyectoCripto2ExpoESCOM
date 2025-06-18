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
          )}        </div>
      </div>
    </div>
  );

  return (
    <div className="condomino-layout">
      {/* Sidebar izquierda - 20% - Solo con título y botón unirse */}
      <div className="condomino-sidebar">
        <div className="sidebar-simple">
          <div className="sidebar-header">
            <h3 className="condomino-title">🏠 {cond?.nombre || 'Sin condominio'}</h3>
          </div>
          <div className="sidebar-footer">
            <button onClick={handleJoin} className="btn btn-secondary btn-full">
              ➕ Unirse
            </button>
          </div>
        </div>
      </div>
      
      {/* Área principal derecha - 80% */}
      <div className="condomino-main">
        <div className="condomino-content">
          {selected ? (
            <div className="card">
              <div className="card-header">
                <h2 className="condomino-title">Detalles de {selected.nombre}</h2>
              </div>
              <div className="card-body">
                <div className="admin-buttons-grid">
                  <button onClick={handleViewEstado} className="btn btn-primary">
                    📄 Estado de cuenta
                  </button>
                  <button onClick={handleViewBalance} className="btn btn-primary">
                    📊 Balance general
                  </button>
                  <button onClick={() => {}} className="btn btn-info">
                    📋 Ver comprobantes
                  </button>
                  <button onClick={() => {}} className="btn btn-success">
                    ✅ Verificar comprobante
                  </button>
                </div>
              </div>
            </div>          ) : (
            <div className="card">
              <div className="card-header">
                <h2 className="condomino-title">🏠 Bienvenido, {user.nombre}</h2>
              </div>
              <div className="card-body">
                <p>Has sido autenticado correctamente en tu condominio <strong>{cond?.nombre}</strong>.</p>
                
                {/* Información del condominio y admin */}
                <div className="condominio-info">
                  <div className="info-section">
                    <h4>👑 Administrador</h4>
                    <div className="admin-card">
                      <div className="admin-info">
                        <span className="admin-name">👤 {cond?.admin?.nombre}</span>
                        <button 
                          onClick={() => setSelected(cond?.admin)} 
                          className="btn btn-outline-primary btn-sm"
                        >
                          Ver opciones
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {cond?.miembros && cond.miembros.length > 0 && (
                    <div className="info-section">
                      <h4>👥 Miembros del condominio</h4>
                      <div className="members-list">
                        {cond.miembros.map(miembro => (
                          <div key={miembro.id} className="member-card">
                            <span>👤 {miembro.nombre}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}