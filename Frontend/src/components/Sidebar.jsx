import React from 'react';
export default function Sidebar({ title, items, onSelect }) {
  return (
    <aside style={{ width: 240, background: '#f4f4f4', padding: 20, height: 'calc(100vh - 60px)' }}>
      <h3>{title}</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((it) => (
          <li key={it.id} onClick={() => onSelect(it)} style={{ cursor: 'pointer', margin: '8px 0' }}>
            {it.nombre}
          </li>
        ))}
      </ul>
      <button style={{ marginTop: 'auto' }}>➕ Unirse</button>
    </aside>
  );
}