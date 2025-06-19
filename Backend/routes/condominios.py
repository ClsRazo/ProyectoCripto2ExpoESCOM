from datetime import datetime
from flask import Blueprint, request, jsonify
from app import db
from models import Condominio, CondominioUsuario, Documento, Usuario
# ... lógica para crear condominio (solo admin) y unirse (solo condomino) ...
from crypto_utils import derive_shared_key, cifrar_aes_gcm, firmar_datos, descifrar_aes_gcm
from routes.auth import token_required

condominios_bp = Blueprint('condominios', __name__)

#PARA CREAR UN NUEVO CONDOMINIO (SOLO ADMIN)
@condominios_bp.route('/unirse', methods=['POST'])
@token_required
def unirse_condominio(current_user):
    """
    1) Valida rol 'condomino'.
    2) Verifica código y crea vínculo.
    3) Pide file 'estado_de_cuenta'.
    4) Cifra + firma + guarda como Documento tipo 'estado_cuenta'.    """
    if current_user.rol != 'condomino':
        return jsonify({'error': 'No autorizado'}), 403

    codigo = request.form.get('codigo_condominio')
    archivo = request.files.get('estado_de_cuenta')
    clave_privada_file = request.files.get('clave_privada')
    
    if not codigo or not archivo or not clave_privada_file:
        return jsonify({'error': 'Falta código, archivo de estado de cuenta o clave privada'}), 400

    cond = Condominio.query.filter_by(codigo=codigo).first()
    if not cond:
        return jsonify({'error': 'Código inválido'}), 404

    # 2) Guardar la relación (si no existe ya)
    if not CondominioUsuario.query.filter_by(id_condominio=cond.id, id_usuario=current_user.id).first():
        relacion = CondominioUsuario(id_condominio=cond.id, id_usuario=current_user.id)
        db.session.add(relacion)
        db.session.commit()    # 3) Leer bytes del estado de cuenta
    datos = archivo.read()

    # 4) Leer clave privada del archivo enviado
    priv_cond_pem = clave_privada_file.read().decode('utf-8')
    pub_admin_pem = Usuario.query.get(cond.id_admin).clave_publica
    
    if not pub_admin_pem:
        return jsonify({'error': 'Admin no tiene clave pública configurada'}), 500
      # 5) Derivar clave simétrica con ECDH
    key = derive_shared_key(priv_cond_pem, pub_admin_pem)

    # 6) Cifrar con AES-GCM
    nonce, ciphertext, tag = cifrar_aes_gcm(key, datos)

    # 7) Firmar ciphertext con ECDSA del condómino
    signature = firmar_datos(priv_cond_pem, ciphertext)

    # 7) Guardar Documento
    doc = Documento(
        id_emisor=current_user.id,
        id_condominio=cond.id,
        tipo_documento='estado_cuenta',
        contenido_cifrado=ciphertext,
        nonce=nonce,
        tag=tag,
        firma_emisor=signature#,
        # firma_admin=None
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({'message': 'Unido al condominio y estado de cuenta registrado.', 'id_documento': doc.id}), 201


#PARA OBTENER LA INFORMACIÓN DE UN CONDOMINIO JUNTO A SUS MIEMBROS
@condominios_bp.route('/<int:cid>', methods=['GET'])
@token_required
def get_condominio(current_user, cid):
    rel = CondominioUsuario.query.filter_by(id_condominio=cid, id_usuario=current_user.id).first()
    if not rel:
        return jsonify({'error': 'No pertenece a este condominio'}), 403
    cond = rel.condominio
    # lista de miembros y admin
    # admins = Usuario.query.filter_by(id=cond.id_admin).all()
    # miembros = [u.usuario for u in cond.usuarios if u.usuario.id != cond.id_admin]
    # return jsonify({
    #     'id': cond.id,
    #     'nombre': cond.nombre,
    #     'admins': [{'id': a.id, 'nombre': a.nombre, 'correo': a.correo} for a in admins],
    #     'miembros': [{'id': m.id, 'nombre': m.nombre} for m in miembros]
    # }), 200
    admin = Usuario.query.get(cond.id_admin)
    miembros = [u.usuario.nombre for u in cond.usuarios if u.id_usuario != current_user.id]
    return jsonify({
        'nombre': cond.nombre,
        'codigo': cond.codigo,
        'admin': {'id': admin.id, 'nombre': admin.nombre, 'correo': admin.correo},
        'condominos': miembros
    }), 200

#PARA OBTENER EL ESTADO DE CUENTA MÁS RECIENTE DE UN CONDOMINO
@condominios_bp.route('/<int:cid>/estado', methods=['GET'])
@token_required
def estado_metadata(current_user, cid):
    # metadata del estado de cuenta más reciente
    doc = Documento.query.filter_by(
        id_condominio=cid,
        id_emisor=current_user.id,
        tipo_documento='estado_cuenta'
    ).order_by(Documento.fecha_subida.desc()).first()
    if not doc:
        return jsonify({'exists': False}), 200
    # determinar vigencia (ej: mes actual)
    vigente = doc.fecha_subida.month == datetime.utcnow().month and doc.fecha_subida.year == datetime.utcnow().year
    return jsonify({'exists': True, 'fecha_subida': doc.fecha_subida, 'vigente': vigente}), 200

#PARA DESCIFRAR Y ENVIAR EL ESTADO DE CUENTA COMO PDF
@condominios_bp.route('/<int:cid>/estado/descifrar', methods=['POST'])
@token_required
def descifrar_estado(current_user, cid):
    try:
        print(f"[DEBUG] Descifrar estado - Usuario: {current_user.id}, Condominio: {cid}")
        
        # Verificar que el usuario pertenece al condominio
        relacion = CondominioUsuario.query.filter_by(
            id_condominio=cid,
            id_usuario=current_user.id
        ).first()
        
        if not relacion:
            print(f"[ERROR] Usuario {current_user.id} no pertenece al condominio {cid}")
            return jsonify({'error': 'No perteneces a este condominio'}), 403
        
        # Buscar el documento más reciente
        doc = Documento.query.filter_by(
            id_condominio=cid,
            id_emisor=current_user.id,
            tipo_documento='estado_cuenta'
        ).order_by(Documento.fecha_subida.desc()).first()
        
        if not doc:
            print(f"[ERROR] No se encontró documento para usuario {current_user.id} en condominio {cid}")
            return jsonify({'error': 'No se encontró estado de cuenta'}), 404
        
        print(f"[DEBUG] Documento encontrado: {doc.id}")
        
        # Obtener clave privada del header
        priv_cond_pem = request.headers.get('X-Private-Key')
        if not priv_cond_pem:
            return jsonify({'error': 'Falta clave privada'}), 400
        
        # Obtener el condominio y su admin
        condominio = Condominio.query.get(cid)
        if not condominio:
            print(f"[ERROR] Condominio {cid} no encontrado")
            return jsonify({'error': 'Condominio no encontrado'}), 404
        
        print(f"[DEBUG] Condominio encontrado: {condominio.nombre}, Admin ID: {condominio.id_admin}")
        
        # Obtener admin
        admin = Usuario.query.get(condominio.id_admin)
        if not admin:
            print(f"[ERROR] Admin {condominio.id_admin} no encontrado")
            return jsonify({'error': 'Admin del condominio no encontrado'}), 500
        
        if not admin.clave_publica:
            print(f"[ERROR] Admin {admin.id} no tiene clave pública")
            return jsonify({'error': 'Admin no tiene clave pública configurada'}), 500
        
        print(f"[DEBUG] Admin encontrado: {admin.nombre}")
        
        # Derivar clave y descifrar
        key = derive_shared_key(priv_cond_pem, admin.clave_publica)
        pdf = descifrar_aes_gcm(key, doc.nonce, doc.tag, doc.contenido_cifrado)
        
        print(f"[DEBUG] Descifrado exitoso, tamaño PDF: {len(pdf)} bytes")
        
        return (pdf, 200, {
            'Content-Type': 'application/pdf', 
            'Content-Disposition': f'inline; filename=estado_{cid}.pdf'
        })
        
    except Exception as e:
        print(f"[ERROR] Error en descifrar_estado: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Error interno del servidor'}), 500

#PARA ACTUALIZAR EL ESTADO DE CUENTA (SOLO CONDOMINO)
@condominios_bp.route('/<int:cid>/estado/actualizar', methods=['POST'])
@token_required
def actualizar_estado(current_user, cid):
    try:
        print(f"[DEBUG] Actualizar estado - Usuario: {current_user.id}, Condominio: {cid}")
        
        # Verificar que el usuario pertenece al condominio
        relacion = CondominioUsuario.query.filter_by(
            id_condominio=cid,
            id_usuario=current_user.id
        ).first()
        
        if not relacion:
            return jsonify({'error': 'No perteneces a este condominio'}), 403
        
        archivo = request.files.get('estado_de_cuenta')
        if not archivo:
            return jsonify({'error': 'Falta archivo'}), 400
        
        datos = archivo.read()
        priv_cond_pem = request.headers.get('X-Private-Key')
        
        if not priv_cond_pem:
            return jsonify({'error': 'Falta clave privada'}), 400
        
        # Obtener el condominio y su admin
        condominio = Condominio.query.get(cid)
        if not condominio:
            return jsonify({'error': 'Condominio no encontrado'}), 404
        
        admin = Usuario.query.get(condominio.id_admin)
        if not admin or not admin.clave_publica:
            return jsonify({'error': 'Admin no tiene clave pública configurada'}), 500
        
        # Cifrar y firmar
        key = derive_shared_key(priv_cond_pem, admin.clave_publica)
        nonce, ciphertext, tag = cifrar_aes_gcm(key, datos)
        signature = firmar_datos(priv_cond_pem, ciphertext)
        
        doc = Documento(
            id_emisor=current_user.id,
            id_condominio=cid,
            tipo_documento='estado_cuenta',
            contenido_cifrado=ciphertext,
            nonce=nonce,
            tag=tag,
            firma_emisor=signature
        )
        db.session.add(doc)
        db.session.commit()
        
        print(f"[DEBUG] Estado actualizado exitosamente, documento ID: {doc.id}")
        return jsonify({'message': 'Estado de cuenta actualizado.', 'id_documento': doc.id}), 201
        
    except Exception as e:
        print(f"[ERROR] Error en actualizar_estado: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Error interno del servidor'}), 500

#PARA VALIDAR CÓDIGO DE CONDOMINIO
@condominios_bp.route('/validate-code', methods=['POST'])
@token_required
def validate_code(current_user):
    """Validar código de condominio"""
    try:
        if current_user.rol != 'condomino':
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.get_json()
        if not data or 'codigo' not in data:
            return jsonify({'error': 'Se requiere el código'}), 400
        
        codigo = data['codigo']
        condominio = Condominio.query.filter_by(codigo=codigo).first()
        
        if not condominio:
            return jsonify({'error': 'Código de condominio inválido'}), 404
        
        # Verificar si el usuario ya pertenece a este condominio
        ya_miembro = CondominioUsuario.query.filter_by(
            id_condominio=condominio.id,
            id_usuario=current_user.id
        ).first()
        
        if ya_miembro:
            return jsonify({'error': 'Ya perteneces a este condominio'}), 400
        
        # Obtener información del admin
        admin = Usuario.query.get(condominio.id_admin)
        
        return jsonify({
            'valid': True,
            'condominio': {
                'id': condominio.id,
                'nombre': condominio.nombre,
                'direccion': condominio.direccion,
                'admin': {
                    'nombre': admin.nombre if admin else 'N/A',
                    'correo': admin.correo if admin else 'N/A'
                }
            }
        }), 200
        
    except Exception as e:
        print(f"Error en validate_code: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

#PARA OBTENER MIEMBROS DE UN CONDOMINIO
@condominios_bp.route('/<int:condominio_id>/miembros', methods=['GET'])
@token_required
def get_miembros(current_user, condominio_id):
    """Obtener miembros de un condominio"""
    try:
        # Verificar que el usuario tenga acceso al condominio
        if current_user.rol == 'admin':
            # Admin debe ser dueño del condominio
            condominio = Condominio.query.filter_by(id=condominio_id, id_admin=current_user.id).first()
        else:
            # Condómino debe pertenecer al condominio
            relacion = CondominioUsuario.query.filter_by(
                id_condominio=condominio_id,
                id_usuario=current_user.id
            ).first()
            condominio = Condominio.query.get(condominio_id) if relacion else None
        
        if not condominio:
            return jsonify({'error': 'No autorizado para ver este condominio'}), 403
        
        # Obtener admin
        admin = Usuario.query.get(condominio.id_admin)
        
        # Obtener condóminos
        condominos = db.session.query(Usuario).join(CondominioUsuario).filter(
            CondominioUsuario.id_condominio == condominio_id,
            Usuario.rol == 'condomino'
        ).all()
        
        resultado = {
            'condominio': {
                'id': condominio.id,
                'nombre': condominio.nombre,
                'direccion': condominio.direccion
            },
            'admin': {
                'id': admin.id,
                'nombre': admin.nombre,
                'correo': admin.correo
            } if admin else None,
            'condominos': [{
                'id': c.id,
                'nombre': c.nombre,
                'correo': c.correo,
                'verificado': c.is_verified
            } for c in condominos]
        }
        
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"Error en get_miembros: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500