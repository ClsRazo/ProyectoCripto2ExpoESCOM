import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as adminApi from '../api/admin';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
    // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);  const [showCondominoModal, setShowCondominoModal] = useState(false);  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false);  const [showFirmarComprobanteModal, setShowFirmarComprobanteModal] = useState(false);
  const [showClavePrivadaModal, setShowClavePrivadaModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({ message: '', type: 'success' });
  
  // Estados para formularios
  const [createForm, setCreateForm] = useState({ nombre: '', direccion: '' });
  const [editForm, setEditForm] = useState({ id: '', nombre: '', direccion: '' });
  const [uploadForm, setUploadForm] = useState({ condominioId: '', file: null, privateKeyFile: null });
    // Estados para visualización
  const [selectedCondominio, setSelectedCondominio] = useState(null);
  const [condominos, setCondominos] = useState([]);  const [selectedCondomino, setSelectedCondomino] = useState(null);
  const [estadoCuentaPdf, setEstadoCuentaPdf] = useState(null);const [firmarComprobanteForm, setFirmarComprobanteForm] = useState({
    archivo: null,
    motivo: '',
    clavePrivada: null
  });
  const [clavePrivadaAdmin, setClavePrivadaAdmin] = useState(null);
  const [clavePrivadaFile, setClavePrivadaFile] = useState(null);
  const [pendienteCondomino, setPendienteCondomino] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
    // Estados para mensajes
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Función para mostrar notificación flotante
  const showNotification = (message, type = 'success') => {
    setNotificationData({ message, type });
    setShowNotificationModal(true);
    
    // Cerrar automáticamente después de 4 segundos
    setTimeout(() => {
      setShowNotificationModal(false);
    }, 4000);
  };

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
  };  // Función para crear condominio
  const handleCreateCondominio = async (e) => {
    e.preventDefault();
    try {
      await adminApi.crearCondominio(createForm);
      showNotification('Condominio creado exitosamente', 'success');
      setCreateForm({ nombre: '', direccion: '' });
      setShowCreateModal(false);
      loadCondominios(); // Recargar lista
    } catch (err) {
      console.error('Error al crear condominio:', err);
      showNotification('Error al crear condominio: ' + (err.response?.data?.error || err.message || 'Error desconocido'), 'error');
    }
  };

  // Función para editar condominio
  const handleEditCondominio = async (e) => {
    e.preventDefault();
    try {      await adminApi.editarCondominio(editForm.id, { 
        nombre: editForm.nombre, 
        direccion: editForm.direccion 
      });
      showNotification('Condominio actualizado exitosamente', 'success');
      setShowEditModal(false);
      loadCondominios(); // Recargar lista
    } catch (err) {
      showNotification('Error al editar condominio: ' + (err.error || err.message), 'error');
    }
  };  // Función para subir balance general
  const handleUploadBalance = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      showNotification('Por favor selecciona un archivo PDF', 'error');
      return;
    }
    if (!uploadForm.privateKeyFile) {
      showNotification('Se requiere el archivo de clave privada para firmar el documento', 'error');
      return;
    }
    
    try {
      // Leer el contenido del archivo de clave privada
      const privateKeyContent = await uploadForm.privateKeyFile.text();
      await adminApi.subirBalance(uploadForm.condominioId, uploadForm.file, privateKeyContent);
      showNotification('Balance general subido exitosamente', 'success');
      setUploadForm({ condominioId: '', file: null, privateKeyFile: null });
      setShowUploadModal(false);
    } catch (err) {
      console.error('Error al subir balance:', err);
      showNotification('Error al subir balance: ' + (err.response?.data?.error || err.message || 'Error desconocido'), 'error');
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

  // Función para copiar código al portapapeles  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Código copiado al portapapeles', 'success');
    }).catch(() => {
      showNotification('No se pudo copiar el código', 'error');
    });  };

  // Función para ver estado de cuenta de un condómino
  const handleVerEstadoCuenta = async (condomino) => {
    console.log('handleVerEstadoCuenta - Iniciando para:', condomino.nombre);
    console.log('Clave privada admin disponible:', !!clavePrivadaAdmin);
    
    // Primero verificar si tenemos la clave privada del admin
    if (!clavePrivadaAdmin) {
      console.log('No hay clave privada, mostrando modal...');
      setPendienteCondomino(condomino);
      setShowClavePrivadaModal(true);
      return;
    }

    // Si ya tenemos la clave, procesar directamente
    await procesarEstadoCuenta(condomino, clavePrivadaAdmin);
  };

  // Función para manejar la carga de clave privada del admin
  const handleClavePrivadaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setClavePrivadaFile(file);
    }
  };
  const handleCargarClavePrivada = async () => {
    console.log('handleCargarClavePrivada - Iniciando...');
      if (!clavePrivadaFile) {
      showNotification('Selecciona tu archivo de clave privada', 'error');
      return;
    }

    try {
      console.log('Leyendo archivo de clave privada...');
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        console.log('Archivo leído exitosamente');
        const clavePrivadaPem = e.target.result;
        console.log('Clave privada PEM length:', clavePrivadaPem?.length);
        
        setClavePrivadaAdmin(clavePrivadaPem);
        setShowClavePrivadaModal(false);
        setClavePrivadaFile(null);
        
        console.log('Clave privada guardada, cerrando modal...');
        
        // Si había un condómino pendiente, procesar ahora
        if (pendienteCondomino) {
          console.log('Procesando condómino pendiente:', pendienteCondomino.nombre);
          // Llamar directamente a la función de descifrado sin verificar la clave otra vez
          await procesarEstadoCuenta(pendienteCondomino, clavePrivadaPem);
          setPendienteCondomino(null);
        }
      };
        reader.onerror = (error) => {
        console.error('Error al leer el archivo:', error);
        showNotification('Error al leer el archivo de clave privada', 'error');
      };
      
      reader.readAsText(clavePrivadaFile);    } catch (err) {
      console.error('Error en handleCargarClavePrivada:', err);
      showNotification('Error al leer la clave privada: ' + err.message, 'error');
    }
  };
  // Función auxiliar para procesar el estado de cuenta
  const procesarEstadoCuenta = async (condomino, clavePrivada) => {
    try {
      console.log('procesarEstadoCuenta - Iniciando para:', condomino.nombre);      console.log('Longitud de clave privada:', clavePrivada?.length);
      console.log('Primeros 50 caracteres de la clave:', clavePrivada?.substring(0, 50));

      const response = await adminApi.adminDescifrarEstado(
        selectedCondominio.id, 
        condomino.id, 
        clavePrivada
      );      console.log('Estado de cuenta descargado exitosamente');
      console.log('Tipo de response.data:', typeof response.data);
      console.log('Tamaño de response.data:', response.data?.size || response.data?.length);
      
      // Crear blob y URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      console.log('Blob creado, tamaño:', blob.size);
      
      const url = URL.createObjectURL(blob);
      console.log('URL del blob creada:', url);
        setEstadoCuentaPdf(url);
      setShowEstadoCuentaModal(true);
      showNotification('Estado de cuenta cargado exitosamente', 'success');
      
    } catch (err) {
      console.error('Error al obtener estado de cuenta:', err);
      showNotification('Error al obtener estado de cuenta: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  // Función para abrir modal de firmar comprobante
  const handleFirmarComprobante = (condomino) => {
    setSelectedCondomino(condomino);
    setFirmarComprobanteForm({
      archivo: null,
      motivo: '',
      clavePrivada: null
    });
    setShowFirmarComprobanteModal(true);
  };

  // Función para procesar firma de comprobante
  const handleProcesarFirmaComprobante = async (e) => {
    e.preventDefault();
      if (!firmarComprobanteForm.archivo) {
      showNotification('Por favor selecciona un archivo PDF', 'error');
      return;
    }
    
    if (!firmarComprobanteForm.motivo.trim()) {
      showNotification('Por favor ingresa el motivo del comprobante', 'error');
      return;
    }
    
    if (!firmarComprobanteForm.clavePrivada) {
      showNotification('Por favor selecciona tu archivo de clave privada', 'error');
      return;
    }

    try {
      
      // Leer el contenido del archivo de clave privada
      const privateKeyContent = await firmarComprobanteForm.clavePrivada.text();
      
      // Crear FormData para enviar los datos
      const formData = new FormData();
      formData.append('comprobante', firmarComprobanteForm.archivo);
      formData.append('motivo', firmarComprobanteForm.motivo);
      formData.append('clave_privada', privateKeyContent);
      formData.append('id_condominio', selectedCondominio.id);
      formData.append('id_condomino', selectedCondomino.id);

      const response = await fetch('/admin/comprobante/firmar', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });      if (response.ok) {
        // Si la respuesta es exitosa, mostrar mensaje de confirmación
        const result = await response.json();
        
        // Cerrar todos los modales para que el mensaje sea visible
        cerrarModales();
        setShowCondominoModal(false);
        setShowViewModal(false);
        
        // Mostrar notificación flotante de éxito
        showNotification(
          `✅ Comprobante firmado exitosamente para ${result.condomino}. Motivo: ${result.motivo}`, 
          'success'
        );
        
      } else {
        const error = await response.json();
        
        // Cerrar modales en caso de error
        cerrarModales();
        setShowCondominoModal(false);
        setShowViewModal(false);
        
        // Mostrar notificación flotante de error
        showNotification(
          'Error al firmar comprobante: ' + (error.error || 'Error desconocido'), 
          'error'
        );
      }
        } catch (err) {
      console.error('Error al firmar comprobante:', err);
      
      // Cerrar modales en caso de error
      cerrarModales();
      setShowCondominoModal(false);
      setShowViewModal(false);
      
      // Mostrar notificación flotante de error
      showNotification('Error al firmar comprobante: ' + err.message, 'error');
    }
  };

  // Función para cerrar modales y limpiar estado
  const cerrarModales = () => {
    setShowEstadoCuentaModal(false);
    setShowFirmarComprobanteModal(false);
    setShowClavePrivadaModal(false);
    setEstadoCuentaPdf(null);
    setClavePrivadaFile(null);
    setFirmarComprobanteForm({
      archivo: null,
      motivo: '',
      clavePrivada: null
    });
    setPendienteCondomino(null);
    setIframeLoaded(false);
    setIframeError(false);  };

  // Detectar si el iframe no carga el PDF después de 3 segundos
  useEffect(() => {
    if (estadoCuentaPdf && !iframeLoaded && !iframeError) {
      const timer = setTimeout(() => {
        console.log('PDF iframe no cargó en 3 segundos, mostrando alternativa');
        setIframeError(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [estadoCuentaPdf, iframeLoaded, iframeError]);
  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Bienvenido {user?.nombre}</h2>

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
            </div>            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => handleVerEstadoCuenta(selectedCondomino)}
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
              </button>              <button
                onClick={() => handleFirmarComprobante(selectedCondomino)}
                style={{ 
                  background: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 12px', 
                  borderRadius: '4px', 
                  cursor: 'pointer'
                }}
              >
                Firmar Comprobante
              </button>
            </div>            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

      {/* Modal para ver estado de cuenta */}
      {showEstadoCuentaModal && estadoCuentaPdf && (
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
          zIndex: 1002
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '80%',
            height: '80%',
            maxWidth: '900px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Estado de Cuenta - {selectedCondomino?.nombre}</h3>
              <button
                onClick={cerrarModales}
                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>            <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
              {/* Mensaje de carga */}
              {!iframeLoaded && !iframeError && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <p>Cargando estado de cuenta...</p>
                </div>
              )}
              
              {/* Mensaje de error/fallback */}
              {iframeError && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  <p>No se puede mostrar el PDF en el navegador.</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    El estado de cuenta se ha cargado correctamente pero tu navegador no puede mostrarlo.
                  </p>
                </div>
              )}
              
              {/* iframe para mostrar PDF */}
              <iframe
                src={estadoCuentaPdf}
                width="100%"
                height="100%"
                title="Estado de Cuenta"
                style={{ 
                  border: 'none', 
                  borderRadius: '4px',
                  display: iframeError ? 'none' : 'block'
                }}
                onLoad={() => {
                  console.log('PDF iframe cargado');
                  setIframeLoaded(true);
                }}
                onError={(e) => {
                  console.error('Error cargando PDF iframe:', e);
                  setIframeError(true);
                }}
              />
            </div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={cerrarModales}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}      {/* Modal para cargar clave privada del admin */}
      {showClavePrivadaModal && (
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
          zIndex: 1003
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3>Clave Privada Requerida</h3>
            <p>Para descifrar el estado de cuenta, necesitas proporcionar tu clave privada de administrador.</p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Seleccionar archivo de clave privada (.pem):
              </label>
              <input
                type="file"
                accept=".pem"
                onChange={handleClavePrivadaChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCargarClavePrivada}
                disabled={!clavePrivadaFile}
                style={{ 
                  padding: '8px 16px', 
                  background: !clavePrivadaFile ? '#6c757d' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: !clavePrivadaFile ? 'not-allowed' : 'pointer' 
                }}
              >
                Cargar Clave
              </button>
              <button
                onClick={cerrarModales}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cargar clave privada del admin */}
      {showClavePrivadaModal && (
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
          zIndex: 1003
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3>Clave Privada Requerida</h3>
            <p>Para descifrar el estado de cuenta, necesitas proporcionar tu clave privada de administrador.</p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Seleccionar archivo de clave privada (.pem):
              </label>
              <input
                type="file"
                accept=".pem"
                onChange={handleClavePrivadaChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCargarClavePrivada}
                disabled={!clavePrivadaFile}
                style={{ 
                  padding: '8px 16px', 
                  background: !clavePrivadaFile ? '#6c757d' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: !clavePrivadaFile ? 'not-allowed' : 'pointer' 
                }}
              >
                Cargar Clave
              </button>
              <button
                onClick={cerrarModales}
                style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>      )}      {/* Modal para firmar comprobante */}
      {showFirmarComprobanteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1004
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3>Firmar Comprobante de Pago</h3>
            <p><strong>Condómino:</strong> {selectedCondomino?.nombre}</p>
            
            <form onSubmit={handleProcesarFirmaComprobante}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Archivo PDF del Comprobante:
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFirmarComprobanteForm({
                    ...firmarComprobanteForm,
                    archivo: e.target.files[0]
                  })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Motivo del Comprobante:
                </label>
                <textarea
                  value={firmarComprobanteForm.motivo}
                  onChange={(e) => setFirmarComprobanteForm({
                    ...firmarComprobanteForm,
                    motivo: e.target.value
                  })}
                  required
                  placeholder="Describe el motivo o concepto del comprobante de pago..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Tu Clave Privada (archivo .pem):
                </label>
                <input
                  type="file"
                  accept=".pem"
                  onChange={(e) => setFirmarComprobanteForm({
                    ...firmarComprobanteForm,
                    clavePrivada: e.target.files[0]
                  })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
                <small style={{ color: '#666' }}>
                  Se necesita tu clave privada para firmar el comprobante
                </small>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Firmar Comprobante
                </button>
                <button
                  type="button"
                  onClick={() => setShowFirmarComprobanteModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>        </div>
      )}

      {/* Modal de Notificación Flotante */}
      {showNotificationModal && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          backgroundColor: notificationData.type === 'success' ? '#d4edda' : '#f8d7da',
          color: notificationData.type === 'success' ? '#155724' : '#721c24',
          padding: '20px 25px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: `2px solid ${notificationData.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          fontSize: '16px',
          fontWeight: '500',          maxWidth: '400px',
          transition: 'all 0.4s ease-out',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, marginRight: '10px' }}>
              {notificationData.message}
            </div>
            <button
              onClick={() => setShowNotificationModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: notificationData.type === 'success' ? '#155724' : '#721c24',
                padding: '0',
                marginLeft: '10px',
                opacity: 0.7,
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => e.target.style.opacity = '1'}
              onMouseOut={(e) => e.target.style.opacity = '0.7'}            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
}