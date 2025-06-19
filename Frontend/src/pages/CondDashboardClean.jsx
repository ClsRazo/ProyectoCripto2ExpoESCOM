import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as condominioApi from '../api/condominio';
import * as adminApi from '../api/admin';

export default function CondDashboard() {
  const { user } = useAuth();
  const [condominio, setCondominio] = useState(null);
  const [condominios, setCondominios] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
    // Estados para modales
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showComprobantesModal, setShowComprobantesModal] = useState(false);
  const [showVerificarComprobanteModal, setShowVerificarComprobanteModal] = useState(false);
    // Estados para formularios
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Estados para el proceso de unirse al condominio
  const [joinStep, setJoinStep] = useState(1); // 1: código, 2: archivos
  const [validatedCondominio, setValidatedCondominio] = useState(null);
  const [estadoCuentaFile, setEstadoCuentaFile] = useState(null);
  const [joinPrivateKeyFile, setJoinPrivateKeyFile] = useState(null);
  
  // Estados para documentos
  const [currentPdf, setCurrentPdf] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  
  // Estados para comprobantes
  const [comprobantes, setComprobantes] = useState([]);
  const [verificacionResultado, setVerificacionResultado] = useState(null);
  const [archivoVerificar, setArchivoVerificar] = useState(null);

  // Estados para modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener información actual del condómino
      const condominoInfo = await condominioApi.getCondominoInfo();
      
      if (condominoInfo.condominio) {
        // El condómino pertenece a un condominio
        setCondominio(condominoInfo.condominio);
        
        // Cargar lista de condóminos y admin
        const membersData = await condominioApi.getMiembrosCondominio(condominoInfo.condominio.id);
        setCondominios(membersData.condominos || []);
        setAdmin(membersData.admin);
      } else {
        // El condómino no pertenece a ningún condominio
        setCondominio(null);
        setCondominios([]);
        setAdmin(null);
      }
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };
  const handleJoinCondominio = async () => {
    try {
      setError('');
      
      if (joinStep === 1) {
        // Paso 1: Validar código
        if (!joinCode.trim()) {
          setError('Ingresa el código del condominio');
          return;
        }
        
        console.log('Validando código:', joinCode);
        const validation = await condominioApi.validateCondominioCode(joinCode);
        
        if (validation.valid) {
          if (validation.alreadyMember) {
            setError(validation.error);
            return;
          }
          
          setValidatedCondominio(validation.condominio);
          setJoinStep(2); // Pasar al paso 2
          setMessage(`¡Código válido! Condominio: ${validation.condominio.nombre}`);
        } else {
          setError(validation.error || 'Código inválido');
        }
      } else if (joinStep === 2) {
        // Paso 2: Subir archivos y completar unión
        if (!estadoCuentaFile) {
          setError('Selecciona tu estado de cuenta');
          return;
        }
        if (!joinPrivateKeyFile) {
          setError('Selecciona tu clave privada');
          return;
        }
        
        console.log('Completando unión al condominio...');
        const result = await condominioApi.unirseCondominio(joinCode, estadoCuentaFile, joinPrivateKeyFile);
        
        setMessage(result.message || '¡Te has unido exitosamente al condominio!');
        
        // Resetear formulario y cerrar modal
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinStep(1);
          setJoinCode('');
          setEstadoCuentaFile(null);
          setJoinPrivateKeyFile(null);
          setValidatedCondominio(null);
          setError('');
          setMessage('');
            // Recargar datos del condominio
          loadDashboardData();
        }, 2000);
      }
    } catch (err) {
      console.error('Error al unirse al condominio:', err);
      setError(err.response?.data?.error || err.message || 'Error al unirse al condominio');
    }
  };

  // Función para resetear el modal de unirse
  const resetJoinModal = () => {
    setShowJoinModal(false);
    setJoinStep(1);
    setJoinCode('');
    setEstadoCuentaFile(null);
    setJoinPrivateKeyFile(null);
    setValidatedCondominio(null);
    setError('');
    setMessage('');
  };
  const handleViewBalanceGeneral = async () => {
    try {
      setError('');
      console.log('=== handleViewBalanceGeneral iniciado ===');
      console.log('Condominio actual:', condominio);
      console.log('ID del condominio:', condominio?.id);
      
      if (!condominio?.id) {
        console.error('No hay ID de condominio disponible');
        setError('No perteneces a ningún condominio');
        return;
      }
      
      console.log('Llamando a getBalanceGeneral con ID:', condominio.id);
      const balanceData = await condominioApi.getBalanceGeneral(condominio.id);
      console.log('Datos del balance recibidos:', balanceData);
      
      if (balanceData.firmaValida) {
        setCurrentPdf(balanceData.pdfUrl);
        setPdfTitle('Balance General');
        setShowPdfViewer(true);
        console.log('Modal PDF abierto con URL:', balanceData.pdfUrl);
      } else {
        console.error('Firma del balance no válida');
        setError('La firma del balance general no es válida');
      }
    } catch (err) {
      console.error('Error al obtener balance general:', err);
      setError('Error al obtener el balance general: ' + (err.message || 'Error desconocido'));
    }
  };
  const handleViewComprobantes = async () => {
    try {
      setError('');
      setMessage('Cargando comprobantes...');
      console.log('Solicitando comprobantes para condominio:', condominio.id, 'usuario:', user.id);

      const result = await adminApi.listarComprobantes(condominio.id, user.id);
      console.log('Respuesta del backend:', result);
      console.log('Comprobantes recibidos:', result.comprobantes);
      setComprobantes(result.comprobantes || []);
      setShowComprobantesModal(true);
      setMessage('');
      
    } catch (err) {
      console.error('Error al cargar comprobantes:', err);
      console.error('Respuesta del error:', err.response?.data);
      setError('Error al cargar comprobantes: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleVerificarComprobante = async () => {
    if (!archivoVerificar) {
      setError('Selecciona un archivo PDF');
      return;
    }

    try {
      setError('');
      setMessage('Verificando comprobante...');

      const formData = new FormData();
      formData.append('comprobante', archivoVerificar);
      formData.append('id_condomino', user.id);

      const response = await fetch('http://3.136.236.195:5000/api/admin/comprobante/verificar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        setVerificacionResultado(result);
        setMessage('Verificación completada');
      } else {
        setError('Error en la verificación: ' + result.error);
      }
      
    } catch (err) {
      console.error('Error al verificar comprobante:', err);
      setError('Error al verificar comprobante: ' + err.message);
    }
  };  const handleEstadoCuenta = async () => {
    try {
      setError('');
      console.log('=== handleEstadoCuenta iniciado ===');
      console.log('privateKeyFile:', privateKeyFile);
      
      if (!privateKeyFile) {
        setError('Por favor selecciona tu clave privada');
        return;
      }

      if (privateKeyFile.size === 0) {
        setError('El archivo de clave privada está vacío');
        return;
      }

      console.log('Validación pasada, llamando a condominioApi.getEstadoCuenta...');
      const estadoData = await condominioApi.getEstadoCuenta(privateKeyFile);
      
      console.log('Respuesta recibida de API:', estadoData);
      
      if (estadoData.pdfUrl) {
        setCurrentPdf(estadoData.pdfUrl);
        setPdfTitle('Estado de Cuenta');
        setShowPdfViewer(true);
        setShowEstadoModal(false); // Cerrar el modal de carga
        console.log('✓ Estado de cuenta cargado exitosamente');
      } else {
        setError('No se pudo obtener el estado de cuenta');
      }
    } catch (err) {
      console.error('Error al obtener estado de cuenta:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      });
      setError('Error al obtener el estado de cuenta: ' + (err.message || 'Error desconocido'));
    }
  };

  // Función para mostrar confirmación
  const showConfirmation = (title, message, action) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  if (loading) {
    return (
      <div className="condomino-layout">
        <div className="condomino-sidebar">
          <div className="sidebar-simple">
            <div className="sidebar-header">
              <h3 className="condomino-title">🏠 Cargando...</h3>
            </div>
          </div>
        </div>
        <div className="condomino-main">
          <div className="condomino-content">
            <div className="loading-container">
              <div className="loading">Cargando dashboard...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="condomino-layout">      {/* Sidebar izquierda - 20% - Con título, admin, miembros y botón unirse */}
      <div className="condomino-sidebar">
        <div className="sidebar-simple">
          <div className="sidebar-header">
            <h3 className="condomino-title">🏠 {condominio ? condominio.nombre : 'Sin Condominio'}</h3>
          </div>
          
          {/* Información del condominio dentro del sidebar */}
          {condominio && (
            <div className="sidebar-info">
              {admin && (
                <div className="info-section">
                  <h4>👑 Administrador</h4>
                  <div className="admin-card">
                    <div className="admin-info">
                      <span className="admin-name">👤 {admin.nombre}</span>                      <button 
                        onClick={() => setSelectedAdmin(admin)} 
                        className="btn btn-primary btn-sm"
                      >
                        Ver opciones
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {condominios.length > 0 && (
                <div className="info-section">
                  <h4>👥 Miembros del condominio</h4>
                  <div className="members-list">
                    {condominios.map(condomino => (
                      <div key={condomino.id} className="member-card">
                        <span>👤 {condomino.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="sidebar-footer">
            {!condominio && (
              <button 
                className="btn btn-secondary btn-full"
                onClick={() => setShowJoinModal(true)}
              >
                ➕ Unirse a Condominio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Área principal derecha - 80% */}
      <div className="condomino-main">
        <div className="condomino-content">          {selectedAdmin ? (
            <div className="card">
              <div className="card-header">
                <h2 className="condomino-title">Detalles del Administrador</h2>
              </div>
              <div className="card-body">
                {/* Datos del administrador */}
                <div className="admin-details-grid">
                  <div className="detail-card">
                    <div className="detail-label">Nombre:</div>
                    <div className="detail-value">{selectedAdmin.nombre}</div>
                  </div>
                  <div className="detail-card">
                    <div className="detail-label">Correo:</div>
                    <div className="detail-value">{selectedAdmin.correo || 'No disponible'}</div>
                  </div>
                  <div className="detail-card">
                    <div className="detail-label">Rol:</div>
                    <div className="detail-value">Administrador</div>
                  </div>
                </div>
                  {/* Botones de acciones */}
                <div className="admin-buttons-grid">
                  <button onClick={() => setShowEstadoModal(true)} className="btn btn-primary">
                    📄 Estado de cuenta
                  </button>
                  <button onClick={handleViewBalanceGeneral} className="btn btn-primary">
                    📊 Balance general
                  </button>                  <button onClick={handleViewComprobantes} className="btn btn-info">
                    📋 Ver comprobantes
                  </button>
                  <button onClick={() => setShowVerificarComprobanteModal(true)} className="btn btn-success">
                    ✅ Verificar comprobante
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h2 className="condomino-title">🏠 Bienvenido, {user.nombre}</h2>
              </div>
              <div className="card-body">
                {condominio ? (
                  <>
                    <p>Has sido autenticado correctamente en tu condominio <strong>{condominio.nombre}</strong>.</p>
                    <div className="instruction-message">
                      <p className="text-center">
                        <em>💡 Da clic en el administrador del menú lateral para ver las opciones disponibles.</em>
                      </p>
                    </div>
                  </>                ) : (
                  <div className="text-center">
                    <p>No perteneces a ningún condominio todavía.</p>
                    <p>Para acceder a las funciones del sistema, primero debes unirte a un condominio.</p>
                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowJoinModal(true)}
                        style={{ minWidth: '200px', padding: '12px 24px' }}
                      >
                        Unirse a Condominio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>      {/* Modal para unirse a condominio */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-standard">            <div className="modal-header">
              <h3>🏠 Unirse a Condominio {joinStep === 2 && `- ${validatedCondominio?.nombre}`}</h3>
            </div><div className="modal-body">
              {joinStep === 1 ? (
                // Paso 1: Validar código
                <>
                  <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
                    Ingresa el código único de tu condominio para unirte. Este código te debe ser proporcionado por tu administrador.
                  </p>
                  <div className="form-group">
                    <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      Código del Condominio:
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Ej: COND-2024-001"
                      className="form-control"
                      style={{
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-surface)',
                        transition: 'all 0.3s ease',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        letterSpacing: '1px'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-secondary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(125, 209, 129, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--color-border)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <small style={{ 
                      display: 'block', 
                      marginTop: '8px', 
                      color: 'var(--color-text-secondary)', 
                      fontSize: '12px',
                      textAlign: 'center'
                    }}>
                      💡 El código distingue entre mayúsculas y minúsculas
                    </small>
                  </div>
                </>
              ) : (
                // Paso 2: Subir archivos
                <>
                  <div style={{ 
                    marginBottom: '20px', 
                    padding: '12px', 
                    backgroundColor: 'var(--color-surface)', 
                    borderRadius: '8px',
                    border: '1px solid var(--color-secondary)' 
                  }}>
                    <p style={{ margin: '0', color: 'var(--color-secondary)', fontWeight: '600' }}>
                      ✅ Código validado para: {validatedCondominio?.nombre}
                    </p>
                  </div>
                  
                  <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
                    Ahora necesitas subir tu estado de cuenta y clave privada para completar el proceso de unión.
                  </p>
                  
                  <div className="form-group">
                    <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      Estado de Cuenta (PDF):
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setEstadoCuentaFile(e.target.files[0])}
                      className="form-control"
                      style={{ padding: '8px 12px' }}
                    />
                    <small style={{ 
                      display: 'block', 
                      marginTop: '4px', 
                      color: 'var(--color-text-secondary)', 
                      fontSize: '12px'
                    }}>
                      📄 Selecciona tu estado de cuenta en formato PDF
                    </small>
                  </div>
                  
                  <div className="form-group">
                    <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                      Clave Privada:
                    </label>
                    <input
                      type="file"
                      accept=".pem,.key,.txt"
                      onChange={(e) => setJoinPrivateKeyFile(e.target.files[0])}
                      className="form-control"
                      style={{ padding: '8px 12px' }}
                    />
                    <small style={{ 
                      display: 'block', 
                      marginTop: '4px', 
                      color: 'var(--color-text-secondary)', 
                      fontSize: '12px'
                    }}>
                      🔑 Archivo con tu clave privada (.pem, .key, .txt)
                    </small>
                  </div>
                </>
              )}
              
              {message && (
                <div style={{ 
                  marginTop: '16px',
                  padding: '12px', 
                  backgroundColor: 'rgba(125, 209, 129, 0.1)', 
                  border: '1px solid var(--color-secondary)',
                  borderRadius: '6px',
                  color: 'var(--color-secondary)'
                }}>
                  {message}
                </div>
              )}
              
              {error && (
                <div style={{ 
                  marginTop: '16px',
                  padding: '12px', 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid var(--color-error)',
                  borderRadius: '6px',
                  color: 'var(--color-error)'
                }}>
                  {error}
                </div>
              )}
            </div>            <div className="modal-footer">
              <button onClick={resetJoinModal} className="btn btn-danger">
                Cerrar
              </button>
              {joinStep === 2 && (
                <button 
                  onClick={() => setJoinStep(1)} 
                  className="btn btn-secondary"
                >
                  ← Volver
                </button>
              )}
              <button onClick={handleJoinCondominio} className="btn btn-primary">
                {joinStep === 1 ? 'Validar Código' : 'Completar Unión'}
              </button>
            </div>
          </div>
        </div>
      )}      {/* Modal para estado de cuenta */}
      {showEstadoModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-standard">            <div className="modal-header">
              <h3>📄 Estado de Cuenta</h3>
            </div><div className="modal-body">
              <p>Para acceder a tu estado de cuenta, necesitas proporcionar tu clave privada.</p>
              <div className="form-group">
                <label>Clave Privada:</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    console.log('Archivo seleccionado:', file);
                    console.log('Nombre:', file?.name);
                    console.log('Tipo:', file?.type);
                    console.log('Tamaño:', file?.size);
                    setPrivateKeyFile(file);
                  }}
                  className="form-control"
                  accept=".pem,.key,.txt"
                />
                {privateKeyFile && (
                  <div className="file-info" style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Archivo seleccionado: {privateKeyFile.name} ({privateKeyFile.size} bytes)
                  </div>
                )}
              </div>
              {error && <div className="alert alert-error">{error}</div>}
            </div>            <div className="modal-footer">
              <button onClick={() => setShowEstadoModal(false)} className="btn btn-danger">
                Cerrar
              </button>
              <button 
                onClick={handleEstadoCuenta} 
                className="btn btn-primary"
                disabled={!privateKeyFile}
              >
                Ver Estado de Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para mostrar comprobantes */}      {showComprobantesModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-extra-large">
            <div className="modal-header">
              <h3>📋 Comprobantes de Pago</h3>
            </div>
            <div className="modal-body">
              {comprobantes.length === 0 ? (
                <div className="text-center">
                  <p>No hay comprobantes disponibles.</p>
                </div>
              ) : (                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprobantes.map((comprobante, index) => (
                        <tr key={comprobante.id || index}>
                          <td>
                            {new Date(comprobante.fecha_subida).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </td>                          <td>{comprobante.motivo || 'Sin motivo especificado'}</td>
                          <td>
                            <span className={`comprobante-estado ${
                              comprobante.tipo_firma === 'Admin' || comprobante.tipo_firma === 'Condómino' ? 'estado-firmado' : 'estado-no-firmado'
                            }`}>
                              {comprobante.tipo_firma === 'Admin' ? 'Firmado por Admin' :
                               comprobante.tipo_firma === 'Condómino' ? 'Firmado por Condómino' :
                               'Sin firmar'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowComprobantesModal(false)} className="btn btn-danger">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para verificar comprobante */}      {showVerificarComprobanteModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-standard">            <div className="modal-header">
              <h3>✅ Verificar Comprobante</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Seleccionar comprobante a verificar:</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setArchivoVerificar(e.target.files[0])}
                  className="form-control"
                />
              </div>
                {archivoVerificar && (
                <div className="file-info">
                  <p>✅ Archivo seleccionado: {archivoVerificar.name}</p>
                </div>
              )}
                {verificacionResultado && (
                <div className={`alert ${verificacionResultado.firma_valida ? 'alert-success' : 'alert-error'}`}>
                  <h4>{verificacionResultado.firma_valida ? '✅ Comprobante Válido' : '❌ Comprobante Inválido'}</h4>
                  {verificacionResultado.firma_valida ? (
                    <div>
                      <p>✅ La firma del comprobante es válida</p>
                      {verificacionResultado.condomino && (
                        <div>
                          <p><strong>Condómino:</strong> {verificacionResultado.condomino.nombre}</p>
                          <p><strong>Correo:</strong> {verificacionResultado.condomino.correo}</p>
                        </div>
                      )}
                      {verificacionResultado.documento && (
                        <p><strong>Fecha de firma:</strong> {new Date(verificacionResultado.documento.fecha_firma).toLocaleString('es-ES')}</p>
                      )}
                    </div>
                  ) : (
                    <p>❌ La firma del comprobante no es válida o no se encontró un comprobante firmado que coincida</p>
                  )}
                </div>
              )}              {error && <div className="alert alert-error">{error}</div>}
              {message && <div className="alert alert-info">{message}</div>}
            </div>
            <div className="modal-footer">
              <button onClick={() => {
                setShowVerificarComprobanteModal(false);
                setArchivoVerificar(null);
                setVerificacionResultado(null);
                setError('');
                setMessage('');
              }} className="btn btn-danger">
                Cerrar
              </button>
              <button onClick={handleVerificarComprobante} className="btn btn-primary" disabled={!archivoVerificar}>
                Verificar
              </button>
            </div>
          </div>
        </div>
      )}{/* Modal para mostrar PDF */}
      {showPdfViewer && (
        <div className="modal-overlay full-screen" onClick={() => setShowPdfViewer(false)}>
          <div className="modal-content modal-pdf-viewer" onClick={(e) => e.stopPropagation()}>            <div className="modal-header">
              <h3>📄 {pdfTitle}</h3>
            </div>
            <div className="modal-body pdf-container">
              {currentPdf ? (
                <iframe
                  src={currentPdf}
                  title={pdfTitle}
                  className="pdf-viewer"
                />
              ) : (
                <div className="loading-container">
                  <div className="loading">Cargando PDF...</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPdfViewer(false)} className="btn btn-danger">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación flotante */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-confirm">
            <div className="modal-header">
              <h3>⚠️ {confirmTitle}</h3>
            </div>
            <div className="modal-body">
              <p>{confirmMessage}</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={handleConfirm} className="btn btn-primary">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
