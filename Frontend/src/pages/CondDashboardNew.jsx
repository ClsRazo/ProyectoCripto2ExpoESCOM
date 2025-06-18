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
  const [showConfirmJoinModal, setShowConfirmJoinModal] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);  const [showComprobantePagoModal, setShowComprobantePagoModal] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showComprobantesModal, setShowComprobantesModal] = useState(false);
  const [showVerificarComprobanteModal, setShowVerificarComprobanteModal] = useState(false);
  
  // Estados para formularios
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeValidation, setJoinCodeValidation] = useState(null);
  const [estadoCuentaFile, setEstadoCuentaFile] = useState(null);
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [comprobantePagoFile, setComprobantePagoFile] = useState(null);
  
  // Estados para documentos
  const [currentPdf, setCurrentPdf] = useState(null);
  const [pdfTitle, setPdfTitle] = useState('');
    // Estados de error y mensajes
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Estados para comprobantes (funcionalidad de admin vista desde condómino)
  const [comprobantes, setComprobantes] = useState([]);
  const [verificacionResultado, setVerificacionResultado] = useState(null);
  const [archivoVerificar, setArchivoVerificar] = useState(null);

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
      if (!joinCode.trim()) {
        setError('Ingresa el código del condominio');
        return;
      }
      
      // Validar código
      const validation = await condominioApi.validateCondominioCode(joinCode);
      if (validation.valid) {
        if (validation.alreadyMember) {
          // Usuario ya pertenece al condominio, recargar datos
          setMessage('Ya perteneces a este condominio. Recargando datos...');
          setShowJoinModal(false);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setJoinCodeValidation(validation.condominio);
          setShowJoinModal(false);
          setShowConfirmJoinModal(true);
        }
      } else {
        setError('Código de condominio inválido');
      }
    } catch (err) {
      setError('Error al validar el código del condominio');
    }
  };  const confirmJoinCondominio = async () => {
    try {
      setError('');
      if (!estadoCuentaFile) {
        setError('Selecciona tu estado de cuenta');
        return;
      }
      if (!privateKeyFile) {
        setError('Selecciona tu clave privada');
        return;
      }
      
      console.log('Iniciando proceso de unión al condominio...');
      console.log('Código:', joinCode);
      console.log('Estado de cuenta:', estadoCuentaFile?.name);
      console.log('Clave privada:', privateKeyFile?.name);
      
      await condominioApi.unirseCondominio(joinCode, estadoCuentaFile, privateKeyFile);
      setMessage('Te has unido al condominio exitosamente');
      setShowConfirmJoinModal(false);
      // Limpiar archivos
      setEstadoCuentaFile(null);
      setPrivateKeyFile(null);
      // Recargar datos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error al unirse al condominio:', err);
      setError('Error al unirse al condominio: ' + (err.message || 'Error desconocido'));
    }
  };
  const handleViewEstadoCuenta = async () => {
    try {
      setError('');
      if (!privateKeyFile) {
        setError('Selecciona tu clave privada para descifrar el estado de cuenta');
        return;
      }
      
      console.log('Obteniendo estado de cuenta...');
      const estadoData = await condominioApi.getEstadoCuenta(privateKeyFile);
      console.log('Estado de cuenta obtenido:', estadoData);
      
      if (estadoData.pdfUrl) {
        setCurrentPdf(estadoData.pdfUrl);
        setPdfTitle('Estado de Cuenta');
        setShowEstadoModal(false);
        setPrivateKeyFile(null); // Limpiar el archivo después de usar
        setShowPdfViewer(true);
      } else {
        setError('No se pudo obtener el estado de cuenta');
      }
    } catch (err) {
      console.error('Error al obtener estado de cuenta:', err);
      setError('Error al obtener el estado de cuenta: ' + (err.message || 'Error desconocido'));
    }
  };  const handleViewBalanceGeneral = async () => {
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

  const handleFirmarComprobante = async () => {
    try {
      setError('');
      if (!privateKeyFile || !comprobantePagoFile) {
        setError('Selecciona tu clave privada y el comprobante de pago');
        return;
      }      const firmadoData = await condominioApi.firmarComprobantePago(
        privateKeyFile, 
        comprobantePagoFile,
        condominio?.id
      );
      
      // Descargar archivo firmado
      const blob = new Blob([firmadoData.archivoFirmado], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante_firmado_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setMessage('Comprobante firmado y descargado exitosamente');
      setShowComprobantePagoModal(false);
    } catch (err) {
      setError('Error al firmar el comprobante de pago');
    }
  };

  // Handlers para comprobantes (funcionalidad de admin vista desde condómino)
  const handleViewComprobantes = async () => {
    try {
      setError('');
      setMessage('Cargando comprobantes...');

      const result = await adminApi.listarComprobantes(condominio.id, user.id);
      setComprobantes(result.comprobantes || []);
      setShowComprobantesModal(true);
      setMessage('');
      
    } catch (err) {
      console.error('Error al cargar comprobantes:', err);
      setError('Error al cargar comprobantes: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSeleccionarArchivoVerificar = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setArchivoVerificar(file);
      setVerificacionResultado(null);
    } else {
      setError('Por favor selecciona un archivo PDF válido');
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

      const response = await fetch('/admin/comprobante/verificar', {
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
  };

  const cerrarModalesComprobantes = () => {
    setShowComprobantesModal(false);
    setShowVerificarComprobanteModal(false);
    setComprobantes([]);
    setVerificacionResultado(null);
    setArchivoVerificar(null);
  };

  const closeJoinModal = () => {
    setShowJoinModal(false);
    setJoinCode('');
    setJoinCodeValidation(null);
    setError('');
  };
  const closeConfirmJoinModal = () => {
    setShowConfirmJoinModal(false);
    setEstadoCuentaFile(null);
    setPrivateKeyFile(null);
    setError('');
  };

  const closeEstadoModal = () => {
    setShowEstadoModal(false);
    setPrivateKeyFile(null);
    setError('');
  };

  const closeComprobantePagoModal = () => {
    setShowComprobantePagoModal(false);
    setPrivateKeyFile(null);
    setComprobantePagoFile(null);
    setError('');
  };

  const closePdfViewer = () => {
    setShowPdfViewer(false);
    setCurrentPdf(null);
    setPdfTitle('');
    // Limpiar URL del blob para evitar memory leaks
    if (currentPdf) {
      URL.revokeObjectURL(currentPdf);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <div className="loading-container">
          <div className="loading">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar condomino-sidebar">
        <div className="sidebar-header">
          <h3>{condominio ? condominio.nombre : 'Sin Condominio'}</h3>
          {!condominio && (
            <p className="text-muted">No perteneces a ningún condominio</p>
          )}
        </div>
        
        <div className="sidebar-content">
          {condominio ? (
            <>
              {/* Admin */}
              {admin && (
                <div className="member-section">
                  <h4>Administrador</h4>
                  <button
                    className={`member-item admin-item ${selectedAdmin?.id === admin.id ? 'active' : ''}`}
                    onClick={() => setSelectedAdmin(admin)}
                  >
                    <span className="member-icon">👑</span>
                    <span className="member-name">{admin.nombre}</span>
                  </button>
                </div>
              )}
              
              {/* Condóminos */}
              {condominios.length > 0 && (
                <div className="member-section">
                  <h4>Condóminos</h4>
                  <div className="members-list">
                    {condominios.map(condomino => (
                      <div key={condomino.id} className="member-item">
                        <span className="member-icon">👤</span>
                        <span className="member-name">{condomino.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-condominio">
              <p>No estás en ningún condominio</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowJoinModal(true)}
              >                Unirse a Condominio
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="container">
          {selectedAdmin ? (            <AdminDetailPanel 
              admin={selectedAdmin}
              onViewEstado={() => setShowEstadoModal(true)}
              onViewBalance={handleViewBalanceGeneral}
              onViewComprobantes={handleViewComprobantes}
              onVerificarComprobante={() => setShowVerificarComprobanteModal(true)}
            />
          ) : (
            <WelcomePanel user={user} condominio={condominio} />
          )}
        </div>
      </main>

      {/* Modales */}
      {showJoinModal && (
        <JoinCondominioModal
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          onJoin={handleJoinCondominio}
          onClose={closeJoinModal}
          error={error}
        />
      )}      {showConfirmJoinModal && (
        <ConfirmJoinModal
          condominio={joinCodeValidation}
          estadoCuentaFile={estadoCuentaFile}
          setEstadoCuentaFile={setEstadoCuentaFile}
          privateKeyFile={privateKeyFile}
          setPrivateKeyFile={setPrivateKeyFile}
          onConfirm={confirmJoinCondominio}
          onClose={closeConfirmJoinModal}
          error={error}
        />
      )}      {showEstadoModal && (
        <EstadoCuentaModal
          privateKeyFile={privateKeyFile}
          setPrivateKeyFile={setPrivateKeyFile}
          onView={handleViewEstadoCuenta}
          onClose={closeEstadoModal}
          error={error}
        />
      )}

      {showComprobantePagoModal && (
        <ComprobantePagoModal
          privateKeyFile={privateKeyFile}
          setPrivateKeyFile={setPrivateKeyFile}
          comprobantePagoFile={comprobantePagoFile}
          setComprobantePagoFile={setComprobantePagoFile}
          onFirmar={handleFirmarComprobante}
          onClose={closeComprobantePagoModal}
          error={error}
        />
      )}

      {showPdfViewer && (
        <PdfViewerModal
          pdfUrl={currentPdf}
          title={pdfTitle}
          onClose={closePdfViewer}
        />
      )}

      {/* Modal para ver comprobantes */}
      {showComprobantesModal && (
        <div className="modal-overlay" onClick={cerrarModalesComprobantes}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💳 Mis Comprobantes de Pago</h3>
              <button className="modal-close" onClick={cerrarModalesComprobantes}>✕</button>
            </div>
            
            <div className="modal-body">
              {comprobantes.length === 0 ? (
                <div className="no-data">
                  <p>No tienes comprobantes de pago registrados</p>
                </div>
              ) : (                <div className="comprobantes-table">
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          border: '1px solid #ddd',
                          fontWeight: 'bold',
                          color: '#495057'
                        }}>Fecha</th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          border: '1px solid #ddd',
                          fontWeight: 'bold',
                          color: '#495057'
                        }}>Motivo</th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          border: '1px solid #ddd',
                          fontWeight: 'bold',
                          color: '#495057'
                        }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprobantes.map((comprobante, index) => (
                        <tr key={comprobante.id || index} style={{ 
                          '&:hover': { backgroundColor: '#f5f5f5' }
                        }}>
                          <td style={{ 
                            padding: '10px 12px', 
                            border: '1px solid #ddd',
                            fontSize: '14px'
                          }}>
                            {new Date(comprobante.fecha_subida).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </td>
                          <td style={{ 
                            padding: '10px 12px', 
                            border: '1px solid #ddd',
                            fontSize: '14px',
                            maxWidth: '200px',
                            wordWrap: 'break-word'
                          }}>
                            {comprobante.motivo || 'Sin motivo especificado'}
                          </td>
                          <td style={{ 
                            padding: '10px 12px', 
                            border: '1px solid #ddd',
                            textAlign: 'center'
                          }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              backgroundColor: comprobante.tiene_firma ? '#d4edda' : '#f8d7da',
                              color: comprobante.tiene_firma ? '#155724' : '#721c24',
                              border: `1px solid ${comprobante.tiene_firma ? '#c3e6cb' : '#f5c6cb'}`
                            }}>
                              {comprobante.tiene_firma ? 
                                (comprobante.firmado_por_admin ? '✓ Firmado por Admin' : '✓ Firmado') : 
                                '✗ Sin firma'
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cerrarModalesComprobantes}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para verificar comprobante */}
      {showVerificarComprobanteModal && (
        <div className="modal-overlay" onClick={cerrarModalesComprobantes}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ Verificar Comprobante de Pago</h3>
              <button className="modal-close" onClick={cerrarModalesComprobantes}>✕</button>
            </div>
            
            <div className="modal-body">
              <p>Selecciona un archivo PDF para verificar si fue firmado digitalmente por el administrador.</p>
              
              <div className="form-group">
                <label>Archivo PDF del comprobante:</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleSeleccionarArchivoVerificar}
                  className="file-input"
                />
              </div>
              
              {verificacionResultado && (
                <div className={`verification-result ${verificacionResultado.firma_valida ? 'valid' : 'invalid'}`}>
                  <h4>Resultado de la verificación:</h4>
                  <p>
                    {verificacionResultado.firma_valida 
                      ? '✅ El comprobante fue firmado digitalmente por el administrador' 
                      : '❌ El comprobante no tiene una firma válida del administrador'}
                  </p>
                  {verificacionResultado.documento && (
                    <p><small>Fecha de firma: {new Date(verificacionResultado.documento.fecha_firma).toLocaleString()}</small></p>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={handleVerificarComprobante}
                disabled={!archivoVerificar}
              >
                Verificar
              </button>
              <button className="btn btn-secondary" onClick={cerrarModalesComprobantes}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes flotantes */}
      {message && (
        <div className="alert alert-success floating-alert">
          {message}
          <button onClick={() => setMessage('')} className="alert-close">×</button>
        </div>
      )}
      
      {error && !showJoinModal && !showConfirmJoinModal && !showEstadoModal && !showComprobantePagoModal && (
        <div className="alert alert-error floating-alert">
          {error}
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}
    </div>
  );
}

// Componente para mostrar detalles del admin
const AdminDetailPanel = ({ admin, onViewEstado, onViewBalance, onViewComprobantes, onVerificarComprobante }) => (
  <div className="admin-detail-panel">
    <div className="admin-info">
      <div className="card">
        <div className="card-header">
          <h3>👑 Información del Administrador</h3>
        </div>
        <div className="card-body">
          <div className="admin-details">
            <div className="detail-item">
              <span className="detail-label">Nombre:</span>
              <span className="detail-value">{admin.nombre}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Correo:</span>
              <span className="detail-value">{admin.correo}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Rol:</span>
              <span className="detail-value">Administrador</span>
            </div>
          </div>
          
          <div className="admin-actions">
            <button className="btn btn-primary" onClick={onViewEstado}>
              📄 Estado de Cuenta
            </button>
            <button className="btn btn-secondary" onClick={onViewBalance}>
              📊 Balance General
            </button>
            <button className="btn btn-info" onClick={onViewComprobantes}>
              💳 Ver Comprobantes
            </button>
            <button className="btn btn-warning" onClick={onVerificarComprobante}>
              ✅ Verificar Comprobante
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Componente de bienvenida
const WelcomePanel = ({ user, condominio }) => (
  <div className="welcome-panel">
    <div className="card">
      <div className="card-header">
        <h2>🏠 Bienvenido, {user.nombre}</h2>
      </div>
      <div className="card-body">
        {condominio ? (
          <div>
            <p>Has iniciado sesión correctamente en tu condominio <strong>{condominio.nombre}</strong>.</p>
            <p>Selecciona al administrador del menú lateral para ver los documentos disponibles.</p>
          </div>
        ) : (
          <div>
            <p>Actualmente no perteneces a ningún condominio.</p>
            <p>Utiliza el menú lateral para unirte a un condominio y acceder a todas las funcionalidades.</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Modal para unirse a condominio
const JoinCondominioModal = ({ joinCode, setJoinCode, onJoin, onClose, error }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Unirse a Condominio</h3>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label htmlFor="joinCode">Código del Condominio:</label>
          <input
            id="joinCode"
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            className="form-control"
            placeholder="Ingresa el código del condominio"
          />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={onJoin}>
          Validar Código
        </button>
      </div>
    </div>
  </div>
);

// Modal para confirmar unión a condominio
const ConfirmJoinModal = ({ condominio, estadoCuentaFile, setEstadoCuentaFile, privateKeyFile, setPrivateKeyFile, onConfirm, onClose, error }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Confirmar Unión al Condominio</h3>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="confirmation-info">
          <p>¿Estás seguro de que quieres unirte al condominio:</p>
          <div className="condominio-info">
            <h4>{condominio?.nombre}</h4>
            <p><strong>Dirección:</strong> {condominio?.direccion}</p>
          </div>
        </div>        <div className="form-group">
          <label htmlFor="estadoCuenta">Estado de Cuenta (PDF):</label>
          <input
            id="estadoCuenta"
            type="file"
            accept=".pdf"
            onChange={e => setEstadoCuentaFile(e.target.files[0])}
            className="form-control"
          />
          <small className="form-text">Sube tu estado de cuenta actualizado</small>
        </div>
        <div className="form-group">
          <label htmlFor="privateKey">Clave Privada (archivo .pem):</label>
          <input
            id="privateKey"
            type="file"
            accept=".pem"
            onChange={e => setPrivateKeyFile(e.target.files[0])}
            className="form-control"
          />
          <small className="form-text">Necesaria para cifrar tu estado de cuenta</small>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          Confirmar y Unirse
        </button>
      </div>
    </div>
  </div>
);

// Modal para ver estado de cuenta
const EstadoCuentaModal = ({ privateKeyFile, setPrivateKeyFile, onView, onClose, error }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Ver Estado de Cuenta</h3>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {error && <div className="alert alert-error">{error}</div>}
        <p>Para descifrar y ver tu estado de cuenta, necesitas proporcionar tu clave privada:</p>
        <div className="form-group">
          <label htmlFor="privateKey">Clave Privada (.pem):</label>
          <input
            id="privateKey"
            type="file"
            accept=".pem"
            onChange={e => setPrivateKeyFile(e.target.files[0])}
            className="form-control"
          />
          <small className="form-text">Selecciona tu archivo de clave privada</small>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={onView}>
          Descifrar y Ver
        </button>
      </div>
    </div>
  </div>
);

// Modal para firmar comprobante de pago
const ComprobantePagoModal = ({ privateKeyFile, setPrivateKeyFile, comprobantePagoFile, setComprobantePagoFile, onFirmar, onClose, error }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Firmar Comprobante de Pago</h3>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label htmlFor="privateKeyComp">Clave Privada (.pem):</label>
          <input
            id="privateKeyComp"
            type="file"
            accept=".pem"
            onChange={e => setPrivateKeyFile(e.target.files[0])}
            className="form-control"
          />
          <small className="form-text">Tu archivo de clave privada</small>
        </div>
        <div className="form-group">
          <label htmlFor="comprobantePago">Comprobante de Pago (PDF):</label>
          <input
            id="comprobantePago"
            type="file"
            accept=".pdf"
            onChange={e => setComprobantePagoFile(e.target.files[0])}
            className="form-control"
          />
          <small className="form-text">El comprobante que deseas firmar</small>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-success" onClick={onFirmar}>
          Firmar y Descargar
        </button>
      </div>
    </div>
  </div>
);

// Modal para visualizar PDFs
const PdfViewerModal = ({ pdfUrl, title, onClose }) => {
  console.log('PdfViewerModal renderizado con:', { pdfUrl, title });
  
  const openInNewTab = () => {
    const newWindow = window.open(pdfUrl, '_blank');
    if (!newWindow) {
      // Si no se puede abrir en nueva ventana, descargar
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `${title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
    const [iframeLoaded, setIframeLoaded] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);
  
  // Detectar si el iframe no carga el PDF después de 3 segundos
  React.useEffect(() => {
    if (pdfUrl && !iframeLoaded && !iframeError) {
      const timer = setTimeout(() => {
        console.log('PDF iframe no cargó en 3 segundos, mostrando alternativa');
        setIframeError(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [pdfUrl, iframeLoaded, iframeError]);
  
  return (
    <div className="modal-overlay full-screen" onClick={onClose}>
      <div className="modal-content pdf-viewer" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-header-actions">
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={openInNewTab}
              title="Abrir en nueva pestaña"
            >
              🔗 Nueva Pestaña
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body pdf-container">
          {pdfUrl ? (
            <>
              {!iframeLoaded && !iframeError && (
                <div className="loading-container">
                  <div className="loading">Cargando PDF...</div>
                </div>
              )}
              
              {iframeError && (
                <div className="pdf-error-container">
                  <div className="pdf-error-message">
                    <h4>⚠️ No se puede mostrar el PDF en el modal</h4>
                    <p>Tu navegador no puede mostrar este PDF directamente en el modal.</p>
                    <button 
                      className="btn btn-primary" 
                      onClick={openInNewTab}
                    >
                      🔗 Abrir en Nueva Pestaña
                    </button>
                  </div>
                </div>
              )}
              
              <iframe
                src={pdfUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                title={title}
                style={{ display: iframeError ? 'none' : 'block' }}
                onLoad={() => {
                  console.log('PDF iframe cargado');
                  setIframeLoaded(true);
                }}
                onError={(e) => {
                  console.error('Error cargando PDF iframe:', e);
                  setIframeError(true);
                }}
              />
              
              <div style={{ 
                position: 'absolute', 
                bottom: '10px', 
                left: '10px', 
                fontSize: '12px', 
                color: '#666', 
                background: 'rgba(255,255,255,0.8)', 
                padding: '4px 8px', 
                borderRadius: '4px',
                display: iframeError ? 'none' : 'block'
              }}>
                PDF URL: {pdfUrl.substring(0, 50)}...
              </div>
            </>
          ) : (
            <div className="loading-container">
              <div className="loading">Cargando PDF...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
