from flask import Blueprint, request, jsonify, send_file
from io import BytesIO
from app import db
from models import Condominio, Usuario, Documento, CondominioUsuario
from crypto_utils import derive_shared_key, descifrar_aes_gcm, firmar_datos, verificar_firma
from routes.auth import token_required

admin_bp = Blueprint('admin', __name__)

#PARA EL DASHBOARD DEL ADMINISTRADOR
@admin_bp.route('/dashboard', methods=['GET'])
@token_required
def dashboard(current_user):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    count = Condominio.query.filter_by(id_admin=current_user.id).count()
    return jsonify({'usuario': {'id': current_user.id, 'nombre': current_user.nombre}, 'count_condominios': count}), 200

#PARA LISTAR CONDOMINIOS DEL ADMIN
@admin_bp.route('/condominios', methods=['GET'])
@token_required
def listar_condominios(current_user):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    condos = Condominio.query.filter_by(id_admin=current_user.id).all()
    data = []
    for c in condos:
        num = CondominioUsuario.query.filter_by(id_condominio=c.id).count()
        data.append({
            'id': c.id, 
            'nombre': c.nombre, 
            'direccion': c.direccion, 
            'codigo': c.codigo, 
            'num_usuarios': num
        })
    return jsonify(data), 200

#PARA CREAR UN NUEVO CONDOMINIO (SOLO ADMIN)
@admin_bp.route('/condominio', methods=['POST'])
@token_required
def crear_condominio(current_user):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    nombre = data.get('nombre')
    direccion = data.get('direccion')
    if not nombre:
        return jsonify({'error': 'Falta nombre'}), 400
    # Generar código aleatorio
    import secrets
    codigo = secrets.token_hex(4)
    # import uuid
    # codigo = uuid.uuid4().hex[:8]
    nuevo = Condominio(nombre=nombre, direccion=direccion, codigo=codigo, id_admin=current_user.id)
    db.session.add(nuevo)
    db.session.commit()
    return jsonify({'id': nuevo.id, 'codigo': codigo}), 201

#PARA OBTENER CONDOMINIO Y SUS MIEMBROS (SOLO ADMIN)
@admin_bp.route('/condominio/<int:cid>', methods=['GET'])
@token_required
def obtener_condominio_admin(current_user, cid):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    cond = Condominio.query.get_or_404(cid)
    if cond.id_admin != current_user.id:
        return jsonify({'error': 'No autorizado'}), 403
    miembros = [cu.usuario for cu in cond.usuarios]
    data = {
        'id': cond.id,
        'nombre': cond.nombre,
        'direccion': cond.direccion,
        'codigo': cond.codigo,
        'condominos': [{'id': u.id, 'nombre': u.nombre, 'correo': u.correo} for u in miembros]
    }
    return jsonify(data), 200

#PARA EDITAR UN CONDOMINIO (SOLO ADMIN)
@admin_bp.route('/condominio/<int:cid>', methods=['PUT'])
@token_required
def editar_condominio(current_user, cid):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    cond = Condominio.query.get_or_404(cid)
    if cond.id_admin != current_user.id:
        return jsonify({'error': 'No autorizado'}), 403
    data = request.get_json() or {}
    cond.nombre = data.get('nombre', cond.nombre)
    cond.direccion = data.get('direccion', cond.direccion)
    db.session.commit()
    return jsonify({'message': 'Condominio actualizado'}), 200

#PARA QUE EL ADMIN DESCIFRE EL ESTADO DE CUENTA DE UN CONDOMINO
@admin_bp.route('/condominio/<int:cid>/condominos/<int:uid>/estado', methods=['GET'])
@token_required
def admin_descifrar_estado(current_user, cid, uid):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    doc = Documento.query.filter_by(
        id_condominio=cid,
        id_emisor=uid,
        tipo_documento='estado_cuenta'
    ).order_by(Documento.fecha_subida.desc()).first_or_404()
    priv_admin_pem = request.headers.get('X-Private-Key')
    pub_cond_pem = Usuario.query.get(uid).clave_publica
    key = derive_shared_key(priv_admin_pem, pub_cond_pem)
    pdf = descifrar_aes_gcm(key, doc.nonce, doc.tag, doc.contenido_cifrado)
    return (pdf, 200, {'Content-Type': 'application/pdf', 'Content-Disposition': f'inline; filename=estado_{uid}.pdf'})

