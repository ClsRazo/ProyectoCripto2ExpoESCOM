import axios from 'axios';

export const listarCondominios = () =>
  axios.get('/admin/condominios').then(res => res.data);

export const listarCondominos = (cid) =>
  axios.get(`/admin/condominio/${cid}/condominos`).then(res => res.data);

export const crearCondominio = ({ nombre, direccion }) =>
  axios.post('/admin/condominio', { nombre, direccion }).then(res => res.data);

export const obtenerCondominioAdmin = cid =>
  axios.get(`/admin/condominio/${cid}`).then(res => res.data);

export const editarCondominio = (cid, { nombre, direccion }) =>
  axios.put(`/admin/condominio/${cid}`, { nombre, direccion }).then(res => res.data);

export const subirBalance = (cid, file, clavePrivada) => {
  const fd = new FormData(); 
  fd.append('balance_general', file);
  fd.append('clave_privada', clavePrivada);
  return axios.post(`/admin/condominio/${cid}/balance`, fd).then(res => res.data);
};

export const adminDescifrarEstado = (cid, uid, clavePrivada) =>
  axios.get(`/admin/condominio/${cid}/condominos/${uid}/estado`, { headers: { 'X-Private-Key': clavePrivada }, responseType: 'blob' });

export const listarComprobantes = (cid, uid) =>
  axios.get(`/admin/condominio/${cid}/condominos/${uid}/comprobantes`).then(res => res.data);

export const verificarComprobante = (file, signatureHex) => {
  const fd = new FormData(); fd.append('comprobante', file); fd.append('firma', signatureHex);
  return axios.post('/admin/comprobante/verificar', fd).then(res => res.data);
};