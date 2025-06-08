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
    from routes.documentos import documentos_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(condominios_bp, url_prefix='/api/condominio')
    app.register_blueprint(documentos_bp, url_prefix='/api/documentos')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)


# from werkzeug.security import generate_password_hash, check_password_hash
# import jwt
# import datetime
# from functools import wraps
# from crypto_utils import generar_par_claves_ec, serializar_clave_privada, serializar_clave_publica

# app = Flask(__name__)
# app.config['SECRET_KEY'] = 'una_clave_muy_secreta'
# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://usuario:pass@localhost/condominio'
# db = SQLAlchemy(app)

# @app.route('/api/condominio/unirse', methods=['POST'])
# @token_required
# def unirse_condominio(current_user):
#     # Solo los condominos pueden unirse por código
#     if current_user.rol != 'condomino':
#         return jsonify({'error': 'No autorizado'}), 403
#     data = request.get_json()
#     codigo = data.get('codigo_condominio')
#     condominio = Condominio.query.filter_by(codigo=codigo).first()
#     if not condominio:
#         return jsonify({'error': 'Código inválido'}), 404
#     # Verificar si ya está en ese condominio
#     if CondominioUsuario.query.filter_by(id_usuario=current_user.id,
#                                          id_condominio=condominio.id).first():
#         return jsonify({'message': 'Ya perteneces a este condominio'}), 200
#     # Agregar relación
#     relacion = CondominioUsuario(id_usuario=current_user.id,
#                                  id_condominio=condominio.id,
#                                  fecha_union=datetime.datetime.utcnow())
#     db.session.add(relacion)
#     db.session.commit()
#     return jsonify({'message': 'Unido al condominio exitosamente'}), 200

# @app.route('/api/admin/crear-condominio', methods=['POST'])
# @token_required
# def crear_condominio(current_user):
#     # current_user debe ser rol 'admin'
#     if current_user.rol != 'admin':
#         return jsonify({'error': 'No autorizado'}), 403
#     data = request.get_json()
#     nombre = data.get('nombre_condominio')
#     codigo = generar_codigo_unico()  # función que genera un string único
#     nuevo = Condominio(nombre=nombre,
#                        codigo=codigo,
#                        id_admin=current_user.id)
#     db.session.add(nuevo)
#     db.session.commit()
#     return jsonify({'id_condominio': nuevo.id, 'codigo': codigo}), 201
