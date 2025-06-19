import axios from 'axios';

// Base URL del backend - cambiar según el entorno
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'http://3.136.236.195:5000/api'  // IP de tu EC2
  : 'http://localhost:5000/api';     // Desarrollo local

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