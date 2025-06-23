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
  const [clavePrivadaAdmin, setClavePrivadaAdmin] = useState(null);  const [clavePrivadaFile, setClavePrivadaFile] = useState(null);
  const [pendienteCondomino, setPendienteCondomino] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);  const [iframeError, setIframeError] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

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
      const result = await adminApi.listarCondominios();
      setData(result);
    } catch (err) {
      console.error('Error al cargar condominios:', err);
      showNotification('Error al cargar condominios: ' + (err.response?.data?.error || err.message || 'Error desconocido'), 'error');
    } finally {
      setLoading(false);
    }
  };// Función para crear condominio
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
    }  };
  // Función para copiar código al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(text);
      showNotification('Código copiado al portapapeles', 'success');
      // Resetear el estado después de 2 segundos
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    }).catch(() => {
      showNotification('No se pudo copiar el código', 'error');
    });
  };

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

      const response = await fetch('http://3.135.218.132:5000/api/admin/comprobante/firmar', {
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
    });    setPendienteCondomino(null);
    setIframeLoaded(false);
    setIframeError(false);
  };

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
  return (    <div style={{ padding: '20px', maxWidth: '100%', overflow: 'hidden' }}>      <div className="dashboard-container" style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '0 40px' 
      }}>
        {/* Contenedor para alejar del borde los textos principales */}
        <div style={{ 
          maxWidth: '1000px', 
          margin: '0 auto',
          padding: '0 20px'
        }}>          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: 'clamp(20px, 5vw, 28px)',
            marginBottom: '20px',
            marginTop: '30px'
          }}>
            Bienvenido {user?.nombre}
          </h2>

          {/* Header con título y botón de crear */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '30px',
            marginTop: '20px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h3 style={{ 
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: 'clamp(18px, 4vw, 24px)'
            }}>
              Mis Condominios
            </h3>            <button 
              className="btn"
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'var(--button-success)', 
                color: 'white',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Crear Condominio
            </button>
          </div>
        </div>
          {/* Tabla de condominios con diseño mejorado */}      <div className="responsive-table-container" style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        borderRadius: '12px', 
        boxShadow: '0 4px 20px var(--shadow-light)',
        border: '1px solid var(--border-color)',
        maxWidth: '1200px',
        margin: '0 auto',
        overflowX: 'auto'
      }}>
        <table className="responsive-table" style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          backgroundColor: 'transparent',
          minWidth: '800px'
        }}>
          <thead>            <tr style={{ 
              backgroundColor: 'var(--header-bg)',
              borderBottom: '2px solid var(--border-color)'
            }}>
              <th style={{
                padding: '16px 20px',
                textAlign: 'left',
                fontWeight: '700',
                fontSize: '14px',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRight: '1px solid var(--border-color)'
              }}>
                Condominio
              </th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '14px',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRight: '1px solid var(--border-color)'
              }}>
                Condóminos
              </th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '14px',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRight: '1px solid var(--border-color)'
              }}>
                Código
              </th>
              <th style={{
                padding: '16px 20px',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '14px',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Operaciones
              </th>
            </tr>
          </thead><tbody>
            {data.map((c, index) => (              <tr key={c.id} style={{
                backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--row-alt-bg)',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--row-hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : 'var(--row-alt-bg)';
              }}
              >
                <td style={{
                  padding: '16px 20px',
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  borderRight: '1px solid var(--border-color)'
                }}>
                  {c.nombre}
                </td>
                <td style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  borderRight: '1px solid var(--border-color)'
                }}>                  <span style={{
                    backgroundColor: 'var(--badge-bg)',
                    color: 'var(--badge-text)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '15px',
                    fontWeight: '700',
                    border: '2px solid var(--badge-text)',
                    boxShadow: '0 2px 8px rgba(125, 209, 129, 0.2)'
                  }}>
                    {c.num_usuarios}
                  </span>
                </td>                <td style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  borderRight: '1px solid var(--border-color)'
                }}>
                  <span 
                    onClick={() => copyToClipboard(c.codigo)}
                    style={{ 
                      fontFamily: 'Monaco, "Lucida Console", monospace',
                      backgroundColor: copiedCode === c.codigo ? 'var(--badge-bg)' : 'var(--code-bg)',
                      color: copiedCode === c.codigo ? 'var(--badge-text)' : 'var(--code-text)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: copiedCode === c.codigo ? '2px solid var(--badge-text)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'inline-block',
                      userSelect: 'none',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (copiedCode !== c.codigo) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        e.target.style.backgroundColor = 'var(--row-hover-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (copiedCode !== c.codigo) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                        e.target.style.backgroundColor = 'var(--code-bg)';
                      }
                    }}
                    title={copiedCode === c.codigo ? "¡Copiado!" : "Clic para copiar código"}
                  >
                    {copiedCode === c.codigo ? '✓ Copiado' : c.codigo}
                  </span>
                </td><td style={{
                  padding: '16px 20px',
                  textAlign: 'center'
                }}>                  <div className="button-group" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                      className="btn"
                      onClick={() => {
                        setUploadForm({ ...uploadForm, condominioId: c.id });
                        setShowUploadModal(true);
                      }}
                      style={{
                        background: 'var(--button-success)', 
                        color: 'white',
                        fontSize: '13px',
                        padding: '8px 12px'
                      }}
                    >
                      📄 Balance
                    </button>
                    <button 
                      className="btn"
                      onClick={() => {
                        setEditForm({ id: c.id, nombre: c.nombre, direccion: c.direccion || '' });
                        setShowEditModal(true);
                      }}
                      style={{
                        background: 'var(--color-secondary)', 
                        color: 'white',
                        fontSize: '13px',
                        padding: '8px 12px'
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn"
                      onClick={() => handleViewCondominos(c)}
                      style={{
                        background: 'var(--color-secondary)', 
                        color: 'white',
                        fontSize: '13px',
                        padding: '8px 12px'
                      }}
                    >
                      👥 Ver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>      {/* Modal para crear condominio */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Crear Nuevo Condominio</h3>
            </div>
            <form onSubmit={handleCreateCondominio}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-label">Nombre:</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Dirección:</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={createForm.direccion}
                    onChange={(e) => setCreateForm({ ...createForm, direccion: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn modal-btn-danger"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="modal-btn modal-btn-primary"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}      {/* Modal para editar condominio */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Editar Condominio</h3>
            </div>
            <form onSubmit={handleEditCondominio}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-label">Nombre:</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Dirección:</label>
                  <input
                    type="text"
                    className="modal-input"
                    value={editForm.direccion}
                    onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn modal-btn-danger"
                  onClick={() => setShowEditModal(false)}
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="modal-btn modal-btn-primary"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}      {/* Modal para subir balance general */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Subir Balance General</h3>
            </div>
            <form onSubmit={handleUploadBalance}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-label">Archivo PDF:</label>
                  <input
                    type="file"
                    accept=".pdf"
                    className="modal-input"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                    required
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Archivo de Clave Privada (.pem):</label>
                  <input
                    type="file"
                    accept=".pem,.key"
                    className="modal-input"
                    onChange={(e) => setUploadForm({ ...uploadForm, privateKeyFile: e.target.files[0] })}
                    required
                  />
                  <small style={{ color: 'var(--color-textSecondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Selecciona tu archivo de clave privada (.pem) para firmar digitalmente el balance general
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn modal-btn-danger"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({ condominioId: '', file: null, privateKeyFile: null });
                  }}
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="modal-btn modal-btn-primary"
                >
                  Subir Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}      {/* Modal para ver condóminos */}
      {showViewModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px', maxHeight: '80%', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Condóminos de {selectedCondominio?.nombre}</h3>
            </div>            <div className="modal-body">
              <div className="responsive-table-container">
                <table className="responsive-table modal-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {condominos.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-textSecondary)' }}>
                          No hay condóminos en este condominio
                        </td>
                      </tr>
                    ) : (
                      condominos.map(condomino => (
                        <tr key={condomino.id}>
                          <td>{condomino.nombre}</td>
                          <td>{condomino.correo}</td>                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn"
                              onClick={() => {
                                setSelectedCondomino(condomino);
                                setShowCondominoModal(true);
                              }}
                              style={{ 
                                background: 'var(--color-secondary)', 
                                color: 'white',
                                fontSize: '12px',
                                padding: '6px 12px'
                              }}
                            >
                              Detalle
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-danger"
                onClick={() => setShowViewModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}      {/* Modal para detalles del condómino */}
      {showCondominoModal && selectedCondomino && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Detalles de {selectedCondomino.nombre}</h3>
            </div>
            <div className="modal-body">
              <div className="modal-form-group">
                <p style={{ color: 'var(--color-text)', marginBottom: '8px' }}>
                  <strong>Nombre:</strong> {selectedCondomino.nombre}
                </p>
                <p style={{ color: 'var(--color-text)', marginBottom: '16px' }}>
                  <strong>Correo:</strong> {selectedCondomino.correo}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleVerEstadoCuenta(selectedCondomino)}
                  className="modal-btn modal-btn-primary"
                  style={{ flex: '1', minWidth: '150px' }}
                >
                  Ver Estado de Cuenta
                </button>                <button
                  onClick={() => handleFirmarComprobante(selectedCondomino)}
                  className="modal-btn modal-btn-primary"
                  style={{ flex: '1', minWidth: '150px' }}
                >
                  Firmar Comprobante
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-danger"
                onClick={() => setShowCondominoModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}      {/* Modal para ver estado de cuenta */}
      {showEstadoCuentaModal && estadoCuentaPdf && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            width: '80%',
            height: '80%',
            maxWidth: '900px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="modal-header">
              <h3 className="modal-title">Estado de Cuenta - {selectedCondomino?.nombre}</h3>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0 }}>
              <div style={{ 
                height: '450px', 
                border: '1px solid var(--color-border)', 
                borderRadius: '8px', 
                position: 'relative', 
                overflow: 'hidden',
                backgroundColor: 'var(--color-background)'
              }}>
                {/* Mensaje de carga */}
                {!iframeLoaded && !iframeError && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'var(--color-text)'
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
                    padding: '20px',
                    color: 'var(--color-text)'
                  }}>
                    <p>No se puede mostrar el PDF en el navegador.</p>
                    <p style={{ fontSize: '14px', color: 'var(--color-textSecondary)' }}>
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
                    borderRadius: '8px',
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
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-danger"
                onClick={cerrarModales}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>      )}
      {/* Modal para cargar clave privada del admin */}
      {showClavePrivadaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Clave Privada Requerida</h3>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--color-text)', marginBottom: '16px' }}>
                Para descifrar el estado de cuenta, necesitas proporcionar tu clave privada de administrador.
              </p>
              <div className="modal-form-group">
                <label className="modal-label">
                  Seleccionar archivo de clave privada (.pem):
                </label>
                <input
                  type="file"
                  accept=".pem"
                  className="modal-input"
                  onChange={handleClavePrivadaChange}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-danger"
                onClick={cerrarModales}
              >
                Cerrar
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={handleCargarClavePrivada}
                disabled={!clavePrivadaFile}
                style={{ 
                  opacity: !clavePrivadaFile ? 0.6 : 1,
                  cursor: !clavePrivadaFile ? 'not-allowed' : 'pointer' 
                }}
              >
                Cargar Clave
              </button>
            </div>
          </div>
        </div>
      )}{/* Modal para firmar comprobante */}
      {showFirmarComprobanteModal && (        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '500px', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Firmar Comprobante de Pago</h3>
              <p style={{ color: 'var(--color-text)', margin: '8px 0 0 0' }}>
                <strong>Condómino:</strong> {selectedCondomino?.nombre}
              </p>
            </div>
            
            <form onSubmit={handleProcesarFirmaComprobante}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-label">Archivo PDF del Comprobante:</label>
                  <input
                    type="file"
                    accept=".pdf"
                    className="modal-input"
                    onChange={(e) => setFirmarComprobanteForm({
                      ...firmarComprobanteForm,
                      archivo: e.target.files[0]
                    })}
                    required
                  />
                </div>              <div className="modal-form-group">
                <label className="modal-label">Motivo del Comprobante:</label>
                <textarea
                  className="modal-input"
                  value={firmarComprobanteForm.motivo}
                  onChange={(e) => setFirmarComprobanteForm({
                    ...firmarComprobanteForm,
                    motivo: e.target.value
                  })}
                  required
                  placeholder="Describe el motivo o concepto del comprobante de pago..."
                  rows="3"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Tu Clave Privada (archivo .pem):</label>
                <input
                  type="file"
                  accept=".pem"
                  className="modal-input"
                  onChange={(e) => setFirmarComprobanteForm({
                    ...firmarComprobanteForm,
                    clavePrivada: e.target.files[0]
                  })}
                  required
                />
                <small style={{ color: 'var(--color-textSecondary)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  Se necesita tu clave privada para firmar el comprobante
                </small>
              </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn modal-btn-danger"
                  onClick={() => setShowFirmarComprobanteModal(false)}
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="modal-btn modal-btn-primary"
                >
                  Firmar Comprobante
                </button>
              </div>
            </form>
          </div>
        </div>
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
                fontWeight: 'bold'              }}              onMouseOver={(e) => e.target.style.opacity = '1'}
              onMouseOut={(e) => e.target.style.opacity = '0.7'}
            >
              ×
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}