#PARA QUE EL ADMIN VEA LOS COMPROBANTES DE PAGO DE UN CONDOMINO
# @admin_bp.route('/condominio/<int:cid>/condominos/<int:uid>/comprobantes', methods=['GET'])
# @token_required
# def listar_comprobantes(current_user, cid, uid):
#     docs = Documento.query.filter_by(
#         id_condominio=cid,
#         id_emisor=uid,
#         tipo_documento='comprobante_pago'
#     ).all()
#     return jsonify([{'id': d.id, 'fecha': d.fecha_subida} for d in docs]), 200

#PARA VERIFICAR UN COMPROBANTE DE PAGO
@admin_bp.route('/comprobante/verificar', methods=['POST'])
@token_required
def verificar_comprobante(current_user):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    packet = request.files.get('comprobante')
    signature = request.form.get('firma')
    datos = packet.read()
    pub_cond_pem = Usuario.query.get(current_user.id).clave_publica
    valid = verificar_firma(pub_cond_pem, datos, bytes.fromhex(signature))
    return jsonify({'valid': valid}), 200

# @admin_bp.route('/comprobante/verificar', methods=['POST'])
# @token_required
# def verify_comprobante(current_user):
#     file = request.files.get('comprobante')
#     firma = request.files.get('firma').read()
#     uid = request.form.get('id_usuario')
#     pub_cond_pem = Usuario.query.get(uid).clave_publica.encode()
#     data = file.read()
#     valid = verificar_firma(pub_cond_pem, data, firma)
#     return jsonify({'valid': valid}), 200

#PARA SUBIR UN BALANCE GENERAL (SOLO ADMIN)
@admin_bp.route('/condominio/<int:cid>/balance', methods=['POST'])
@token_required
def subir_balance(current_user, cid):
    try:
        print(f"=== SUBIR BALANCE DEBUG ===")
        print(f"Usuario: {current_user.nombre} (ID: {current_user.id})")
        print(f"Condominio ID: {cid}")
        
        if current_user.rol != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        
        cond = Condominio.query.get_or_404(cid)
        if cond.id_admin != current_user.id:
            return jsonify({'error': 'No autorizado'}), 403

        archivo = request.files.get('balance_general')
        priv_admin_pem = request.form.get('clave_privada')
        
        print(f"Archivo recibido: {archivo.filename if archivo else 'None'}")
        print(f"Clave privada recibida: {'Sí' if priv_admin_pem else 'No'}")
        
        if not archivo:
            return jsonify({'error': 'No se proporcionó archivo de balance'}), 400
        if not priv_admin_pem:
            return jsonify({'error': 'No se proporcionó clave privada'}), 400
        
        datos = archivo.read()
        print(f"Tamaño del archivo: {len(datos)} bytes")
        
        signature = firmar_datos(priv_admin_pem, datos)
        print(f"Firma generada, tamaño: {len(signature)} bytes")

        doc = Documento(
            id_emisor=current_user.id,
            id_condominio=cid,
            tipo_documento='balance_general',
            contenido_cifrado=datos,  # no cifrar
            firma_emisor=signature
        )
        
        print("Agregando documento a la sesión...")
        db.session.add(doc)
        
        print("Intentando commit a la base de datos...")
        db.session.commit()
        
        print(f"✅ Balance guardado exitosamente con ID: {doc.id}")
        return jsonify({'message': 'Balance firmado y almacenado.', 'id_documento': doc.id}), 201
        
    except Exception as e:
        print(f"❌ ERROR en subir_balance: {str(e)}")
        print(f"Tipo de error: {type(e).__name__}")
        db.session.rollback()
        return jsonify({'error': f'Error interno del servidor: {str(e)}'}), 500

#PARA LISTAR CONDOMINOS DE UN CONDOMINIO ESPECÍFICO (SOLO ADMIN)
@admin_bp.route('/condominio/<int:cid>/condominos', methods=['GET'])
@token_required
def listar_condominos(current_user, cid):
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    cond = Condominio.query.get_or_404(cid)
    if cond.id_admin != current_user.id:
        return jsonify({'error': 'No autorizado'}), 403
    
    # Obtener todos los condóminos del condominio
    condominos = db.session.query(Usuario).join(CondominioUsuario).filter(
        CondominioUsuario.id_condominio == cid,
        Usuario.rol == 'condomino'
    ).all()
    
    data = []
    for condomino in condominos:
        data.append({
            'id': condomino.id,
            'nombre': condomino.nombre,
            'correo': condomino.correo,
            'is_verified': condomino.is_verified
        })
    
    return jsonify(data), 200