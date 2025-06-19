#!/usr/bin/env python3
"""
Script de prueba para verificar la conexión a RDS MySQL
"""
import pymysql
from sqlalchemy import create_engine, text
from config import Config
import os
from dotenv import load_dotenv

load_dotenv()

def test_pymysql_connection():
    """Prueba conexión directa con PyMySQL"""
    try:
        print("🔄 Probando conexión directa con PyMySQL...")
        connection = pymysql.connect(
            host=Config.DB_CONFIG['host'],
            user=Config.DB_CONFIG['user'],
            password=Config.DB_CONFIG['password'],
            database=Config.DB_CONFIG['database'],
            port=Config.DB_CONFIG['port'],
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"✅ Conexión exitosa! MySQL versión: {version[0]}")
            
            cursor.execute("SELECT COUNT(*) FROM Usuario")
            count = cursor.fetchone()
            print(f"✅ Registros en tabla Usuario: {count[0]}")
            
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Error con PyMySQL: {e}")
        return False

def test_sqlalchemy_connection():
    """Prueba conexión con SQLAlchemy"""
    try:
        print("\n🔄 Probando conexión con SQLAlchemy...")
        
        # Crear engine con configuraciones mejoradas
        engine = create_engine(
            Config.SQLALCHEMY_DATABASE_URI,
            **Config.SQLALCHEMY_ENGINE_OPTIONS
        )
        
        with engine.connect() as connection:
            result = connection.execute(text("SELECT VERSION()"))
            version = result.fetchone()
            print(f"✅ SQLAlchemy conexión exitosa! MySQL versión: {version[0]}")
            
            result = connection.execute(text("SELECT COUNT(*) FROM Usuario"))
            count = result.fetchone()
            print(f"✅ Registros en tabla Usuario: {count[0]}")
            
        engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Error con SQLAlchemy: {e}")
        return False

def test_flask_app_connection():
    """Prueba conexión dentro del contexto de Flask"""
    try:
        print("\n🔄 Probando conexión con Flask app...")
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            # Intentar hacer una consulta simple
            result = db.engine.execute(text("SELECT VERSION()"))
            version = result.fetchone()
            print(f"✅ Flask app conexión exitosa! MySQL versión: {version[0]}")
            
            result = db.engine.execute(text("SELECT COUNT(*) FROM Usuario"))
            count = result.fetchone()
            print(f"✅ Registros en tabla Usuario: {count[0]}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error con Flask app: {e}")
        return False

if __name__ == "__main__":
    print("=== PRUEBA DE CONEXIÓN A BASE DE DATOS ===")
    print(f"Host: {Config.DB_CONFIG['host']}")
    print(f"Base de datos: {Config.DB_CONFIG['database']}")
    print(f"Usuario: {Config.DB_CONFIG['user']}")
    
    # Ejecutar todas las pruebas
    tests = [
        test_pymysql_connection,
        test_sqlalchemy_connection,
        test_flask_app_connection
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"❌ Error ejecutando {test.__name__}: {e}")
            results.append(False)
    
    print(f"\n=== RESUMEN ===")
    print(f"PyMySQL: {'✅' if results[0] else '❌'}")
    print(f"SQLAlchemy: {'✅' if results[1] else '❌'}")
    print(f"Flask App: {'✅' if results[2] else '❌'}")
    
    if all(results):
        print("🎉 Todas las conexiones funcionan correctamente!")
    else:
        print("⚠️ Hay problemas de conexión que necesitan ser resueltos.")
