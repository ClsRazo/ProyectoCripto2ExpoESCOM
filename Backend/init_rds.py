#!/usr/bin/env python3
"""
Script para inicializar la base de datos RDS con las tablas necesarias.
Ejecutar este script DESPUÉS de configurar RDS.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db
import pymysql

def init_database():
    """Inicializar la base de datos con todas las tablas."""
    app = create_app()
    
    with app.app_context():
        try:
            # Probar conexión
            print("🔄 Probando conexión a RDS MySQL...")
            
            # Crear todas las tablas
            print("🔄 Creando tablas en RDS...")
            db.create_all()
            print("✅ Tablas creadas exitosamente en RDS!")
              # Verificar tablas creadas
            from sqlalchemy import text
            with db.engine.connect() as connection:
                result = connection.execute(text("SHOW TABLES"))
                tables = [row[0] for row in result]
            print(f"📋 Tablas creadas: {tables}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error al inicializar la base de datos: {e}")
            return False

def test_connection():
    """Probar la conexión a RDS."""
    from config import Config
    
    try:
        print("🔄 Probando conexión directa a RDS...")
        connection = pymysql.connect(
            host=Config.DB_CONFIG['host'],
            user=Config.DB_CONFIG['user'],
            password=Config.DB_CONFIG['password'],
            database=Config.DB_CONFIG['database'],
            port=Config.DB_CONFIG['port']
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"✅ Conexión exitosa! Versión MySQL: {version[0]}")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Inicializando base de datos RDS...")
    
    # Probar conexión primero
    if test_connection():
        # Inicializar base de datos
        if init_database():
            print("🎉 Base de datos RDS inicializada correctamente!")
        else:
            print("❌ Error al inicializar la base de datos")
            sys.exit(1)
    else:
        print("❌ No se pudo conectar a RDS")
        sys.exit(1)
