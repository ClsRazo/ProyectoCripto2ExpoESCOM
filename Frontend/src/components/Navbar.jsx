import React from 'react';
export default function Navbar() {
  return (
    <nav style={{ height: 60, background: '#333', color: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
      <div style={{ flex: 1 }}>🚀 MiAppCondominio</div>
      <div>{/* Perfil e icono */}👤</div>
    </nav>
  );
}