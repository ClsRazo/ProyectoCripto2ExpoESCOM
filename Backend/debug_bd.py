#!/usr/bin/env python3
"""
Script para debuggear problemas en la base de datos
"""
import os
import sys
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

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

def debug_usuario_condominio(connection, usuario_id=None, condominio_id=None):
    """Debug específico para un usuario y condominio"""
    cursor = connection.cursor(dictionary=True)
    
    print(f"\n🔍 DEBUG: Usuario {usuario_id}, Condominio {condominio_id}")
    print("=" * 60)
    
    # 1. Verificar que el usuario existe
    cursor.execute("SELECT id, nombre, correo, rol, clave_publica IS NOT NULL as tiene_clave FROM usuarios WHERE id = %s", (usuario_id,))
    usuario = cursor.fetchone()
    
    if not usuario:
        print(f"❌ ERROR: Usuario {usuario_id} no encontrado")
        return
    
    print(f"👤 Usuario: {usuario['nombre']} ({usuario['correo']})")
    print(f"   Rol: {usuario['rol']}")
    print(f"   Tiene clave pública: {'✅' if usuario['tiene_clave'] else '❌'}")
    
    # 2. Verificar que el condominio existe
    cursor.execute("SELECT id, nombre, codigo, id_admin FROM condominios WHERE id = %s", (condominio_id,))
    condominio = cursor.fetchone()
    
    if not condominio:
        print(f"❌ ERROR: Condominio {condominio_id} no encontrado")
        return
    
    print(f"🏠 Condominio: {condominio['nombre']} (código: {condominio['codigo']})")
    print(f"   Admin ID: {condominio['id_admin']}")
    
    # 3. Verificar que el admin existe y tiene clave pública
    cursor.execute("SELECT id, nombre, correo, clave_publica IS NOT NULL as tiene_clave FROM usuarios WHERE id = %s", (condominio['id_admin'],))
    admin = cursor.fetchone()
    
    if not admin:
        print(f"❌ ERROR: Admin {condominio['id_admin']} no encontrado")
        return
    
    print(f"👨‍💼 Admin: {admin['nombre']} ({admin['correo']})")
    print(f"   Tiene clave pública: {'✅' if admin['tiene_clave'] else '❌'}")
    
    # 4. Verificar relación usuario-condominio
    cursor.execute("""
        SELECT id, fecha_union 
        FROM condominio_usuarios 
        WHERE id_usuario = %s AND id_condominio = %s
    """, (usuario_id, condominio_id))
    relacion = cursor.fetchone()
    
    if not relacion:
        print(f"❌ ERROR: Usuario {usuario_id} no está asociado al condominio {condominio_id}")
        return
    
    print(f"🔗 Relación: Usuario unido el {relacion['fecha_union']}")
    
    # 5. Verificar documentos de estado de cuenta
    cursor.execute("""
        SELECT id, tipo_documento, fecha_subida, 
               contenido_cifrado IS NOT NULL as tiene_contenido,
               nonce IS NOT NULL as tiene_nonce,
               tag IS NOT NULL as tiene_tag,
               firma_emisor IS NOT NULL as tiene_firma
        FROM documentos 
        WHERE id_emisor = %s AND id_condominio = %s AND tipo_documento = 'estado_cuenta'
        ORDER BY fecha_subida DESC
    """, (usuario_id, condominio_id))
    documentos = cursor.fetchall()
    
    print(f"\n📄 Documentos de estado de cuenta: {len(documentos)}")
    for i, doc in enumerate(documentos):
        print(f"   {i+1}. ID: {doc['id']}, Fecha: {doc['fecha_subida']}")
        print(f"      Contenido: {'✅' if doc['tiene_contenido'] else '❌'}")
        print(f"      Nonce: {'✅' if doc['tiene_nonce'] else '❌'}")
        print(f"      Tag: {'✅' if doc['tiene_tag'] else '❌'}")
        print(f"      Firma: {'✅' if doc['tiene_firma'] else '❌'}")
    
    cursor.close()

def listar_usuarios_condominios(connection):
    """Listar todos los usuarios y sus condominios"""
    cursor = connection.cursor(dictionary=True)
    
    print("\n📋 LISTADO DE USUARIOS Y CONDOMINIOS")
    print("=" * 80)
    
    cursor.execute("""
        SELECT u.id as usuario_id, u.nombre as usuario_nombre, u.rol,
               c.id as condominio_id, c.nombre as condominio_nombre, c.codigo,
               cu.fecha_union
        FROM usuarios u
        LEFT JOIN condominio_usuarios cu ON u.id = cu.id_usuario
        LEFT JOIN condominios c ON cu.id_condominio = c.id
        ORDER BY u.id, c.id
    """)
    
    resultados = cursor.fetchall()
    
    for row in resultados:
        if row['condominio_id']:
            print(f"👤 {row['usuario_nombre']} (ID: {row['usuario_id']}, {row['rol']}) -> 🏠 {row['condominio_nombre']} (ID: {row['condominio_id']})")
        else:
            print(f"👤 {row['usuario_nombre']} (ID: {row['usuario_id']}, {row['rol']}) -> ❌ Sin condominio")
    
    cursor.close()

def main():
    connection = conectar_bd()
    if not connection:
        return
    
    try:
        # Primero listar todos los usuarios y condominios
        listar_usuarios_condominios(connection)
        
        # Pedir datos específicos para debug
        print("\n" + "="*60)
        print("Para hacer debug específico, ingresa:")
        usuario_id = input("ID del usuario (o Enter para salir): ").strip()
        
        if not usuario_id:
            return
        
        condominio_id = input("ID del condominio: ").strip()
        
        if usuario_id and condominio_id:
            debug_usuario_condominio(connection, int(usuario_id), int(condominio_id))
        
    except Exception as e:
        print(f"❌ Error durante el debug: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if connection.is_connected():
            connection.close()
            print("\n🔌 Conexión cerrada")

if __name__ == "__main__":
    main()
