from datetime import datetime
from app import db

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    correo = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(20), nullable=False)      # 'condomino' o 'admin'
    clave_publica = db.Column(db.Text, nullable=False)  # PEM en texto
    is_verified = db.Column(db.Boolean, default=False)  # Indica si ya verificó su correo
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

class Condominio(db.Model):
    __tablename__ = 'condominios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    codigo = db.Column(db.String(10), unique=True, nullable=False)
    id_admin = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)

class CondominioUsuario(db.Model):
    __tablename__ = 'condominio_usuarios'
    id = db.Column(db.Integer, primary_key=True)
    id_condominio = db.Column(db.Integer, db.ForeignKey('condominios.id'), nullable=False)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fecha_union = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('id_condominio', 'id_usuario'),)

class Documento(db.Model):
    __tablename__ = 'documentos'
    id = db.Column(db.Integer, primary_key=True)
    id_emisor = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    id_condominio = db.Column(db.Integer, db.ForeignKey('condominios.id'), nullable=False)
    tipo_documento = db.Column(db.String(50))
    contenido_cifrado = db.Column(db.LargeBinary, nullable=False)  # ciphertext completo
    nonce = db.Column(db.LargeBinary(12), nullable=False)          # 12 bytes para GCM
    tag = db.Column(db.LargeBinary(16), nullable=False)            # 16 bytes para GCM
    firma_emisor = db.Column(db.LargeBinary)   # firma del condómino (o admin)
    firma_admin = db.Column(db.LargeBinary)    # firma del admin (solo balances)
    fecha_subida = db.Column(db.DateTime, default=datetime.utcnow)
