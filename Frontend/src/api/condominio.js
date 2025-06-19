import axios from 'axios';
import API_CONFIG from '../config/api';

// Configurar axios con la configuración centralizada
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: API_CONFIG.WITH_CREDENTIALS,
  headers: API_CONFIG.DEFAULT_HEADERS
});

// Configurar interceptores para incluir el token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === FUNCIONES BÁSICAS ===
export const getCondominio = async (cid) => {
  const response = await api.get(`/condominio/${cid}`);
  return response.data;
};

// === GESTIÓN DE MEMBRESÍA ===
export const validateCondominioCode = async (codigo) => {
  try {
    const response = await api.post(`/condominio/validate-code`, { codigo });
    return { valid: true, condominio: response.data.condominio };
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error === 'Ya perteneces a este condominio') {
      // Usuario ya pertenece al condominio, retornar como válido pero con flag especial
      return { valid: true, alreadyMember: true, error: 'Ya perteneces a este condominio' };
    }
    return { valid: false, error: error.response?.data?.error || 'Código inválido' };
  }
};

export const unirseCondominio = async (codigo, estadoCuentaFile, privateKeyFile) => {
  try {
    // Validar archivos
    if (!estadoCuentaFile) {
      throw new Error('Archivo de estado de cuenta requerido');
    }
    if (!privateKeyFile) {
      throw new Error('Archivo de clave privada requerido');
    }
    
    const formData = new FormData();
    formData.append('codigo_condominio', codigo);
    formData.append('estado_de_cuenta', estadoCuentaFile);
    formData.append('clave_privada', privateKeyFile); // Enviar como archivo en lugar de header
    
    console.log('Enviando solicitud de unión al condominio...');
      const response = await api.post(`/condominio/unirse`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Respuesta exitosa:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error en unirseCondominio:', error);
    throw error;
  }
};

export const getMiembrosCondominio = async (cid) => {
  const response = await api.get(`/condominio/${cid}/miembros`);
  return response.data;
};

// === GESTIÓN DE DOCUMENTOS ===
export const getEstadoCuenta = async (privateKeyFile) => {
  try {
    console.log('=== Iniciando getEstadoCuenta ===');
    console.log('Archivo de clave privada:', privateKeyFile);
    console.log('Nombre del archivo:', privateKeyFile?.name);
    console.log('Tipo del archivo:', privateKeyFile?.type);
    console.log('Tamaño del archivo:', privateKeyFile?.size);
    
    const formData = new FormData();
    formData.append('clave_privada', privateKeyFile);
    
    console.log('FormData creado, enviando solicitud...');
    const response = await api.post(`/condomino/estado-cuenta`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob', // Para recibir el PDF
    });
    
    console.log('Respuesta recibida:', response);
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    
    // Crear URL del blob para mostrar el PDF
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    console.log('PDF URL creada:', pdfUrl);
    
    return { pdfUrl, vigente: true }; // TODO: implementar verificación de vigencia
  } catch (error) {
    console.error('Error en getEstadoCuenta:', error);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    console.error('Response headers:', error.response?.headers);
    
    // Si hay un error 500, intentar leer el mensaje de error
    if (error.response?.status === 500 && error.response?.data) {
      try {
        // Si la respuesta es un Blob, convertirla a texto
        const errorBlob = error.response.data;
        const errorText = await errorBlob.text();
        const errorData = JSON.parse(errorText);
        throw new Error('Error del servidor: ' + (errorData.error || 'Error desconocido'));
      } catch (parseError) {
        console.error('No se pudo parsear el error del servidor:', parseError);
        throw new Error('Error interno del servidor (500)');
      }
    }
    
    if (error.response?.status === 404) {
      throw new Error('No se encontró estado de cuenta');
    }
    throw new Error('Error al obtener el estado de cuenta: ' + (error.response?.data?.error || error.message));
  }
};

export const actualizarEstadoCuenta = async (estadoCuentaFile, privateKeyFile) => {
  const formData = new FormData();
  formData.append('estado_de_cuenta', estadoCuentaFile);
  formData.append('clave_privada', privateKeyFile);
  
  const response = await api.post(`/condomino/estado-cuenta/actualizar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getBalanceGeneral = async (condominioId) => {
  try {
    console.log('Solicitando balance general para condominio:', condominioId);
    const response = await api.get(`/condomino/balance-general/${condominioId}`, {
      responseType: 'blob',
    });
    
    console.log('Respuesta de balance general recibida:', response);
    
    // Crear URL del blob para mostrar el PDF
    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    console.log('PDF URL del balance general creada:', pdfUrl);
    
    return { pdfUrl, firmaValida: true }; // TODO: implementar verificación de firma
  } catch (error) {
    console.error('Error en getBalanceGeneral:', error);
    if (error.response?.status === 404) {
      throw new Error('No hay balance general disponible');
    }
    if (error.response?.status === 403) {
      throw new Error('No autorizado para ver este condominio');
    }
    throw new Error('Error al obtener el balance general: ' + (error.response?.data?.error || error.message));
  }
};

// === FIRMA DE COMPROBANTES ===
export const firmarComprobantePago = async (privateKeyFile, comprobantePagoFile, condominioId) => {
  const formData = new FormData();
  formData.append('clave_privada', privateKeyFile);
  formData.append('comprobante_pago', comprobantePagoFile);
  formData.append('id_condominio', condominioId.toString());
  
  const response = await api.post(`/condomino/firmar-comprobante`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob', // Para recibir el archivo firmado
  });
  
  return { archivoFirmado: response.data };
};

// === FUNCIONES DEL PERFIL ===
export const getPerfilCondomino = async () => {
  const response = await api.get(`/condomino/perfil`);
  return response.data;
};

export const actualizarPerfil = async (datosActualizados) => {
  const response = await api.put(`/condomino/perfil`, datosActualizados);
  return response.data;
};

// === FUNCIONES DEL PERFIL (adicionales para compatibilidad) ===
export const getProfile = getPerfilCondomino;
export const updateProfile = actualizarPerfil;

// === FUNCIONES LEGACY (mantener compatibilidad) ===
export const getEstadoMeta = async (cid) => {
  const response = await api.get(`/condominio/${cid}/estado`);
  return response.data;
};

export const descifrarEstado = async (cid, clavePrivada) => {
  const response = await api.post(`/condominio/${cid}/estado/descifrar`, null, {
    headers: { 'X-Private-Key': clavePrivada },
    responseType: 'blob'
  });
  return response;
};

export const actualizarEstado = async (cid, file, clavePrivada) => {
  const formData = new FormData();
  formData.append('estado_de_cuenta', file);
  
  const response = await api.post(`/condominio/${cid}/estado/actualizar`, formData, {
    headers: { 'X-Private-Key': clavePrivada }
  });
  return response.data;
};

// Agregar función para obtener información del condómino
export const getCondominoInfo = async () => {
  const response = await api.get(`/condomino/info`);
  return response.data;
};