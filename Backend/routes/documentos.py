from flask import Blueprint, request, jsonify
from app import db
from models import Documento, Usuario
from crypto_utils import firmar_datos, verificar_firma
from routes.auth import token_required

documentos_bp = Blueprint('documentos', __name__)

#PARA DESCARGAR BALANCE GENERAL DESDE UN CONDOMINIO (SOLO CONDOMINOS)
@documentos_bp.route('/condominio/<int:cid>/balance', methods=['GET'])
@token_required
def descargar_balance(current_user, cid):
    if current_user.rol != 'condomino':
        return jsonify({'error': 'No autorizado'}), 403
    doc = Documento.query.filter_by(
        id_condominio=cid,
        tipo_documento='balance_general'
    ).order_by(Documento.fecha_subida.desc()).first_or_404()
    pub_admin_pem = Usuario.query.get(doc.id_emisor).clave_publica
    if not verificar_firma(pub_admin_pem, doc.contenido_cifrado, doc.firma_emisor):
        return jsonify({'error': 'Firma inválida'}), 400
    return (
        doc.contenido_cifrado,
        200,
        {'Content-Type': 'application/pdf', 'Content-Disposition': f'inline; filename=balance_{cid}.pdf'}
    )

#PARA FIRMAR UN COMPROBANTE DE PAGO (SOLO CONDOMINOS)
@documentos_bp.route('/comprobante/firmar', methods=['POST'])
@token_required
def firmar_comprobante(current_user):
    if current_user.rol != 'condomino':
        return jsonify({'error': 'No autorizado'}), 403
    archivo = request.files.get('comprobante')
    priv_cond_pem = request.headers.get('X-Private-Key')
    if not archivo or not priv_cond_pem:
        return jsonify({'error': 'Falta comprobante o clave privada'}), 400
    datos = archivo.read()
    signature = firmar_datos(priv_cond_pem, datos)
    return jsonify({'firma': signature.hex(), 'message': 'Comprobante firmado correctamente'}), 200