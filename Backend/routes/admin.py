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
        # Contar solo condóminos verificados (excluir al admin)
        num = db.session.query(CondominioUsuario)\
            .join(Usuario, CondominioUsuario.id_usuario == Usuario.id)\
            .filter(CondominioUsuario.id_condominio == c.id)\
            .filter(Usuario.is_verified == True)\
            .filter(Usuario.rol == 'condomino')\
            .count()
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
    
    # Obtener y decodificar la clave privada del header
    priv_admin_pem_base64 = request.headers.get('X-Private-Key')
    if not priv_admin_pem_base64:
        return jsonify({'error': 'Falta la clave privada del admin'}), 400
    
    try:
        import base64
        priv_admin_pem = base64.b64decode(priv_admin_pem_base64).decode('utf-8')
        print(f"Clave privada decodificada correctamente")
    except Exception as e:
        print(f"Error al decodificar la clave privada: {e}")
        return jsonify({'error': 'Error al decodificar la clave privada'}), 400
    
    pub_cond_pem = Usuario.query.get(uid).clave_publica
    if not pub_cond_pem:
        return jsonify({'error': 'El condómino no tiene clave pública'}), 400
    
    try:
        key = derive_shared_key(priv_admin_pem, pub_cond_pem)
        pdf = descifrar_aes_gcm(key, doc.nonce, doc.tag, doc.contenido_cifrado)
        return (pdf, 200, {'Content-Type': 'application/pdf', 'Content-Disposition': f'inline; filename=estado_{uid}.pdf'})
    except Exception as e:
        print(f"Error al descifrar el estado de cuenta: {e}")
        return jsonify({'error': 'Error al descifrar el documento'}), 500

