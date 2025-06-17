# app.py (simplificado)
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_mail import Mail
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
mail = Mail()

def create_app():
    app = Flask(__name__)

    app.config.from_object('config.Config')   # Lee URI de BD, SECRET_KEY, etc.

    db.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)

    #Habilitamos CORS para permitir peticiones desde el frontend
    CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

    #Registro de blueprints
    from routes.auth import auth_bp
    from routes.condominios import condominios_bp
    from routes.admin import admin_bp
    from routes.documentos import documentos_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(condominios_bp, url_prefix='/api/condominio')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(documentos_bp, url_prefix='/api')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
    # app.run(debug=True)  # Para desarrollo, usar debug=True


# from werkzeug.security import generate_password_hash, check_password_hash
# import jwt
# import datetime
# from functools import wraps
# from crypto_utils import generar_par_claves_ec, serializar_clave_privada, serializar_clave_publica

# app = Flask(__name__)
# app.config['SECRET_KEY'] = 'una_clave_muy_secreta'
# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://usuario:pass@localhost/condominio'
# db = SQLAlchemy(app)