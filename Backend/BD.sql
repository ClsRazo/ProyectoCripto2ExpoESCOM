-- Tabla Usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    rol VARCHAR(20) NOT NULL, -- 'condomino' o 'admin'
    clave_publica TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Condominios
CREATE TABLE condominios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL, -- para unirse
    id_admin INTEGER REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Condominio_Usuarios (Muchos a Muchos)
CREATE TABLE condominio_usuarios (
    id SERIAL PRIMARY KEY,
    id_condominio INTEGER REFERENCES condominios(id),
    id_usuario INTEGER REFERENCES usuarios(id),
    fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_condominio, id_usuario)
);

-- Tabla Documentos
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    id_emisor INTEGER REFERENCES usuarios(id),
    id_condominio INTEGER REFERENCES condominios(id),
    tipo_documento VARCHAR(50), -- 'balance', 'comprobante', etc.
    ruta_archivo_cifrado VARCHAR(300), -- ruta o URL en storage
    nonce BYTEA, -- para AES-GCM
    tag BYTEA,   -- para AES-GCM
    firma_emisor BYTEA, -- firma ECDSA del que envía (condómino o admin)
    firma_admin BYTEA,  -- firma ECDSA del admin (solo aplica para balances)
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
