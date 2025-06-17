#!/usr/bin/env python3
"""
Script para verificar el tipo de columna contenido_cifrado en la base de datos
"""

import pymysql
from config import Config

def verificar_estructura_db():
    try:
        # Parsear la URI de la base de datos
        db_uri = Config.SQLALCHEMY_DATABASE_URI
        # Formato: mysql+pymysql://user:password@host:port/dbname
        
        # Extraer componentes de la URI
        if 'mysql+pymysql://' in db_uri:
            db_info = db_uri.replace('mysql+pymysql://', '')
            user_pass, host_db = db_info.split('@')
            user, password = user_pass.split(':')
            host_port, database = host_db.split('/')
            if ':' in host_port:
                host, port = host_port.split(':')
                port = int(port)
            else:
                host = host_port
                port = 3306
        else:
            print("❌ No se pudo parsear la URI de la base de datos")
            return
            
        print(f"Conectando a: {host}:{port}/{database} como {user}")
        
        # Conectar a la base de datos
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # Verificar la estructura de la tabla documentos
            cursor.execute("DESCRIBE documentos")
            columnas = cursor.fetchall()
            
            print("=== ESTRUCTURA DE LA TABLA DOCUMENTOS ===")
            for columna in columnas:
                print(f"{columna[0]}: {columna[1]} | NULL: {columna[2]} | Default: {columna[4]}")
            
            # Verificar específicamente contenido_cifrado
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'documentos' 
                AND COLUMN_NAME = 'contenido_cifrado'
            """, (database,))
            
            info_columna = cursor.fetchone()
            if info_columna:
                print(f"\n=== INFORMACIÓN DETALLADA DE CONTENIDO_CIFRADO ===")
                print(f"Nombre: {info_columna[0]}")
                print(f"Tipo: {info_columna[1]}")
                print(f"Tamaño máximo: {info_columna[2]}")
                
                if info_columna[1].upper() == 'LONGBLOB':
                    print("✅ La columna está configurada correctamente como LONGBLOB")
                    print("   Capacidad máxima: 4GB")
                else:
                    print(f"⚠️  La columna es de tipo {info_columna[1]}, no LONGBLOB")
            else:
                print("❌ No se encontró la columna contenido_cifrado")
                
    except Exception as e:
        print(f"❌ Error al verificar la base de datos: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    verificar_estructura_db()
