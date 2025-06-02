#-----------------GENERACION DE CLAVES ECC-----------------
# Requiere pycryptodome: pip install pycryptodome
from Crypto.PublicKey import ECC

def generar_par_claves_ec():
    # Genera un objeto ECC con curva NIST P-256
    key = ECC.generate(curve='P-256')
    private_key = key
    public_key = key.public_key()
    return private_key, public_key

def serializar_clave_privada(private_key):
    # Exporta en formato PEM, sin cifrar
    return private_key.export_key(format='PEM')

def serializar_clave_publica(public_key):
    # Exporta en formato PEM (SubjectPublicKeyInfo)
    return public_key.export_key(format='PEM')

from Crypto.Signature import DSS
from Crypto.Hash import SHA256

#-----------------FIRMADO Y VERIFICACION DE DATOS-----------------
# Requiere pycryptodome: pip install pycryptodome
# Usamos ECDSA con SHA-256 para firmar y verificar datos
def firmar_datos(private_key_pem: str, datos_bytes: bytes) -> bytes:
    # 1) Cargar la clave privada desde PEM
    priv_key = ECC.import_key(private_key_pem)
    # 2) Calcular hash SHA-256 del mensaje
    h = SHA256.new(datos_bytes)
    # 3) Crear un objeto firma usando ECDSA, para firmar el hash
    signer = DSS.new(priv_key, 'fips-186-3')
    signature = signer.sign(h)
    return signature  # bytes

def verificar_firma(public_key_pem: str, datos_bytes: bytes, signature: bytes) -> bool:
    #1) Cargar la clave pública desde PEM
    pub_key = ECC.import_key(public_key_pem)
    # 2) Calcular hash SHA-256 del mensaje
    h = SHA256.new(datos_bytes)
    # 3) Verificar la firma usando ECDSA, creando un objeto verificador
    verifier = DSS.new(pub_key, 'fips-186-3')
    try:
        verifier.verify(h, signature)
        return True
    except ValueError:
        return False
    
#-----------------INTERCAMBIO DE CLAVES Y CIFRADO AES-----------------
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import HKDF
from Crypto.Random import get_random_bytes

# from cryptography.hazmat.primitives.kdf.hkdf import HKDF
# from cryptography.hazmat.primitives import hashes

def derive_shared_key(py_priv_key_pem: str, py_pub_key_pem: str) -> bytes:
    # 1) Importar claves
    priv_key = ECC.import_key(py_priv_key_pem)
    pub_key = ECC.import_key(py_pub_key_pem)
    # 2) ECDH: generar punto compartido
    shared_secret_point = priv_key.d * pub_key.pointQ
    # 3) Obtener bytes del X de shared_secret_point (coordenada X en entero)
    #    La librería no expone un método directo, pero exportamos el secreto en formato DER  
    #    y luego hacemos un hash (o usar la parte X explícitamente).
    #    Una manera sencilla: exportar el “shared secret” directo con el método export_key()
    shared_secret = shared_secret_point.x.to_bytes(32, 'big')
    # 4) Expandir con HKDF a 24 bytes (192 bits) para AES-192
    key_aes = HKDF(
        master=shared_secret,
        key_len=24,
        salt=None,
        hashmod=SHA256,
        context=b'handshake condominio'
    )
    return key_aes  # 24 bytes

# def derive_shared_key(private_key_a, public_key_b):
#     shared_key = private_key_a.exchange(ec.ECDH(), public_key_b)
#     # Expandir a 24 bytes (192 bits) con HKDF
#     hkdf = HKDF(
#         algorithm=hashes.SHA256(),
#         length=24,  # 24 bytes = 192 bits
#         salt=None,
#         info=b'handshake condominio',
#     )
#     key_aes = hkdf.derive(shared_key)
#     return key_aes  # 24 bytes para AES-192

# Ejemplo de cifrado AES-GCM (AES-192):
def cifrar_aes_gcm(key: bytes, plaintext_bytes: bytes) -> tuple[bytes, bytes, bytes]:
    nonce = get_random_bytes(12)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext_bytes)
    return nonce, ciphertext, tag

def descifrar_aes_gcm(key: bytes, nonce: bytes, tag: bytes, ciphertext: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    data = cipher.decrypt_and_verify(ciphertext, tag)
    return data
