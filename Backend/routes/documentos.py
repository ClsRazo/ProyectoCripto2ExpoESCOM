from flask import Blueprint, request, send_file, jsonify
from crypto_utils import derive_shared_key, cifrar_aes_gcm, descifrar_aes_gcm, firmar_datos, verificar_firma
# ... endpoints para subir estado cifrado, descargar/descifrar, firmar comprobantes, etc. ...

from app import db
from models import Documento
from auth import token_required

documentos_bp = Blueprint('documentos', __name__)

@documentos_bp.route('/subir-balance', methods=['POST'])
@token_required
def subir_balance(current_user):
    # current_user debe ser admin
    if current_user.rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 403

    # Datos del formulario
    id_condominio = request.form.get('id_condominio')
    archivo = request.files.get('archivo')
    if not archivo or not id_condominio:
        return jsonify({'error': 'Falta id_condominio o archivo'}), 400

    # Leemos bytes en memoria
    datos_bytes = archivo.read()

    # Por simplicidad: ciframos TODO el archivo con la clave compartida 
    # (podrías iterar por cada condómino si lo quieres uno a uno)
    # Ejemplo con un solo destino:
    pub_condomino_pem = ...      # cargar clave pública del condómino desde BD
    key = derive_shared_key(current_user.clave_privada_pem, pub_condomino_pem)
    nonce, ciphertext, tag = cifrar_aes_gcm(key, datos_bytes)

    # Guardamos en la base de datos
    doc = Documento(
      id_emisor=current_user.id,
      id_condominio=id_condominio,
      tipo_documento='balance',
      contenido_cifrado=ciphertext,
      nonce=nonce,
      tag=tag,
      firma_admin=None,
      firma_emisor=None
    )
    db.session.add(doc)
    db.session.commit()

    return jsonify({'message': 'Balance cifrado y almacenado correctamente', 'id_documento': doc.id}), 201

@documentos_bp.route('/descargar-balance/<int:id_doc>', methods=['GET'])
@token_required
def descargar_balance(current_user, id_doc):
    # Verificar que sea el condómino correcto
    doc = Documento.query.get_or_404(id_doc)
    if current_user.rol != 'condomino' or doc.id_condominio not in [c.id_condominio for c in current_user.condominios]:
        return jsonify({'error': 'No autorizado'}), 403

    # Derivar de nuevo la clave
    pub_admin_pem = ...  # obtener clave pública del admin
    key = derive_shared_key(current_user.clave_privada_pem, pub_admin_pem)

    # Descifrar
    plaintext = descifrar_aes_gcm(key, doc.nonce, doc.tag, doc.contenido_cifrado)

    # Enviar como archivo adjunto
    return (
      plaintext,
      200,
      {
        'Content-Type': 'application/pdf',  # o el tipo real
        'Content-Disposition': f'attachment; filename=balance_{id_doc}.pdf'
      }
    )