#!/usr/bin/env python3
"""
Script simple para probar descifrado con clave desde archivo
"""
import os
import sys
from dotenv import load_dotenv
import mysql.connector
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from crypto_utils import derive_shared_key, descifrar_aes_gcm

# Cargar variables de entorno
load_dotenv()

def conectar_bd():
    """Conectar a la base de datos RDS"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DATABASE_HOST'),
            database=os.getenv('DATABASE_NAME'),
            user=os.getenv('DATABASE_USER'),
            password=os.getenv('DATABASE_PASSWORD'),
            port=int(os.getenv('DATABASE_PORT', 3306))
        )
        return connection
    except Exception as e:
        print(f"❌ Error al conectar: {e}")
        return None

def main():
    # IDs del caso problemático
    usuario_id = 9
    condominio_id = 2
    
    connection = conectar_bd()
    if not connection:
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener documento
        cursor.execute("""
            SELECT contenido_cifrado, nonce, tag
            FROM documentos 
            WHERE id_emisor = %s AND id_condominio = %s AND tipo_documento = 'estado_cuenta'
            ORDER BY fecha_subida DESC
            LIMIT 1
        """, (usuario_id, condominio_id))
        
        doc = cursor.fetchone()
        if not doc:
            print("❌ No se encontró documento")
            return
        
        # Obtener clave pública del admin
        cursor.execute("""
            SELECT admin.clave_publica
            FROM condominios c
            JOIN usuarios admin ON admin.id = c.id_admin
            WHERE c.id = %s
        """, (condominio_id,))
        
        admin_info = cursor.fetchone()
        if not admin_info:
            print("❌ No se encontró admin")
            return
        
        # Leer clave privada del archivo
        with open('clave_temp.pem', 'r') as f:
            private_key_pem = f.read()
        
        print("🔑 Derivando clave compartida...")
        shared_key = derive_shared_key(private_key_pem, admin_info['clave_publica'])
        print(f"✅ Clave derivada: {shared_key.hex()[:16]}...")
        
        print("🔓 Intentando descifrar...")
        decrypted_data = descifrar_aes_gcm(
            shared_key, 
            doc['nonce'], 
            doc['tag'], 
            doc['contenido_cifrado']
        )
        
        print(f"✅ Descifrado exitoso: {len(decrypted_data)} bytes")
        
        if decrypted_data.startswith(b'%PDF'):
            print("✅ Es un PDF válido")
        else:
            print(f"⚠️  Primeros bytes: {decrypted_data[:20]}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    main()
