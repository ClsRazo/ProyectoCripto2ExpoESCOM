import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';
import { login as apiLogin, registerCondominio as apiRegister } from '../api/auth';

// Crear contexto
const AuthContext = createContext();

// Hook para consumirlo más fácilmente
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Estado global de autenticación
  const [user, setUser] = useState(null);            // { id, nombre, correo, rol }
  const [token, setToken] = useState(null);          // JWT string
  const [clavePrivada, setClavePrivada] = useState(null); // PEM string

  // Función para registrarse como condómino
  async function registerCondominio({ nombre, correo, password }) {
    const data = await apiRegister({ nombre, correo, password });
    // Si el backend devolviera clave_privada y token:
    if (data.access_token) {
      setToken(data.access_token);
      setUser(data.usuario);
      setClavePrivada(data.clave_privada);
      // Configurar axios para incluir el header Authorization en cada petición
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
      return data; // puede incluir { access_token, clave_privada, usuario }
    }
    // Si el backend sólo devolvió { message: "..." }, devolvemos el mensaje para que el componente lo muestre
    return data;
  }

  // Función para hacer login
  async function login({ correo, password }) {
    const data = await apiLogin({ correo, password });
    // data = { access_token, usuario }
    setToken(data.access_token);
    setUser(data.usuario);
    setClavePrivada(null); 
    // (En el flujo estándar, la clavePrivada NO se devuelve en login; solo en registro).
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
    return data;
  }

  function logout() {
    setToken(null);
    setUser(null);
    setClavePrivada(null);
    delete axios.defaults.headers.common['Authorization'];
  }

  const value = {
    user,
    token,
    clavePrivada,
    registerCondominio,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
