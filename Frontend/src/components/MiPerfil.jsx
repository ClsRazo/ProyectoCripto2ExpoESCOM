import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';

const MiPerfil = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    nombre: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);      const token = localStorage.getItem('token');
      const baseUrl = user?.rol === 'admin' ? '/api/admin' : '/api/condomino';
      
      const response = await fetch(`http://3.136.236.195:5000${baseUrl}/perfil`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar el perfil');
      }
      
      const data = await response.json();
      setProfile(data);
      setFormData({
        nombre: data.usuario.nombre
      });
    } catch (error) {
      setError('Error al cargar el perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    try {
      setLoading(true);      const token = localStorage.getItem('token');
      const baseUrl = user?.rol === 'admin' ? '/api/admin' : '/api/condomino';
      
      const response = await fetch(`http://3.136.236.195:5000${baseUrl}/perfil`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el perfil');
      }
      
      const data = await response.json();
      
      // Actualizar el contexto de autenticación con los nuevos datos
      updateUser(data.usuario);
      
      await loadProfile();
      setEditMode(false);
      setError('');
    } catch (error) {
      setError('Error al actualizar el perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = () => {
    setFormData({
      nombre: profile.usuario.nombre
    });
    setEditMode(false);
    setError('');
  };
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="profile-modal-overlay">
      <div className="profile-modal-content"><div className="modal-header">
          <h2 className="modal-title">Mi Perfil</h2>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div className="loading">Cargando perfil...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : profile ? (
            <div className="profile-content">
              <div className="profile-section">
                <h3>Información Personal</h3>
                <div className="profile-field">
                  <label>Nombre:</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="profile-input"
                    />
                  ) : (
                    <span>{profile.usuario.nombre}</span>
                  )}
                </div>
                  <div className="profile-field">
                  <label>Correo:</label>
                  <span>{profile.usuario.correo}</span>
                </div>
                
                <div className="profile-field">
                  <label>Rol:</label>
                  <span className={`role-badge ${profile.usuario.rol}`}>
                    {profile.usuario.rol === 'condomino' ? 'Condómino' : 'Admin'}
                  </span>
                </div>
                
                <div className="profile-field">
                  <label>Estado:</label>
                  <span className={`status-badge ${profile.usuario.verificado ? 'verified' : 'unverified'}`}>
                    {profile.usuario.verificado ? 'Verificado' : 'No verificado'}
                  </span>
                </div>
                
                <div className="profile-field">
                  <label>Fecha de registro:</label>
                  <span>{new Date(profile.usuario.fecha_creacion).toLocaleDateString()}</span>
                </div>
              </div>

              {profile.condominios && user?.rol === 'admin' && (
                <div className="profile-section">
                  <h3>Condominios Administrados</h3>
                  <div className="profile-field">
                    <label>Total:</label>
                    <span className="admin-stat">{profile.total_condominios}</span>
                  </div>
                  {profile.condominios.map((cond, index) => (
                    <div key={cond.id} className="condominio-item">
                      <div className="profile-field">
                        <label>{`${index + 1}. ${cond.nombre}:`}</label>
                        <span>{cond.num_usuarios} usuarios</span>
                      </div>
                      <div className="profile-field-detail">
                        <small>{cond.direccion}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {profile.condominio && user?.rol === 'condomino' && (
                <div className="profile-section">
                  <h3>Condominio</h3>
                  <div className="profile-field">
                    <label>Nombre:</label>
                    <span>{profile.condominio.nombre}</span>
                  </div>
                  <div className="profile-field">
                    <label>Dirección:</label>
                    <span>{profile.condominio.direccion}</span>
                  </div>
                  <div className="profile-field">
                    <label>Fecha de unión:</label>
                    <span>{new Date(profile.condominio.fecha_union).toLocaleDateString()}</span>
                  </div>
                </div>              )}

              {profile.ultimo_estado_cuenta && user?.rol === 'condomino' && (
                <div className="profile-section">
                  <h3>Estado de Cuenta</h3>
                  <div className="profile-field">
                    <label>Última actualización:</label>
                    <span>{new Date(profile.ultimo_estado_cuenta.fecha_subida).toLocaleDateString()}</span>
                  </div>
                  <div className="profile-field">
                    <label>Estado:</label>
                    <span className={`status-badge ${profile.ultimo_estado_cuenta.vigente ? 'vigente' : 'vencido'}`}>
                      {profile.ultimo_estado_cuenta.vigente ? 'Vigente' : 'Requiere actualización'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
          <div className="modal-footer">
          {editMode ? (
            <>
              <button 
                className="modal-btn modal-btn-danger" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cerrar
              </button>
              <button 
                className="modal-btn modal-btn-primary" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          ) : (
            <>
              <button 
                className="modal-btn modal-btn-danger" 
                onClick={onClose}
              >
                Cerrar
              </button>
              <button 
                className="modal-btn modal-btn-primary" 
                onClick={() => setEditMode(true)}
              >
                Editar
              </button>
            </>
          )}        </div>
      </div>
    </div>,
    document.body
  );
};

export default MiPerfil;
