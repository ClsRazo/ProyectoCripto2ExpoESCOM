#!/usr/bin/env python3
"""
Script para probar el descifrado de estado de cuenta paso a paso
"""
import os
import sys
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
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
        if connection.is_connected():
            print("✅ Conexión exitosa a la base de datos RDS")
            return connection
    except Error as e:
        print(f"❌ Error al conectar a MySQL: {e}")
        return None

def test_descifrado(connection, usuario_id, condominio_id):
    """Probar el descifrado paso a paso"""
    cursor = connection.cursor(dictionary=True)
    
    print(f"\n🔍 PRUEBA DE DESCIFRADO: Usuario {usuario_id}, Condominio {condominio_id}")
    print("=" * 70)
    
    # 1. Obtener documento más reciente
    cursor.execute("""
        SELECT id, contenido_cifrado, nonce, tag, firma_emisor, fecha_subida
        FROM documentos 
        WHERE id_emisor = %s AND id_condominio = %s AND tipo_documento = 'estado_cuenta'
        ORDER BY fecha_subida DESC
        LIMIT 1
    """, (usuario_id, condominio_id))
    
    doc = cursor.fetchone()
    if not doc:
        print("❌ No se encontró documento")
        return
    
    print(f"📄 Documento encontrado: ID {doc['id']}")
    print(f"   Fecha: {doc['fecha_subida']}")
    print(f"   Contenido cifrado: {len(doc['contenido_cifrado'])} bytes")
    print(f"   Nonce: {len(doc['nonce'])} bytes")
    print(f"   Tag: {len(doc['tag'])} bytes")
    print(f"   Firma: {len(doc['firma_emisor'])} bytes")
    
    # 2. Obtener claves
    cursor.execute("""
        SELECT u.nombre as usuario_nombre, u.clave_publica as usuario_clave,
               c.nombre as condominio_nombre, c.id_admin,
               admin.nombre as admin_nombre, admin.clave_publica as admin_clave
        FROM usuarios u
        JOIN condominios c ON 1=1
        JOIN usuarios admin ON admin.id = c.id_admin
        WHERE u.id = %s AND c.id = %s
    """, (usuario_id, condominio_id))
    
    info = cursor.fetchone()
    if not info:
        print("❌ No se encontró información de usuario/condominio")
        return
    
    print(f"👤 Usuario: {info['usuario_nombre']}")
    print(f"🏠 Condominio: {info['condominio_nombre']}")
    print(f"👨‍💼 Admin: {info['admin_nombre']}")
    
    # Simular clave privada del usuario (normalmente viene del frontend)
    print("\n⚠️  NECESITAS PROPORCIONAR LA CLAVE PRIVADA DEL USUARIO")
    print("En el frontend, esta clave se envía en el header 'X-Private-Key'")
    print("Por favor, copia y pega la clave privada PEM del usuario:")
    print("(Empieza con -----BEGIN PRIVATE KEY-----)")
    
    # Leer clave privada de entrada
    private_key_lines = []
    print("\nPega la clave privada (presiona Enter dos veces para terminar):")
    
    while True:
        line = input()
        if line.strip() == "" and len(private_key_lines) > 0:
            break
        private_key_lines.append(line)
    
    private_key_pem = "\n".join(private_key_lines)
    
    if not private_key_pem.strip():
        print("❌ No se proporcionó clave privada")
        return
    
    try:
        print("\n🔑 Probando derivación de clave compartida...")
        shared_key = derive_shared_key(private_key_pem, info['admin_clave'])
        print(f"✅ Clave compartida derivada: {len(shared_key)} bytes")
        print(f"   Hex: {shared_key.hex()[:32]}...")
        
        print("\n🔓 Probando descifrado...")
        decrypted_data = descifrar_aes_gcm(
            shared_key, 
            doc['nonce'], 
            doc['tag'], 
            doc['contenido_cifrado']
        )
        print(f"✅ Descifrado exitoso: {len(decrypted_data)} bytes")
        
        # Verificar que es un PDF
        if decrypted_data.startswith(b'%PDF'):
            print("✅ El archivo descifrado es un PDF válido")
            
            # Guardar para verificar
            with open('estado_descifrado_test.pdf', 'wb') as f:
                f.write(decrypted_data)
            print("💾 Archivo guardado como 'estado_descifrado_test.pdf'")
        else:
            print("⚠️  El archivo descifrado no parece ser un PDF")
            print(f"   Primeros 20 bytes: {decrypted_data[:20]}")
        
    except Exception as e:
        print(f"❌ Error durante el descifrado: {e}")
        import traceback
        traceback.print_exc()
    
    cursor.close()

def main():
    connection = conectar_bd()
    if not connection:
        return
    
    try:
        print("Usuarios y condominios disponibles:")
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT u.id as usuario_id, u.nombre as usuario_nombre, 
                   c.id as condominio_id, c.nombre as condominio_nombre
            FROM usuarios u
            JOIN condominio_usuarios cu ON u.id = cu.id_usuario
            JOIN condominios c ON cu.id_condominio = c.id
            WHERE u.rol = 'condomino'
            ORDER BY u.id, c.id
        """)
        
        resultados = cursor.fetchall()
        for row in resultados:
            print(f"👤 {row['usuario_nombre']} (ID: {row['usuario_id']}) -> 🏠 {row['condominio_nombre']} (ID: {row['condominio_id']})")
        
        cursor.close()
        
        # Pedir datos para la prueba
        print("\n" + "="*50)
        usuario_id = input("ID del usuario para probar: ").strip()
        condominio_id = input("ID del condominio: ").strip()
        
        if usuario_id and condominio_id:
            test_descifrado(connection, int(usuario_id), int(condominio_id))
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if connection.is_connected():
            connection.close()
            print("\n🔌 Conexión cerrada")

if __name__ == "__main__":
    main()
