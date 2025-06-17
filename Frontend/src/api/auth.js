import axios from 'axios';

export const registerCondominio = ({ nombre, correo, password }) =>
  axios.post('/auth/register-condomino', { nombre, correo, password }).then(res => res.data);
export const login = ({ correo, password }) =>
  axios.post('/auth/login', { correo, password }).then(res => res.data);

// Base URL del backend (ajusta el puerto si es necesario)
// const API_BASE = 'http://localhost:5000/api/auth';

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
