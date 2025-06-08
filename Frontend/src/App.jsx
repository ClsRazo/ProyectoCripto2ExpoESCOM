import React from 'react';
import logo from './logo.svg';
import './App.css';
import { AuthProvider } from './components/AuthContext';
import Login from './components/Login';
import RegisterCondominio from './components/RegisterCondominio';

export default function App() {
  return (
    <AuthProvider>
      <div>
        <h1 style={{ textAlign: 'center' }}>Mi App de Condominios</h1>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 20 }}>
          <div style={{ width: '45%' }}>
            <RegisterCondominio />
          </div>
          <div style={{ width: '45%' }}>
            <Login />
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
