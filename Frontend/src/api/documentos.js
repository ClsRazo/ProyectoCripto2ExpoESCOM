import axios from 'axios';
export const getBalance = cid =>
  axios.get(`/condominio/${cid}/balance`, { responseType: 'blob' });
export const firmarComprobante = (file, clavePrivada) => {
  const fd = new FormData(); fd.append('comprobante', file);
  return axios.post('/comprobante/firmar', fd, { headers: { 'X-Private-Key': clavePrivada } }).then(res => res.data);
};