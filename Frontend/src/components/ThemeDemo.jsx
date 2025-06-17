import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeDemo() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="card" style={{ margin: '20px', maxWidth: '600px' }}>
      <div className="card-header">
        <h3>🎨 Sistema de Temas</h3>
      </div>
      <div className="card-body">
        <div className="alert alert-info">
          <strong>Tema actual:</strong> {isDark ? 'Oscuro' : 'Claro'} 🌙☀️
        </div>
        
        <div className="button-group">
          <button onClick={toggleTheme} className="btn btn-primary">
            Cambiar a tema {isDark ? 'claro' : 'oscuro'}
          </button>
          <button className="btn btn-secondary">
            Botón secundario
          </button>
          <button className="btn btn-success">
            Botón éxito
          </button>
          <button className="btn btn-danger">
            Botón peligro
          </button>
        </div>

        <div className="form-section">
          <h4>Elementos de formulario</h4>
          <div className="form-group">
            <label htmlFor="demo-input">Campo de prueba:</label>
            <input 
              id="demo-input"
              type="text" 
              placeholder="Escribe algo aquí..." 
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="demo-select">Selector:</label>
            <select id="demo-select" className="form-control">
              <option>Opción 1</option>
              <option>Opción 2</option>
              <option>Opción 3</option>
            </select>
          </div>
        </div>

        <div className="alert alert-success">
          ✅ Alerta de éxito
        </div>
        <div className="alert alert-error">
          ❌ Alerta de error
        </div>
      </div>
    </div>
  );
}
