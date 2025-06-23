from flask import Blueprint, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from models import Usuario, Condominio, CondominioUsuario, Documento
from app import db
from routes.auth import token_required
from crypto_utils import firmar_datos, verificar_firma, derive_shared_key, descifrar_aes_gcm
import io
import tempfile
import os
from datetime import datetime, timedelta
import base64
import json

condomino_bp = Blueprint('condomino', __name__)

@condomino_bp.route('/perfil', methods=['GET'])
@token_required
def get_perfil(current_user):
    """Obtener información del perfil del condómino"""
    try:
        if current_user.rol != 'condomino':
            return jsonify({'error': 'No autorizado'}), 403
        
        # Obtener información del condominio si pertenece a uno
        condominio_usuario = CondominioUsuario.query.filter_by(id_usuario=current_user.id).first()
        condominio_info = None
        
        if condominio_usuario:
            condominio = Condominio.query.get(condominio_usuario.id_condominio)
            if condominio:
                condominio_info = {
                    'id': condominio.id,
                    'nombre': condominio.nombre,
                    'direccion': condominio.direccion,
                    'fecha_union': condominio_usuario.fecha_union.isoformat()
                }
          # Obtener último estado de cuenta
        ultimo_estado = Documento.query.filter_by(
            id_emisor=current_user.id,
            tipo_documento='estado_cuenta'
        ).order_by(Documento.fecha_subida.desc()).first()
        
        estado_info = None
        if ultimo_estado:
            estado_info = {
                'fecha_subida': ultimo_estado.fecha_subida.isoformat(),
                'vigente': es_documento_vigente(ultimo_estado)
            }
        
        return jsonify({
            'usuario': {
                'id': current_user.id,
                'nombre': current_user.nombre,
                'correo': current_user.correo,
                'rol': current_user.rol,
                'verificado': current_user.is_verified,
                'fecha_creacion': current_user.fecha_creacion.isoformat()
            },
            'condominio': condominio_info,
            'ultimo_estado_cuenta': estado_info
        }), 200
        
    except Exception as e:
        print(f"Error en get_perfil: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@condomino_bp.route('/perfil', methods=['PUT'])
@token_required
def update_perfil(current_user):
    """Actualizar información del perfil del condómino"""
    try:
        if current_user.rol != 'condomino':
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se enviaron datos'}), 400
        
        # Actualizar campos permitidos
        if 'nombre' in data:
            current_user.nombre = data['nombre']
        if 'correo' in data:
            # Verificar que el correo no esté en uso por otro usuario
            existing_user = Usuario.query.filter_by(correo=data['correo']).first()
            if existing_user and existing_user.id != current_user.id:
                return jsonify({'error': 'El correo ya está en uso'}), 400
            current_user.correo = data['correo']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Perfil actualizado exitosamente',
            'usuario': {
                'id': current_user.id,
                'nombre': current_user.nombre,
                'correo': current_user.correo,
                'rol': current_user.rol
            }
        }, 200)
        
    except Exception as e:
        print(f"Error en update_perfil: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error interno del servidor'}), 500

@condomino_bp.route('/estado-cuenta', methods=['POST'])
@token_required
def get_estado_cuenta(current_user):
    """Obtener y descifrar el estado de cuenta del condómino"""
    try:
        if current_user.rol != 'condomino':
            return jsonify({'error': 'No autorizado'}), 403
        
        # Obtener clave privada del form
        clave_privada_file = request.files.get('clave_privada')
        if not clave_privada_file:
            return jsonify({'error': 'Se requiere la clave privada'}), 400
        
        # Leer clave privada
        clave_privada_pem = clave_privada_file.read().decode('utf-8')
        
        # Buscar el último estado de cuenta del usuario
        estado_doc = Documento.query.filter_by(
            id_emisor=current_user.id,
            tipo_documento='estado_cuenta'        ).order_by(Documento.fecha_subida.desc()).first()
        
        if not estado_doc:
            return jsonify({'error': 'No se encontró estado de cuenta'}), 404
              # Intentar descifrar el documento si está cifrado
        print(f"Analizando documento - Tamaño: {len(estado_doc.contenido_cifrado)} bytes")
        print(f"Primeros 20 bytes: {estado_doc.contenido_cifrado[:20]}")
        print(f"¿Empieza con ENCRYPTED:? {estado_doc.contenido_cifrado.startswith(b'ENCRYPTED:')}")
        
        try:
            # Verificar qué método de cifrado se usó
            if estado_doc.contenido_cifrado.startswith(b'ENCRYPTED:'):
                print("Documento detectado como cifrado con metadatos embebidos (método nuevo)")
                # Obtener admin para ECDH
                condominio_usuario = CondominioUsuario.query.filter_by(id_usuario=current_user.id).first()
                if not condominio_usuario:
                    return jsonify({'error': 'Usuario no pertenece a ningún condominio'}), 400
                
                admin = obtener_admin_condominio(condominio_usuario.id_condominio)
                if not admin or not admin.clave_publica:
                    return jsonify({'error': 'No se encontró clave pública del admin'}), 500
                
                # Derivar clave compartida con ECDH
                clave_compartida = derive_shared_key(clave_privada_pem, admin.clave_publica)
                
                # Extraer metadatos del documento cifrado
                metadata_str = estado_doc.contenido_cifrado[10:].split(b'|||')[0].decode('utf-8')
                metadata = json.loads(metadata_str)
                
                nonce = base64.b64decode(metadata['nonce'])
                tag = base64.b64decode(metadata['tag'])
                ciphertext = base64.b64decode(metadata['ciphertext'])
                
                # Descifrar
                contenido_pdf = descifrar_aes_gcm(clave_compartida, nonce, tag, ciphertext)
                print("✓ Documento descifrado exitosamente (método nuevo)")
                
            elif estado_doc.nonce and estado_doc.tag:
                print("Documento detectado como cifrado con columnas separadas (método viejo)")
                # Método viejo con columnas separadas
                condominio_usuario = CondominioUsuario.query.filter_by(id_usuario=current_user.id).first()
                if not condominio_usuario:
                    return jsonify({'error': 'Usuario no pertenece a ningún condominio'}), 400
                
                admin = obtener_admin_condominio(condominio_usuario.id_condominio)
                if not admin or not admin.clave_publica:
                    return jsonify({'error': 'No se encontró clave pública del admin'}), 500
                
                print(f"Admin encontrado: {admin.nombre}")
                print(f"Tiene clave pública: {bool(admin.clave_publica)}")
                
                # Derivar clave compartida con ECDH
                clave_compartida = derive_shared_key(clave_privada_pem, admin.clave_publica)
                print("✓ Clave compartida derivada")
                
                # Usar nonce y tag de las columnas separadas
                nonce = estado_doc.nonce
                tag = estado_doc.tag
                ciphertext = estado_doc.contenido_cifrado
                
                print(f"Nonce: {len(nonce)} bytes, Tag: {len(tag)} bytes, Ciphertext: {len(ciphertext)} bytes")
                
                # Descifrar
                contenido_pdf = descifrar_aes_gcm(clave_compartida, nonce, tag, ciphertext)
                print("✓ Documento descifrado exitosamente (método viejo)")
                
            else:
                print("Documento NO está cifrado, usando contenido directo")
                # Documento no cifrado (para compatibilidad)
                contenido_pdf = estado_doc.contenido_cifrado
                
        except Exception as e:
            print(f"Error descifrando documento: {str(e)}")
            # Intentar retornar el documento sin descifrar
            contenido_pdf = estado_doc.contenido_cifrado
        
        print(f"Contenido PDF final - Tamaño: {len(contenido_pdf)} bytes")
        print(f"Primeros 10 bytes: {contenido_pdf[:10]}")
        
        # Verificar si es un PDF válido
        if contenido_pdf.startswith(b'%PDF'):
            print("✓ El contenido parece ser un PDF válido")
        else:
            print("✗ El contenido NO parece ser un PDF válido")
            print(f"Contenido como string: {contenido_pdf[:50]}")
        
        # Crear respuesta con el PDF
        return send_file(
            io.BytesIO(contenido_pdf),
            as_attachment=False,
            download_name='estado_cuenta.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error en get_estado_cuenta: {str(e)}")
        return jsonify({'error': 'Error al obtener el estado de cuenta'}), 500

@condomino_bp.route('/estado-cuenta/actualizar', methods=['POST'])
@token_required
def actualizar_estado_cuenta(current_user):
    """Actualizar el estado de cuenta del condómino"""
    try:
        if current_user.rol != 'condomino':
            return jsonify({'error': 'No autorizado'}), 403
        
        archivo = request.files.get('estado_de_cuenta')
        clave_privada_file = request.files.get('clave_privada')
        
        if not archivo or not clave_privada_file:
            return jsonify({'error': 'Se requiere el archivo y la clave privada'}), 400
        
        # Leer archivos
        datos_pdf = archivo.read()
        clave_privada_pem = clave_privada_file.read().decode('utf-8')
        
        # Obtener condominio del usuario
        condominio_usuario = CondominioUsuario.query.filter_by(id_usuario=current_user.id).first()
        if not condominio_usuario:
            return jsonify({'error': 'Usuario no pertenece a ningún condominio'}), 400
        
        # TODO: Implementar cifrado con ECDH
        # Por ahora, firmar el documento
        firma = firmar_datos(clave_privada_pem, datos_pdf)
        
        # Crear nuevo documento
        nuevo_estado = Documento(
            id_emisor=current_user.id,
            id_condominio=condominio_usuario.id_condominio,
            tipo_documento='estado_cuenta',
            contenido_cifrado=datos_pdf,  # TODO: cifrar
            firma_emisor=firma
        )
        
        db.session.add(nuevo_estado)
        db.session.commit()
        
        return jsonify({
            'message': 'Estado de cuenta actualizado exitosamente',
            'id_documento': nuevo_estado.id
        }), 201
        
    except Exception as e:
        print(f"Error en actualizar_estado_cuenta: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Error al actualizar el estado de cuenta'}), 500

@condomino_bp.route('/balance-general/<int:condominio_id>', methods=['GET'])
@token_required
def get_balance_general(current_user, condominio_id):
    """Obtener el balance general del condominio"""
    try:
        print(f"=== get_balance_general iniciado ===")
        print(f"Usuario: {current_user.id} - {current_user.nombre}")
        print(f"Condominio ID solicitado: {condominio_id}")
        
        if current_user.rol != 'condomino':
            print(f"Error: usuario no es condómino, rol: {current_user.rol}")
            return jsonify({'error': 'No autorizado'}), 403
        
        # Verificar que el usuario pertenece al condominio
        condominio_usuario = CondominioUsuario.query.filter_by(
            id_usuario=current_user.id,
            id_condominio=condominio_id
        ).first()
        
        print(f"Asociación encontrada: {condominio_usuario}")
        
        if not condominio_usuario:
            print(f"Error: usuario no pertenece al condominio {condominio_id}")
            return jsonify({'error': 'No autorizado para ver este condominio'}), 403        
        # Buscar el último balance general
        print(f"Buscando balance general para condominio {condominio_id}")
        balance_doc = Documento.query.filter_by(
            id_condominio=condominio_id,
            tipo_documento='balance_general'
        ).order_by(Documento.fecha_subida.desc()).first()
        
        print(f"Balance general encontrado: {balance_doc}")
        if balance_doc:
            print(f"- ID: {balance_doc.id}")
            print(f"- Fecha: {balance_doc.fecha_subida}")
            print(f"- Tamaño contenido: {len(balance_doc.contenido_cifrado) if balance_doc.contenido_cifrado else 0} bytes")
        
        if not balance_doc:
            print("Error: No hay balance general disponible")
            return jsonify({'error': 'No hay balance general disponible'}), 404          # Verificar firma del admin
        print(f"Obteniendo admin del condominio {condominio_id}")
        admin = obtener_admin_condominio(condominio_id)
        print(f"Admin encontrado: {admin}")
        if admin:
            print(f"- ID: {admin.id}, Nombre: {admin.nombre}")
            print(f"- Tiene clave pública: {bool(admin.clave_publica)}")
        
        if not admin or not admin.clave_publica:
            print("Error: No se encontró información del admin o no tiene clave pública")
            return jsonify({'error': 'No se encontró información del admin'}), 500
        
        try:
            print("Verificando firma del documento...")
            firma_valida = verificar_firma(
                admin.clave_publica, 
                balance_doc.contenido_cifrado,
                balance_doc.firma_emisor
            )
            
            print(f"Firma válida: {firma_valida}")
            
            if not firma_valida:
                print("Error: La firma del documento no es válida")
                return jsonify({'error': 'La firma del documento no es válida'}), 400
                
        except Exception as e:
            print(f"Error verificando firma: {str(e)}")
            return jsonify({'error': 'Error al verificar la autenticidad del documento'}), 500
        
        # Retornar el PDF
        print("Enviando PDF al cliente...")
        return send_file(
            io.BytesIO(balance_doc.contenido_cifrado),
            as_attachment=False,
            download_name='balance_general.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error en get_balance_general: {str(e)}")
        return jsonify({'error': 'Error al obtener el balance general'}), 500

@condomino_bp.route('/firmar-comprobante', methods=['POST'])
@token_required
def firmar_comprobante(current_user):
    """Firmar un comprobante de pago y guardarlo en la base de datos"""
    try:
        if current_user.rol != 'condomino':
            return jsonify({'error': 'No autorizado'}), 403
        
        clave_privada_file = request.files.get('clave_privada')
        comprobante_file = request.files.get('comprobante_pago')
        id_condominio = request.form.get('id_condominio')
        
        if not clave_privada_file or not comprobante_file:
            return jsonify({'error': 'Se requiere la clave privada y el comprobante'}), 400
        
        if not id_condominio:
            return jsonify({'error': 'Se requiere el ID del condominio'}), 400
        
        # Verificar que el usuario pertenece al condominio
        condominio_usuario = CondominioUsuario.query.filter_by(
            id_usuario=current_user.id,
            id_condominio=int(id_condominio)
        ).first()
        
        if not condominio_usuario:
            return jsonify({'error': 'No perteneces a este condominio'}), 403
        
        # Leer archivos
        clave_privada_pem = clave_privada_file.read().decode('utf-8')
        datos_comprobante = comprobante_file.read()
        
        print(f"Firmando comprobante para usuario {current_user.id}, condominio {id_condominio}")
        print(f"Tamaño del comprobante: {len(datos_comprobante)} bytes")
        
        # Firmar el comprobante
        firma = firmar_datos(clave_privada_pem, datos_comprobante)
        print(f"Firma generada, tamaño: {len(firma)} bytes")
        
        # Guardar en la base de datos
        doc = Documento(
            id_emisor=current_user.id,
            id_condominio=int(id_condominio),
            tipo_documento='comprobante_pago',
            contenido_cifrado=datos_comprobante,  # Guardamos el comprobante original
            firma_emisor=firma
        )
        
        db.session.add(doc)
        db.session.commit()
        
        print(f"Comprobante guardado en BD con ID: {doc.id}")
        
        # Crear archivo temporal para la descarga
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            # Escribir contenido original
            temp_file.write(datos_comprobante)
            temp_file.flush()
            
            # Retornar el archivo para descarga
            return send_file(
                temp_file.name,
                as_attachment=True,
                download_name=f'comprobante_firmado_{current_user.id}_{doc.id}.pdf',
                mimetype='application/pdf'
            )
        
    except Exception as e:
        print(f"Error en firmar_comprobante: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Error al firmar el comprobante'}), 500
    finally:
        # Limpiar archivo temporal
        try:
            if 'temp_file' in locals() and os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        except:
            pass

@condomino_bp.route('/info', methods=['GET'])
@token_required
def get_condomino_info(current_user):
    """Obtener información básica del condómino incluyendo condominio al que pertenece"""
    try:
        if current_user.rol != 'condomino':
            return jsonify({'error': 'No autorizado'}), 403
        
        # Buscar si pertenece a algún condominio
        condominio_usuario = CondominioUsuario.query.filter_by(id_usuario=current_user.id).first()
        
        if condominio_usuario:
            condominio = Condominio.query.get(condominio_usuario.id_condominio)
            condominio_info = {
                'id': condominio.id,
                'nombre': condominio.nombre,
                'direccion': condominio.direccion,
                'fecha_union': condominio_usuario.fecha_union.isoformat()
            }
        else:
            condominio_info = None
        
        return jsonify({
            'usuario': {
                'id': current_user.id,
                'nombre': current_user.nombre,
                'correo': current_user.correo,
                'rol': current_user.rol
            },
            'condominio': condominio_info
        }), 200
        
    except Exception as e:
        print(f"Error en get_condomino_info: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

def es_documento_vigente(documento, dias_vigencia=30):
    """Verifica si un documento está vigente basado en su fecha de subida"""
    if not documento:
        return False
    
    fecha_limite = datetime.utcnow() - timedelta(days=dias_vigencia)
    return documento.fecha_subida > fecha_limite

def obtener_admin_condominio(condominio_id):
    """Obtiene el admin del condominio"""
    print(f"Buscando admin para condominio ID: {condominio_id}")
    
    # Obtener el condominio y su admin directamente
    condominio = Condominio.query.get(condominio_id)
    if not condominio:
        print(f"Condominio {condominio_id} no encontrado")
        return None
    
    print(f"Condominio encontrado: {condominio.nombre}, admin ID: {condominio.id_admin}")
    
    # Obtener el admin directamente por su ID
    admin = Usuario.query.get(condominio.id_admin)
    if admin:
        print(f"Admin encontrado: {admin.nombre} (ID: {admin.id})")
    else:
        print(f"Admin con ID {condominio.id_admin} no encontrado")
    
    return admin