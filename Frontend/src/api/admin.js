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

export const listarCondominios = () =>
  api.get('/admin/condominios').then(res => res.data);

export const listarCondominos = (cid) =>
  api.get(`/admin/condominio/${cid}/condominos`).then(res => res.data);

export const crearCondominio = ({ nombre, direccion }) =>
  api.post('/admin/condominio', { nombre, direccion }).then(res => res.data);

export const obtenerCondominioAdmin = cid =>
  api.get(`/admin/condominio/${cid}`).then(res => res.data);

export const editarCondominio = (cid, { nombre, direccion }) =>
  api.put(`/admin/condominio/${cid}`, { nombre, direccion }).then(res => res.data);

export const subirBalance = (cid, file, clavePrivada) => {
  const fd = new FormData(); 
  fd.append('balance_general', file);
  fd.append('clave_privada', clavePrivada);
  return api.post(`/admin/condominio/${cid}/balance`, fd).then(res => res.data);
};

export const adminDescifrarEstado = (cid, uid, clavePrivada) => {
  // Codificar la clave privada en Base64 para enviarla en el header
  const clavePrivadaBase64 = btoa(clavePrivada);
  return api.get(`/admin/condominio/${cid}/condominos/${uid}/estado`, { 
    headers: { 'X-Private-Key': clavePrivadaBase64 }, 
    responseType: 'blob' 
  });
};

export const listarComprobantes = (cid, uid) =>
  api.get(`/admin/condominio/${cid}/condominos/${uid}/comprobantes`).then(res => res.data);

export const verificarComprobante = (file, signatureHex) => {
  const fd = new FormData(); fd.append('comprobante', file); fd.append('firma', signatureHex);
  return api.post('/admin/comprobante/verificar', fd).then(res => res.data);
};