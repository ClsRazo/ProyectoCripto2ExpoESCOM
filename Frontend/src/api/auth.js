import axios from 'axios';

// Base URL del backend (ajusta el puerto si es necesario)
const API_BASE = 'http://localhost:5000/api/auth';

export async function registerCondominio({ nombre, correo, password }) {
  try {
    const response = await axios.post(`${API_BASE}/register-condomino`, {
      nombre,
      correo,
      password
    });
    return response.data; // { message: "…" } o { access_token, clave_privada, usuario }
  } catch (err) {
    // Si la API devuelve un error, reenvía el mensaje
    if (err.response && err.response.data) {
      throw err.response.data;
    }
    throw { error: 'Error en el servidor al registrar condómino' };
  }
}

export async function login({ correo, password }) {
  try {
    const response = await axios.post(`${API_BASE}/login`, {
      correo,
      password
    });
    return response.data; // { access_token, usuario }
  } catch (err) {
    if (err.response && err.response.data) {
      throw err.response.data;
    }
    throw { error: 'Error en el servidor al hacer login' };
  }
}
