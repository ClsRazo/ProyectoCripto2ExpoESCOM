# app.py (simplificado)
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')   # Lee URI de BD, SECRET_KEY, etc.
    db.init_app(app)
    migrate.init_app(app, db)

    # Registrar blueprints
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

# # Decorador para rutas protegidas
# def token_required(f):
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         token = None
#         if 'Authorization' in request.headers:
#             bearer = request.headers['Authorization']
#             token = bearer.replace('Bearer ', '')
#         if not token:
#             return jsonify({'message': 'Token faltante'}), 401
#         try:
#             data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
#             current_user = Usuario.query.get(data['sub'])
#         except:
#             return jsonify({'message': 'Token inválido'}), 401
#         return f(current_user, *args, **kwargs)
#     return decorated

# @app.route('/api/auth/register-condomino', methods=['POST'])
# def register_condomino():
#     data = request.get_json()
#     correo = data.get('correo')
#     contra_plana = data.get('password')
#     nombre = data.get('nombre')
#     # 1) Verificar que no exista
#     if Usuario.query.filter_by(correo=correo).first():
#         return jsonify({'error': 'Correo ya registrado'}), 409
#     # 2) Generar hash de la contraseña
#     hash_pw = generate_password_hash(contra_plana)
#     # 3) Generar par de claves ECDSA/ECDH
#     private_key, public_key = generar_par_claves_ec()
#     clave_privada_pem = serializar_clave_privada(private_key)   # p.ej. PEM sin cifrar o cifrado con passphrase
#     clave_publica_pem = serializar_clave_publica(public_key)
#     # 4) Guardar usuario en BD, con clave pública
#     nuevo = Usuario(correo=correo, password_hash=hash_pw,
#                    nombre=nombre, rol='condomino',
#                    clave_publica=clave_publica_pem)
#     db.session.add(nuevo)
#     db.session.commit()
#     # 5) Crear token de sesión
#     token = jwt.encode({
#         'sub': nuevo.id,
#         'rol': nuevo.rol,
#         'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
#     }, app.config['SECRET_KEY'], algorithm='HS256')
#     # 6) Retornar token y clave privada (solo una vez)
#     return jsonify({
#         'access_token': token,
#         'clave_privada': clave_privada_pem.decode('utf-8')
#     }), 201

# @app.route('/api/auth/login', methods=['POST'])
# def login():
#     data = request.get_json()
#     correo = data.get('correo')
#     contra_plana = data.get('password')
#     usuario = Usuario.query.filter_by(correo=correo).first()
#     if not usuario or not check_password_hash(usuario.password_hash, contra_plana):
#         return jsonify({'error': 'Credenciales inválidas'}), 401
#     token = jwt.encode({
#         'sub': usuario.id,
#         'rol': usuario.rol,
#         'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
#     }, app.config['SECRET_KEY'], algorithm='HS256')
#     return jsonify({
#         'access_token': token,
#         'usuario': {
#             'id': usuario.id,
#             'nombre': usuario.nombre,
#             'rol': usuario.rol
#         }
#     }), 200

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
