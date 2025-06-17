import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

// Definición de temas
const themes = {
  dark: {
    primary: '#13283e',      // 60% - Fondo principal
    secondary: '#7dd181',    // 30% - Botones e hipervínculos  
    tertiary: '#f0f0f0',     // 10% - Texto
    // Variaciones del color primario
    primaryLight: '#1a3548',
    primaryDark: '#0f1f2f',
    primaryHover: '#1e3d56',
    // Variaciones del color secundario
    secondaryLight: '#8fda93',
    secondaryDark: '#6bc270',
    secondaryHover: '#92e397',
    // Colores adicionales
    background: '#13283e',
    surface: '#1a3548',
    surfaceHover: '#1e3d56',
    text: '#f0f0f0',
    textSecondary: '#b8c4d0',
    border: '#2a4560',
    borderLight: '#3a5570',
    // Estados
    success: '#7dd181',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8'
  },
  light: {
    primary: '#f0f0f0',      // 60% - Fondo principal (intercambiado)
    secondary: '#7dd181',    // 30% - Botones e hipervínculos
    tertiary: '#13283e',     // 10% - Texto (intercambiado)
    // Variaciones del color primario
    primaryLight: '#ffffff',
    primaryDark: '#e0e0e0',
    primaryHover: '#e8e8e8',
    // Variaciones del color secundario
    secondaryLight: '#8fda93',
    secondaryDark: '#6bc270',
    secondaryHover: '#92e397',
    // Colores adicionales
    background: '#f0f0f0',
    surface: '#ffffff',
    surfaceHover: '#f8f9fa',
    text: '#13283e',
    textSecondary: '#4a5568',
    border: '#d1d5db',
    borderLight: '#e5e7eb',
    // Estados
    success: '#7dd181',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8'
  }
};

export function ThemeProvider({ children }) {
  // Detectar preferencia del sistema de forma segura
  const getSystemTheme = () => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (error) {
      console.warn('No se pudo detectar la preferencia del sistema:', error);
    }
    return true; // Por defecto modo oscuro
  };

  const [isDark, setIsDark] = useState(() => {
    try {
      // Cargar preferencia del localStorage, o usar sistema si no existe
      const saved = localStorage.getItem('isDarkMode');
      return saved ? JSON.parse(saved) : getSystemTheme();
    } catch (error) {
      console.warn('Error al cargar tema del localStorage:', error);
      return true; // Fallback a modo oscuro
    }
  });

  const currentTheme = isDark ? themes.dark : themes.light;

  const toggleTheme = () => {
    setIsDark(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem('isDarkMode', JSON.stringify(newValue));
      } catch (error) {
        console.warn('No se pudo guardar la preferencia de tema:', error);
      }
      return newValue;
    });
  };
  // Aplicar variables CSS globales y data-theme
  useEffect(() => {
    try {
      const root = document.documentElement;
      
      // Aplicar data-theme para selectores CSS específicos
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      
      // Aplicar variables CSS personalizadas
      Object.entries(currentTheme).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });
    } catch (error) {
      console.warn('Error al aplicar tema al DOM:', error);
    }
  }, [currentTheme, isDark]);

  // Escuchar cambios del sistema (opcional)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        try {
          // Solo aplicar si no hay preferencia guardada explícita
          if (!localStorage.getItem('isDarkMode')) {
            setIsDark(e.matches);
          }
        } catch (error) {
          console.warn('Error al manejar cambio de tema del sistema:', error);
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    } catch (error) {
      console.warn('Error al configurar listener de tema del sistema:', error);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      theme: currentTheme, 
      isDark, 
      toggleTheme,
      themes 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
