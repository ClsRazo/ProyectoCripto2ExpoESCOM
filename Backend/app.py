# app.py (sencillo)
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_mail import Mail
from flask_cors import CORS
import pymysql
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
mail = Mail()

def create_app():
    app = Flask(__name__)

    app.config.from_object('config.Config')   # Lee URI de BD, SECRET_KEY, etc.

    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    
    # Habilitamos CORS para permitir peticiones desde el frontend
    # Permitir tanto desarrollo local como producción
    allowed_origins = [
        "http://localhost:3000",  # Desarrollo local React
        "http://localhost:3001",  # Desarrollo local alternativo
        "https://tu-dominio-frontend.com",  # Cambiar por tu dominio de producción
        "https://*.amazonaws.com",  # Para S3/CloudFront
        "https://*.vercel.app",  # Si usas Vercel como alternativa
        "*"  # Temporalmente para pruebas - cambiar en producción
    ]
    CORS(app, origins=allowed_origins, supports_credentials=True)
    
    # Registro de blueprints
    from routes.auth import auth_bp
    from routes.condominios import condominios_bp
    from routes.admin import admin_bp
    from routes.documentos import documentos_bp
    from routes.condomino import condomino_bp
    
    # Rutas básicas para testing
    @app.route('/')
    def home():
        return {'message': 'Sagitarium API está funcionando correctamente', 'status': 'OK'}
    
    @app.route('/api/')
    def api_home():
        return {'message': 'API Base - Sagitarium', 'version': '1.0', 'endpoints': ['auth', 'condominio', 'admin', 'documentos', 'condomino']}

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(condominios_bp, url_prefix='/api/condominio')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(documentos_bp, url_prefix='/api')
    app.register_blueprint(condomino_bp, url_prefix='/api/condomino')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
    # app.run(debug=True)  # Para desarrollo, usar debug=True

# Crear la instancia de la app para Gunicorn
app = create_app()