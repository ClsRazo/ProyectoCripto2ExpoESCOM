import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { login as apiLogin, registerCondominio as apiRegister } from '../api/auth';

// Crear contexto
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Hook para consumirlo más fácilmente
// export function useAuth() {
//   return useContext(AuthContext);
// }

export function AuthProvider({ children }) {
  // Estado global de autenticación
  const [user, setUser] = useState(null);            // { id, nombre, correo, rol }
  const [token, setToken] = useState(null);          // JWT string
  const [clavePrivada, setClavePrivada] = useState(null); // PEM string
  const [loading, setLoading] = useState(true);      // Estado de carga inicial

  axios.defaults.baseURL = "http://3.136.236.195:5000/api";

  // Cargar token del localStorage al inicializar
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      console.log('Token cargado desde localStorage:', savedToken.substring(0, 20) + '...');
    }
    
    setLoading(false); // Marcar que la carga inicial ha terminado
  }, []);

  // Configurar interceptor para incluir token en todas las peticiones
  axios.interceptors.request.use(
    (config) => {
      const currentToken = token || localStorage.getItem('token');
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
        console.log('Token enviado en petición:', currentToken.substring(0, 20) + '...');
      } else {
        console.log('No hay token disponible para enviar');
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
  // Función para hacer login
  // async function login({ correo, password }) {
  //   const data = await apiLogin({ correo, password });
  //   // data = { access_token, usuario }
  //   setToken(data.access_token);
  //   setUser(data.usuario);
  //   setClavePrivada(null); 
  //   // (En el flujo estándar, la clavePrivada NO se devuelve en login; solo en registro).
  //   axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
  //   return data;
  // }
  
  const login = async ({ correo, password }) => {
    const data = await apiLogin({ correo, password });
    setUser(data.usuario);
    setToken(data.access_token);
    
    // Guardar en localStorage para persistencia
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.usuario));
    
    // Configurar header por defecto
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
    
    console.log('Login exitoso, token configurado:', data.access_token.substring(0, 20) + '...');
    return data; // puede incluir { access_token, usuario }
  };

  // Función para registrarse como condómino
  // async function registerCondominio({ nombre, correo, password }) {
  //   const data = await apiRegister({ nombre, correo, password });
  //   // Si el backend devolviera clave_privada y token:
  //   if (data.access_token) {
  //     setToken(data.access_token);
  //     setUser(data.usuario);
  //     setClavePrivada(data.clave_privada);
  //     // Configurar axios para incluir el header Authorization en cada petición
  //     axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
  //     return data; // puede incluir { access_token, clave_privada, usuario }
  //   }
  //   // Si el backend sólo devolvió { message: "..." }, devolvemos el mensaje para que el componente lo muestre
  //   return data;
  // }
  const register = async ({ nombre, correo, password }) => {
    const data = await apiRegister({ nombre, correo, password });
    if (data.access_token) {
      setUser(data.usuario);
      setToken(data.access_token);
      setClavePrivada(data.clave_privada);
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
      return data;
    }
    return data; // puede incluir { access_token, clave_privada, usuario }
  };

  // function logout() {
  //   setToken(null);
  //   setUser(null);
  //   setClavePrivada(null);
  //   delete axios.defaults.headers.common['Authorization'];
  // }
  
  const logout = () => {
    setUser(null); 
    setToken(null); 
    setClavePrivada(null);
    
    // Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    delete axios.defaults.headers.common['Authorization'];
    console.log('Logout realizado, token eliminado');
  };

  // Función para actualizar los datos del usuario
  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    console.log('Usuario actualizado:', updatedUser);
  };

  // const value = {
  //   user,
  //   token,
  //   clavePrivada,
  //   registerCondominio,
  //   login,
  //   logout
  // };
  // return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  return <AuthContext.Provider value={{ user, token, clavePrivada, loading, login, register, logout, updateUser }}>
    {children}
  </AuthContext.Provider>;
}
