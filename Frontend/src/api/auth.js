import axios from 'axios';

// Base URL del backend - usar variable de entorno o forzar a EC2 para pruebas
const API_BASE = process.env.REACT_APP_API_URL || 'http://3.136.236.195:5000/api/auth';

// Configurar axios con la base URL
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
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
