from flask import Blueprint, request, send_file
from crypto_utils import derive_shared_key, cifrar_aes_gcm, descifrar_aes_gcm, firmar_datos, verificar_firma
# ... endpoints para subir estado cifrado, descargar/descifrar, firmar comprobantes, etc. ...

documentos_bp = Blueprint('documentos', __name__)
