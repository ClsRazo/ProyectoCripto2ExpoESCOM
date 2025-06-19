import datetime
from flask import Blueprint, request, jsonify, current_app, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from app import db, mail
from models import Usuario
from flask_mail import Message
from crypto_utils import generar_par_claves_ec, serializar_clave_privada, serializar_clave_publica

auth_bp = Blueprint('auth', __name__)

#----------Para generar y verificar tokens de confirmación de email----------
def generate_confirmation_token(email):
    """
    Genera un token firmado (expirable) para el email.
    """
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt='email-confirm-salt')

def confirm_token(token, expiration=3600):
    """
    Verifica el token y devuelve el email si está OK y no expiró.
    Expiración por defecto: 3600 s = 1 hora
    """
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token,
            salt='email-confirm-salt',
            max_age=expiration
        )
    except SignatureExpired:
        return None  # Token expiró
    except BadSignature:
        return None  # Token inválido
    return email

def send_verification_email(usuario, token):
    """
    Envía correo de verificación con link que apunta a /api/auth/verify/<token>
    """
    # URL que el usuario debe abrir para verificar. Podría ser tu frontend,
    # pero acá creamos un endpoint en el backend que luego marque user.is_verified=True.
    verify_url = url_for('auth.verify_email', token=token, _external=True)
    subject = "Verifica tu cuenta - Sagitarium"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7dd181 0%, #5ab866 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Sagitarium</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Verifica tu cuenta</h2>
            <p>Hola <strong>{usuario.nombre}</strong>,</p>
            <p>¡Bienvenido a Sagitarium! Gracias por registrarte en nuestro sistema de gestión condominial.</p>
            <p>Para completar tu registro y comenzar a usar la plataforma, necesitas verificar tu correo electrónico:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}" style="background: linear-gradient(135deg, #7dd181 0%, #5ab866 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Verificar mi cuenta
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
                <a href="{verify_url}">{verify_url}</a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
                Si no te registraste en Sagitarium, puedes ignorar este correo de forma segura.
            </p>
        </div>
        <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            © 2025 Sagitarium - Sistema de Gestión Condominial
        </div>
    </div>
    """

    msg = Message(
        subject=subject,
        recipients=[usuario.correo],
        html=html_body
    )
    mail.send(msg)

#----------Para restablecimiento de contraseña----------
def generate_reset_token(email):
    """
    Genera un token firmado (expirable) para el restablecimiento de contraseña.
    """
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt='password-reset-salt')

def confirm_reset_token(token, expiration=3600):
    """
    Verifica el token de reset de contraseña y devuelve el email si está OK y no expiró.
    Expiración por defecto: 3600 s = 1 hora
    """
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token,
            salt='password-reset-salt',
            max_age=expiration
        )
    except SignatureExpired:
        return None  # Token expiró
    except BadSignature:
        return None  # Token inválido
    return email

def send_reset_password_email(usuario, token):
    """
    Envía correo de restablecimiento de contraseña con link que apunta al frontend
    """    # URL del frontend para restablecer contraseña
    reset_url = f"http://localhost:3000/reset-password/{token}"  # Para desarrollo local
    subject = "Restablece tu contraseña - Sagitarium"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🏠 Sagitarium</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Restablece tu contraseña</h2>
            <p>Hola <strong>{usuario.nombre}</strong>,</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
            <p>Si fuiste tú quien solicitó esto, haz clic en el siguiente botón para establecer una nueva contraseña:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Restablecer Contraseña
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
                <a href="{reset_url}">{reset_url}</a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
                Este enlace expirará en 1 hora por seguridad.
            </p>
            
            <p style="color: #666; font-size: 14px;">
                Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.
            </p>
        </div>
        <div style="background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            © 2025 Sagitarium - Sistema de Gestión Condominial
        </div>
    </div>
    """

    msg = Message(
        subject=subject,
        recipients=[usuario.correo],
        html=html_body
    )
    mail.send(msg)

#----------Para autenticación y autorización con JWT----------
def token_required(f):
    """
    Decorador para proteger rutas y extraer 'current_user' del JWT.
    """
    from functools import wraps

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # El token debe venir en el header Authorization: Bearer <token>
        print(f"Headers recibidos: {dict(request.headers)}")  # Debug
        if 'Authorization' in request.headers:
            bearer = request.headers.get('Authorization')
            print(f"Authorization header: {bearer}")  # Debug
            parts = bearer.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
                print(f"Token extraído: {token[:20]}...")  # Debug (solo primeros 20 chars)

        if not token:
            print("ERROR: Token faltante")  # Debug
            return jsonify({'error': 'Token faltante'}), 401

        try:
            # Decodificar y verificar firma
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            print(f"Token decodificado: {data}")  # Debug
            # data debería contener: { 'sub': id_usuario, 'rol': 'condomino' / 'admin', 'exp': ... }
            # Convertir sub de string a int
            user_id = int(data['sub'])
            current_user = Usuario.query.get(user_id)
            if current_user is None:
                print(f"ERROR: Usuario con ID {user_id} no encontrado")  # Debug
                raise RuntimeError('Usuario no encontrado')
            print(f"Usuario encontrado: {current_user.nombre}, rol: {current_user.rol}, verificado: {current_user.is_verified}")  # Debug
            if not current_user.is_verified:
                print("ERROR: Cuenta no verificada")  # Debug
                return jsonify({'error': 'Cuenta no verificada'}), 403
        except jwt.ExpiredSignatureError:
            print("ERROR: Token expirado")  # Debug
            return jsonify({'error': 'Token expirado'}), 401
        except Exception as e:
            print(f"ERROR: Token inválido - {e}")  # Debug
            return jsonify({'error': 'Token inválido'}), 401

        # Inyectamos current_user en los argumentos de la función
        return f(current_user, *args, **kwargs)

    return decorated

#----------Para registrar un nuevo condomino----------
@auth_bp.route('/', methods=['GET'])
def auth_home():
    """Ruta de prueba para el blueprint de auth"""
    return {
        'message': 'Auth API funcionando', 
        'endpoints': [
            '/register-condomino',
            '/login', 
            '/register-admin',
            '/verify/<token>',
            '/verificar-usuario-manual/<user_id>'
        ]
    }

@auth_bp.route('/register-condomino', methods=['POST'])
def register_condomino():
    """
    1. Valida campos.
    2. Verifica que no exista correo.
    3. Genera hash y par ECC.
    4. Crea usuario con is_verified=False (no lo habilita aún).
    5. Genera token de confirmación.
    6. Envía correo con link de verificación.
    7. Retorna mensaje indicando que revise su correo.
    """
    data = request.get_json() or {}
    correo = data.get('correo', '').strip().lower()
    contra_plana = data.get('password', '')
    nombre = data.get('nombre', '').strip()

    if not correo or not contra_plana or not nombre:
        return jsonify({'error': 'Faltan campos obligatorios: correo, password, nombre'}), 400

    # 1) Verificar que el correo no exista
    if Usuario.query.filter_by(correo=correo).first():
        return jsonify({'error': 'El correo ya está registrado'}), 409

    # 2) Generar hash de la contraseña
    pw_hash = generate_password_hash(contra_plana)

    # 3) Generar par de claves ECC
    private_key_obj, public_key_obj = generar_par_claves_ec()
    clave_privada_pem = serializar_clave_privada(private_key_obj)   # bytes
    clave_publica_pem = serializar_clave_publica(public_key_obj)    # bytes

    # 4) Crear y guardar usuario en la base de datos
    #    No lo insertamos aún en sesión, pero lo creamos para poder enviar el token
    nuevo = Usuario(
        nombre=nombre,
        correo=correo,
        password_hash=pw_hash,
        rol='condomino',
        # clave_publica=clave_publica_pem.decode('utf-8'),
        clave_publica=clave_publica_pem,
        is_verified=False
    )
    db.session.add(nuevo)
    db.session.commit()  # Guardamos para obtener nuevo.id

    # 5) Generar token de confirmación (basado en el email)
    token_verificacion = generate_confirmation_token(correo)

    # 6) Enviar correo de verificación
    try:
        send_verification_email(nuevo, token_verificacion)
    except Exception as e:
        # Si falla el envío, opcionalmente eliminar al usuario para que intente de nuevo
        # db.session.delete(nuevo)
        # db.session.commit()
        print(f"Error al enviar correo: {e}")
        # return jsonify({'error': 'No se pudo enviar correo de verificación', 'detalle': str(e)}), 500

    # 6) Retornar respuesta indicando que revise su bandeja
    return jsonify({
        'message': 'Registro exitoso. Revisa tu correo para verificar tu cuenta.',
        # enviamos la clave privada (texto PEM) para que el usuario la guarde YA.
        # 'clave_privada': clave_privada_pem.decode('utf-8'),
        'clave_privada': clave_privada_pem,
        'usuario': {
            'id': nuevo.id,
            'nombre': nuevo.nombre,
            'correo': nuevo.correo,
            'rol': nuevo.rol
        }
    }), 201

@auth_bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    """
    Al acceder a este endpoint (por el link del correo), validamos el token:
    - Si es válido y no expiró, marcamos is_verified=True para ese usuario.
    - Si no es válido o expiró, devolvemos error y el usuario puede reenviar otro correo.
    """
    try:
        email = confirm_token(token)
    except:
        return jsonify({'error': 'Token inválido o expirado'}), 400

    user = Usuario.query.filter_by(correo=email).first()
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    if user.is_verified:
        return jsonify({'message': 'Cuenta ya verificada. Puedes hacer login.'}), 200

    # Marcamos como verificado
    user.is_verified = True
    db.session.commit()
    return jsonify({'message': 'Correo verificado. Ahora puedes hacer login.'}), 200

#----------Para iniciar sesión----------
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Solo permite login si user.is_verified == True
    """
    data = request.get_json() or {}
    correo = data.get('correo', '').strip().lower()
    contra_plana = data.get('password', '')

    if not correo or not contra_plana:
        return jsonify({'error': 'Correo y contraseña son obligatorios'}), 400

    usuario = Usuario.query.filter_by(correo=correo).first()
    if not usuario:
        return jsonify({'error': 'Credenciales inválidas'}), 401
    
    if not usuario.is_verified:
        return jsonify({'error': 'Cuenta no verificada. Revisa tu correo.'}), 403

    if not check_password_hash(usuario.password_hash, contra_plana):
        return jsonify({'error': 'Credenciales inválidas'}), 401

    token = jwt.encode({
        'sub': str(usuario.id),  # Convertir ID a string
        'rol': usuario.rol,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'access_token': token,
        'usuario': {
            'id': usuario.id,
            'nombre': usuario.nombre,
            'correo': usuario.correo,
            'rol': usuario.rol
        }
    }), 200

#----------Para registrar un nuevo admin----------
@auth_bp.route('/register-admin', methods=['POST'])
@token_required
def register_admin(current_user):
    """
    Igual que antes, pero verificamos que current_user.rol sea 'superadmin' o 'admin'.
    También podemos decidir si queremos obligar a que el admin que creó a este
    admin también verifique su correo, pero usualmente al crear con rol 'admin' lo
    marcamos is_verified=True inmediatamente, pues es creado por un superadmin.
    """
    if current_user.rol not in ('superadmin', 'admin'):
        return jsonify({'error': 'No tienes permiso para crear administradores'}), 403

    data = request.get_json() or {}
    correo = data.get('correo', '').strip().lower()
    contra_plana = data.get('password', '')
    nombre = data.get('nombre', '').strip()

    if not correo or not contra_plana or not nombre:
        return jsonify({'error': 'Faltan campos obligatorios: correo, password, nombre'}), 400

    if Usuario.query.filter_by(correo=correo).first():
        return jsonify({'error': 'El correo ya está registrado'}), 409

    pw_hash = generate_password_hash(contra_plana)
    private_key_obj, public_key_obj = generar_par_claves_ec()
    clave_privada_pem = serializar_clave_privada(private_key_obj)
    clave_publica_pem = serializar_clave_publica(public_key_obj)

    # Cuando un admin crea otro admin, podemos asumir que no hace falta verificar por correo
    nuevo = Usuario(
        nombre=nombre,
        correo=correo,
        password_hash=pw_hash,
        rol='admin',        # clave_publica=clave_publica_pem.decode('utf-8'),
        clave_publica=clave_publica_pem,
        is_verified=True  # directo verificado
    )
    
    db.session.add(nuevo)
    db.session.commit()

    token = jwt.encode({
        'sub': str(nuevo.id),  # Convertir ID a string
        'rol': nuevo.rol,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'access_token': token,
        # 'clave_privada': clave_privada_pem.decode('utf-8'),
        'clave_privada': clave_privada_pem,
        'usuario': {
            'id': nuevo.id,
            'nombre': nuevo.nombre,
            'correo': nuevo.correo,
            'rol': nuevo.rol
        }
    }), 201

#----------Para verificar manualmente a un usuario (útil para admins)----------
@auth_bp.route('/verificar-usuario-manual/<int:user_id>', methods=['POST'])
def verificar_usuario_manual(user_id):
    """
    Ruta temporal para verificar manualmente a un usuario admin.
    En producción, esto debería estar protegido o eliminado.
    """
    usuario = Usuario.query.get(user_id)
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    usuario.is_verified = True
    db.session.commit()
    
    return jsonify({
        'message': f'Usuario {usuario.nombre} ({usuario.correo}) verificado manualmente',
        'usuario': {
            'id': usuario.id,
            'nombre': usuario.nombre,
            'correo': usuario.correo,
            'rol': usuario.rol,
            'is_verified': usuario.is_verified
        }
    }), 200

#----------Para restablecimiento de contraseña----------
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Solicita el restablecimiento de contraseña.
    Envía un email con un token para restablecer la contraseña.
    """
    try:
        data = request.get_json()
        if not data or 'correo' not in data:
            return jsonify({'error': 'El correo es requerido'}), 400
        
        correo = data['correo'].strip().lower()
        
        # Validar formato de correo
        if '@' not in correo or '.' not in correo:
            return jsonify({'error': 'Formato de correo inválido'}), 400
        
        # Buscar usuario por correo
        usuario = Usuario.query.filter_by(correo=correo).first()
        
        # Siempre retornar éxito por seguridad (no revelar si el email existe)
        if usuario:
            # Generar token de reset
            reset_token = generate_reset_token(correo)
            
            # Enviar correo de restablecimiento
            send_reset_password_email(usuario, reset_token)
            
        return jsonify({
            'message': 'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.'
        }), 200
        
    except Exception as e:
        print(f"Error en forgot_password: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Restablece la contraseña usando el token enviado por correo.
    """
    try:
        data = request.get_json()
        if not data or 'token' not in data or 'nueva_password' not in data:
            return jsonify({'error': 'Token y nueva contraseña son requeridos'}), 400
        
        token = data['token']
        nueva_password = data['nueva_password']
        
        # Validar contraseña
        if len(nueva_password) < 6:
            return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
        
        # Verificar token
        correo = confirm_reset_token(token)
        if not correo:
            return jsonify({'error': 'Token inválido o expirado'}), 400
        
        # Buscar usuario
        usuario = Usuario.query.filter_by(correo=correo).first()
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Actualizar contraseña
        usuario.password_hash = generate_password_hash(nueva_password)
        db.session.commit()
        
        return jsonify({
            'message': 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.'
        }), 200
        
    except Exception as e:
        print(f"Error en reset_password: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@auth_bp.route('/verify-reset-token/<token>', methods=['GET'])
def verify_reset_token(token):
    """
    Verifica si un token de reset es válido (útil para el frontend).
    """
    try:
        correo = confirm_reset_token(token)
        if not correo:
            return jsonify({'valid': False, 'error': 'Token inválido o expirado'}), 400
        
        # Verificar que el usuario existe
        usuario = Usuario.query.filter_by(correo=correo).first()
        if not usuario:
            return jsonify({'valid': False, 'error': 'Usuario no encontrado'}), 404
        
        return jsonify({
            'valid': True,
            'correo': correo,
            'nombre': usuario.nombre
        }), 200
        
    except Exception as e:
        print(f"Error en verify_reset_token: {e}")
        return jsonify({'valid': False, 'error': 'Error interno del servidor'}), 500