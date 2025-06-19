import axios from 'axios';
import API_CONFIG from '../config/api';

// Configurar axios con la configuración centralizada
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: API_CONFIG.WITH_CREDENTIALS,
});

export const getBalance = cid =>
  api.get(`/condominio/${cid}/balance`, { responseType: 'blob' });

export const firmarComprobante = (file, clavePrivada) => {
  const fd = new FormData(); 
  fd.append('comprobante', file);
  return api.post('/comprobante/firmar', fd, { 
    headers: { 'X-Private-Key': clavePrivada } 
  }).then(res => res.data);
};