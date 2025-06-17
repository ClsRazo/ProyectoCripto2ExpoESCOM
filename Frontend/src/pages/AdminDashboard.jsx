import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as adminApi from '../api/admin';

export default function AdminDashboard() {
  const { user, clavePrivada } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCondominoModal, setShowCondominoModal] = useState(false);
  
  // Estados para formularios
  const [createForm, setCreateForm] = useState({ nombre: '', direccion: '' });
  const [editForm, setEditForm] = useState({ id: '', nombre: '', direccion: '' });
  const [uploadForm, setUploadForm] = useState({ condominioId: '', file: null, privateKeyFile: null });
  
  // Estados para visualización
  const [selectedCondominio, setSelectedCondominio] = useState(null);
  const [condominos, setCondominos] = useState([]);
  const [selectedCondomino, setSelectedCondomino] = useState(null);
  
  // Estados para mensajes
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Cargar condominios al montar el componente
  useEffect(() => {
    loadCondominios();
  }, []);
  const loadCondominios = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.listarCondominios();
      setData(result);
    } catch (err) {
      console.error('Error al cargar condominios:', err);
      setError('Error al cargar condominios: ' + (err.response?.data?.error || err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };
  // Función para crear condominio
  const handleCreateCondominio = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await adminApi.crearCondominio(createForm);
      setMessage('Condominio creado exitosamente');
      setCreateForm({ nombre: '', direccion: '' });
      setShowCreateModal(false);
      loadCondominios(); // Recargar lista
    } catch (err) {
      console.error('Error al crear condominio:', err);
      setError('Error al crear condominio: ' + (err.response?.data?.error || err.message || 'Error desconocido'));
    }
  };

  // Función para editar condominio
  const handleEditCondominio = async (e) => {
    e.preventDefault();
    try {
      await adminApi.editarCondominio(editForm.id, { 
        nombre: editForm.nombre, 
        direccion: editForm.direccion 
      });
      setMessage('Condominio actualizado exitosamente');
      setShowEditModal(false);
      loadCondominios(); // Recargar lista
    } catch (err) {
      setError('Error al editar condominio: ' + (err.error || err.message));
    }
  };
  // Función para subir balance general
  const handleUploadBalance = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Por favor selecciona un archivo PDF');
      return;
    }
    if (!uploadForm.privateKeyFile) {
      setError('Se requiere el archivo de clave privada para firmar el documento');
      return;
    }
    
    try {
      // Leer el contenido del archivo de clave privada
      const privateKeyContent = await uploadForm.privateKeyFile.text();
      await adminApi.subirBalance(uploadForm.condominioId, uploadForm.file, privateKeyContent);
      setMessage('Balance general subido exitosamente');
      setUploadForm({ condominioId: '', file: null, privateKeyFile: null });
      setShowUploadModal(false);
    } catch (err) {
      console.error('Error al subir balance:', err);
      setError('Error al subir balance: ' + (err.response?.data?.error || err.message || 'Error desconocido'));
    }
  };
  // Función para ver condominos de un condominio
  const handleViewCondominos = async (condominio) => {
    try {
      setSelectedCondominio(condominio);
      const result = await adminApi.listarCondominos(condominio.id);
      setCondominos(result);
      setShowViewModal(true);
    } catch (err) {
      // Si no hay condominos o hay error, mostrar array vacío
      setCondominos([]);
      setSelectedCondominio(condominio);
      setShowViewModal(true);
      console.warn('No se pudieron cargar los condóminos:', err);
    }
  };

  // Función para copiar código al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage('Código copiado al portapapeles');
    }).catch(() => {
      setError('No se pudo copiar el código');
    });
  };

  // Limpiar mensajes después de 3 segundos
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Bienvenido {user?.nombre}</h2>
      
      {/* Mensajes */}
      {message && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px' 
        }}>
          {message}
        </div>
      )}
      
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px' 
        }}>
          {error}
        </div>      )}

      {/* Header con título y botón de crear */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Mis Condominios</h3>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{ 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            padding: '10px 16px', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ Crear Condominio
        </button>
      </div>

      <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th>Condominio</th>
            <th>No. Usuarios</th>
            <th>Código</th>
            <th>Operaciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.num_usuarios}</td>
              <td>
                <span style={{ fontFamily: 'monospace', marginRight: '10px' }}>{c.codigo}</span>
                <button 
                  onClick={() => copyToClipboard(c.codigo)}
                  style={{ 
                    background: '#17a2b8', 
                    color: 'white', 
                    border: 'none', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Copiar
                </button>
              </td>
              <td>
                <button 
                  onClick={() => {
                    setUploadForm({ ...uploadForm, condominioId: c.id });
                    setShowUploadModal(true);
                  }}
                  style={{ 
                    background: '#ffc107', 
                    color: '#212529', 
                    border: 'none', 
                    padding: '6px 10px', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    marginRight: '5px'
                  }}
                >
                  Subir BG
                </button>
                <button 
                  onClick={() => {
                    setEditForm({ id: c.id, nombre: c.nombre, direccion: c.direccion || '' });
                    setShowEditModal(true);
                  }}
                  style={{ 
                    background: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    padding: '6px 10px', 
                    borderRadius: '3px', 
                    cursor: 'pointer',
                    marginRight: '5px'
                  }}
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleViewCondominos(c)}
                  style={{ 
                    background: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    padding: '6px 10px', 
                    borderRadius: '3px', 
                    cursor: 'pointer'
                  }}                >
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal para crear condominio */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3>Crear Nuevo Condominio</h3>
            <form onSubmit={handleCreateCondominio}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
                <input
                  type="text"
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Dirección:</label>
                <input
                  type="text"
                  value={createForm.direccion}
                  onChange={(e) => setCreateForm({ ...createForm, direccion: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar condominio */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3>Editar Condominio</h3>
            <form onSubmit={handleEditCondominio}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Dirección:</label>
                <input
                  type="text"
                  value={editForm.direccion}
                  onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para subir balance general */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3>Subir Balance General</h3>
            <form onSubmit={handleUploadBalance}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Archivo PDF:</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Archivo de Clave Privada (.pem):</label>
                <input
                  type="file"
                  accept=".pem,.key"
                  onChange={(e) => setUploadForm({ ...uploadForm, privateKeyFile: e.target.files[0] })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <small style={{ color: '#6c757d' }}>
                  Selecciona tu archivo de clave privada (.pem) para firmar digitalmente el balance general
                </small>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({ condominioId: '', file: null, privateKeyFile: null });
                  }}
                  style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#ffc107', color: '#212529', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Subir Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver condóminos */}
      {showViewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '80%',
            overflow: 'auto'
          }}>
            <h3>Condóminos de {selectedCondominio?.nombre}</h3>
            <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Acciones</th>
                </tr>
              </thead>              <tbody>
                {condominos.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                      No hay condóminos en este condominio
                    </td>
                  </tr>
                ) : (
                  condominos.map(condomino => (
                    <tr key={condomino.id}>
                      <td>{condomino.nombre}</td>
                      <td>{condomino.correo}</td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedCondomino(condomino);
                            setShowCondominoModal(true);
                          }}
                          style={{ 
                            background: '#17a2b8', 
                            color: 'white', 
                            border: 'none', 
                            padding: '4px 8px', 
                            borderRadius: '3px', 
                            cursor: 'pointer'
                          }}
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
              <button
                onClick={() => setShowViewModal(false)}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para detalles del condómino */}
      {showCondominoModal && selectedCondomino && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%'
          }}>
            <h3>Detalles de {selectedCondomino.nombre}</h3>
            <div style={{ marginBottom: '15px' }}>
              <p><strong>Nombre:</strong> {selectedCondomino.nombre}</p>
              <p><strong>Correo:</strong> {selectedCondomino.correo}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => {
                  // Función para ver estado de cuenta
                  alert('Funcionalidad de ver estado de cuenta - Próximamente');
                }}
                style={{ 
                  background: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  cursor: 'pointer'
                }}
              >
                Ver Estado de Cuenta
              </button>
              <button
                onClick={() => {
                  // Función para verificar comprobante
                  alert('Funcionalidad de verificar comprobante - Próximamente');
                }}
                style={{ 
                  background: '#ffc107', 
                  color: '#212529', 
                  border: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  cursor: 'pointer'
                }}
              >
                Verificar Comprobante
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCondominoModal(false)}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}