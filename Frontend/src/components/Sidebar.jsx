import React from 'react';

export default function Sidebar({ title, items, onSelect, joinAction }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>{title}</h3>
      </div>
      <nav className="sidebar-nav">
        <ul className="sidebar-list">
          {items.map(it => (
            <li key={it.id} className="sidebar-item">
              <button 
                onClick={() => onSelect(it)} 
                className="sidebar-link"
              >
                👤 {it.nombre}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button onClick={joinAction} className="btn btn-secondary btn-full">
          ➕ Unirse
        </button>
      </div>
    </aside>
  );
}