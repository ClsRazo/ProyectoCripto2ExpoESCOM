import axios from 'axios';
import API_CONFIG from '../config/api';

// Configurar axios con la configuración centralizada
const api = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}/auth`,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: API_CONFIG.WITH_CREDENTIALS,
  headers: API_CONFIG.DEFAULT_HEADERS
});

export const registerCondominio = ({ nombre, correo, password }) =>
  api.post('/register-condomino', { nombre, correo, password }).then(res => res.data);

export const login = ({ correo, password }) =>
  api.post('/login', { correo, password }).then(res => res.data);

// export async function registerCondominio({ nombre, correo, password }) {
//   try {
//     const response = await axios.post(`${API_BASE}/register-condomino`, {
//       nombre,
//       correo,
//       password
//     });
//     return response.data; // { message: "…" } o { access_token, clave_privada, usuario }
//   } catch (err) {
//     // Si la API devuelve un error, reenvía el mensaje
//     if (err.response && err.response.data) {
//       throw err.response.data;
//     }
//     throw { error: 'Error en el servidor al registrar condómino' };
//   }
// }

// export async function login({ correo, password }) {
//   try {
//     const response = await axios.post(`${API_BASE}/login`, {
//       correo,
//       password
//     });
//     return response.data; // { access_token, usuario }
//   } catch (err) {
//     if (err.response && err.response.data) {
//       throw err.response.data;
//     }
//     throw { error: 'Error en el servidor al hacer login' };
//   }
// }
