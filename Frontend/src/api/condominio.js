import axios from 'axios';

export const getCondominio = cid => axios.get(`/condominio/${cid}`).then(res => res.data);

export const unirseCondominio = (cid, file, clavePrivada, codigo) => {
  const fd = new FormData(); fd.append('codigo_condominio', codigo); fd.append('estado_de_cuenta', file);
  return axios.post('/condominio/unirse', fd, { headers: { 'X-Private-Key': clavePrivada } }).then(res => res.data);
};

export const getEstadoMeta = cid => axios.get(`/condominio/${cid}/estado`).then(res => res.data);

export const descifrarEstado = (cid, clavePrivada) =>
  axios.post(`/condominio/${cid}/estado/descifrar`, null, { headers: { 'X-Private-Key': clavePrivada }, responseType: 'blob' });

export const actualizarEstado = (cid, file, clavePrivada) => {
  const fd = new FormData(); fd.append('estado_de_cuenta', file);
  return axios.post(`/condominio/${cid}/estado/actualizar`, fd, { headers: { 'X-Private-Key': clavePrivada } }).then(res => res.data);
}; 