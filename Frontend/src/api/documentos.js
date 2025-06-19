import axios from 'axios';

// Base URL del backend - usar variable de entorno o forzar a EC2 para pruebas
const API_BASE = process.env.REACT_APP_API_URL || 'http://3.136.236.195:5000/api';

// Configurar axios con la base URL
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
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