#PARA QUE EL ADMIN VEA LOS COMPROBANTES DE PAGO DE UN CONDOMINO
@admin_bp.route('/condominio/<int:cid>/condominos/<int:uid>/comprobantes', methods=['GET'])
@token_required
def listar_comprobantes(current_user, cid, uid):
    """Listar los comprobantes de pago firmados de un condómino"""
    # Permitir tanto a admins como a condóminos
    if current_user.rol not in ['admin', 'condomino']:
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        # Verificar acceso según el rol
        condominio = Condominio.query.get(cid)
        if not condominio:
            return jsonify({'error': 'Condominio no encontrado'}), 404
        
        if current_user.rol == 'admin':
            # El admin debe ser dueño del condominio
            if condominio.id_admin != current_user.id:
                return jsonify({'error': 'No autorizado para este condominio'}), 403
        elif current_user.rol == 'condomino':
            # El condómino debe pertenecer al condominio y solo puede ver sus propios comprobantes
            asociacion = CondominioUsuario.query.filter_by(
                id_condominio=cid, 
                id_usuario=current_user.id
            ).first()
            if not asociacion:
                return jsonify({'error': 'No perteneces a este condominio'}), 403
            # Los condóminos solo pueden ver sus propios comprobantes
            if uid != current_user.id:
                return jsonify({'error': 'Solo puedes ver tus propios comprobantes'}), 403        
        # Buscar documentos de comprobantes de pago relacionados con el condómino
        # Los comprobantes pueden ser firmados por el admin (nuevo flujo) o por el condómino (flujo anterior)
        docs = Documento.query.filter(
            Documento.id_condominio == cid,
            Documento.tipo_documento == 'comprobante_pago',
            # Comprobantes firmados por el condómino O firmados por el admin para este condómino
            # (En el nuevo flujo, usaremos el motivo como identificador temporal)
            # Todos los comprobantes de pago en el condominio son visibles
        ).order_by(Documento.fecha_subida.desc()).all()
        
        # Obtener información del condómino
        condomino = Usuario.query.get(uid)
        
        comprobantes = []
        for doc in docs:
            comprobantes.append({
                'id': doc.id,
                'fecha_subida': doc.fecha_subida.isoformat(),
                'tiene_firma': bool(doc.firma_emisor or doc.firma_admin),  # Firma del condómino o del admin
                'motivo': doc.motivo,  # Incluir el motivo
                'firmado_por_admin': bool(doc.firma_admin),  # Indicar si fue firmado por admin
                'tipo_firma': 'Admin' if doc.firma_admin else ('Condómino' if doc.firma_emisor else 'Sin firma')
            })
        
        return jsonify({
            'condomino': {
                'id': condomino.id,
                'nombre': condomino.nombre,
                'correo': condomino.correo
            } if condomino else None,
            'comprobantes': comprobantes
        }), 200
        
    except Exception as e:
        print(f"Error en listar_comprobantes: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

#PARA VERIFICAR UN COMPROBANTE DE PAGO
@admin_bp.route('/comprobante/verificar', methods=['POST'])
@token_required
def verificar_comprobante(current_user):
    """Verificar la firma de un comprobante de pago"""
    # Permitir tanto a admins como a condóminos
    if current_user.rol not in ['admin', 'condomino']:
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        # Obtener archivos del request
        comprobante_file = request.files.get('comprobante')
        if not comprobante_file:
            return jsonify({'error': 'Se requiere el archivo del comprobante'}), 400
        
        # Obtener parámetros
        id_condomino = request.form.get('id_condomino')
        if not id_condomino:
            return jsonify({'error': 'Se requiere el ID del condómino'}), 400
        
        # Leer el contenido del comprobante
        datos_comprobante = comprobante_file.read()
        
        print(f"Verificando comprobante para condómino ID: {id_condomino}")
        print(f"Tamaño del archivo: {len(datos_comprobante)} bytes")
        
        # Buscar el condómino
        condomino = Usuario.query.get(id_condomino)
        if not condomino:
            return jsonify({'error': 'Condómino no encontrado'}), 404
        
        if not condomino.clave_publica:
            return jsonify({'error': 'El condómino no tiene clave pública registrada'}), 400
          # Buscar si hay un documento de comprobante firmado que coincida
        # En el nuevo flujo, los comprobantes son firmados por el admin
        from datetime import datetime, timedelta
        
        # Buscar documentos de comprobantes de pago en el condominio del usuario
        # Buscar en los condominios donde pertenece el usuario
        condominios_usuario = CondominioUsuario.query.filter_by(id_usuario=int(id_condomino)).all()
        
        firma_valida = False
        doc_encontrado = None
        
        for cu in condominios_usuario:
            # Buscar comprobantes firmados por admin en este condominio
            recent_docs = Documento.query.filter_by(
                id_condominio=cu.id_condominio,
                tipo_documento='comprobante_pago'
            ).filter(
                Documento.fecha_subida >= datetime.utcnow() - timedelta(days=30),
                Documento.firma_admin.isnot(None)  # Solo documentos firmados por admin
            ).all()
            
            for doc in recent_docs:
                if doc.firma_admin:
                    # Obtener clave pública del admin que firmó
                    admin = Usuario.query.get(doc.id_emisor)
                    if admin and admin.clave_publica:
                        try:
                            # Verificar si la firma del admin es válida para este documento
                            if verificar_firma(admin.clave_publica, datos_comprobante, doc.firma_admin):
                                firma_valida = True
                                doc_encontrado = doc
                                break
                        except Exception as e:
                            print(f"Error verificando firma del admin para documento {doc.id}: {e}")
                            continue
            
            if firma_valida:
                break
        
        resultado = {
            'firma_valida': firma_valida,
            'condomino': {
                'id': condomino.id,
                'nombre': condomino.nombre,
                'correo': condomino.correo
            }
        }
        
        if doc_encontrado:
            resultado['documento'] = {
                'id': doc_encontrado.id,
                'fecha_firma': doc_encontrado.fecha_subida.isoformat()
            }
        
        print(f"Resultado verificación: {resultado}")
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"Error en verificar_comprobante: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error interno del servidor'}), 500

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

@admin_bp.route('/perfil', methods=['GET'])
@token_required
def get_perfil(current_user):
    """Obtener información del perfil del admin"""
    try:
        if current_user.rol != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        
        # Obtener información de condominios administrados
        condominios = Condominio.query.filter_by(id_admin=current_user.id).all()
        condominios_info = []
        
        for condominio in condominios:
            num_usuarios = CondominioUsuario.query.filter_by(id_condominio=condominio.id).count()
            condominios_info.append({
                'id': condominio.id,
                'nombre': condominio.nombre,
                'direccion': condominio.direccion,
                'codigo': condominio.codigo,
                'num_usuarios': num_usuarios,
                'fecha_creacion': condominio.fecha_creacion.isoformat() if condominio.fecha_creacion else None
            })
        
        return jsonify({
            'usuario': {
                'id': current_user.id,
                'nombre': current_user.nombre,
                'correo': current_user.correo,
                'rol': current_user.rol,
                'verificado': current_user.is_verified,
                'fecha_creacion': current_user.fecha_creacion.isoformat()
            },
            'condominios': condominios_info,
            'total_condominios': len(condominios_info)
        }), 200
        
    except Exception as e:
        print(f"Error en get_perfil admin: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@admin_bp.route('/perfil', methods=['PUT'])
@token_required
def update_perfil(current_user):
    """Actualizar información del perfil del admin"""
    try:
        if current_user.rol != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se enviaron datos'}), 400
        
        # Actualizar solo el nombre (no el correo para admin)
        if 'nombre' in data:
            current_user.nombre = data['nombre']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Perfil actualizado exitosamente',
            'usuario': {
                'id': current_user.id,
                'nombre': current_user.nombre,
                'correo': current_user.correo,
                'rol': current_user.rol
            }
        }), 200
        
    except Exception as e:
        print(f"Error en update_perfil admin: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

#PARA QUE EL ADMIN FIRME UN COMPROBANTE DE PAGO
@admin_bp.route('/comprobante/firmar', methods=['POST'])
@token_required
def firmar_comprobante(current_user):
    """Firmar un comprobante de pago y guardarlo en la base de datos"""
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    
    try:
        # Obtener los datos del formulario
        comprobante_file = request.files.get('comprobante')
        motivo = request.form.get('motivo')
        clave_privada = request.form.get('clave_privada')
        id_condominio = request.form.get('id_condominio')
        id_condomino = request.form.get('id_condomino')
        
        # Validar que se proporcionen todos los datos necesarios
        if not comprobante_file:
            return jsonify({'error': 'Se requiere el archivo del comprobante'}), 400
        
        if not motivo or not motivo.strip():
            return jsonify({'error': 'Se requiere el motivo del comprobante'}), 400
            
        if not clave_privada:
            return jsonify({'error': 'Se requiere la clave privada'}), 400
        
        if not id_condominio or not id_condomino:
            return jsonify({'error': 'Se requiere ID del condominio y condómino'}), 400
        
        # Verificar que el condominio pertenece al admin
        condominio = Condominio.query.filter_by(id=id_condominio, id_admin=current_user.id).first()
        if not condominio:
            return jsonify({'error': 'Condominio no encontrado o no autorizado'}), 404
        
        # Verificar que el condómino existe y pertenece al condominio
        condomino = Usuario.query.get(id_condomino)
        if not condomino:
            return jsonify({'error': 'Condómino no encontrado'}), 404
        
        # Verificar que el condómino pertenece al condominio
        asociacion = CondominioUsuario.query.filter_by(
            id_condominio=id_condominio, 
            id_usuario=id_condomino
        ).first()
        if not asociacion:
            return jsonify({'error': 'El condómino no pertenece a este condominio'}), 400
          # Leer el contenido del comprobante
        datos_comprobante = comprobante_file.read()
        
        # Firmar el comprobante con la clave privada del admin
        firma = firmar_datos(clave_privada, datos_comprobante)
        
        # Crear el registro en la base de datos
        nuevo_documento = Documento(
            id_emisor=current_user.id,  # El admin es quien firma
            id_condominio=id_condominio,
            tipo_documento='comprobante_pago',
            contenido_cifrado=None,  # No guardamos el PDF, solo la firma
            nonce=None,
            tag=None, 
            firma_emisor=None,  # No es firmado por el condómino
            firma_admin=firma,  # Firma del admin
            motivo=motivo.strip()  # Agregar el motivo
        )        
        db.session.add(nuevo_documento)
        db.session.commit()
        
        # Retornar confirmación de éxito
        return jsonify({
            'message': 'Comprobante firmado exitosamente',
            'documento_id': nuevo_documento.id,
            'condomino': condomino.nombre,
            'motivo': motivo,
            'fecha_firma': nuevo_documento.fecha_subida.isoformat()
        }), 200
        
    except Exception as e:
        print(f"Error en firmar_comprobante: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500