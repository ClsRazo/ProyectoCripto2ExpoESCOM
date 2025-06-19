#!/usr/bin/env python3
"""
Script mejorado para migrar datos de MySQL local a RDS.
Maneja correctamente las dependencias de claves foráneas.
"""

import pymysql
import sys
from config import Config

# Configuración de MySQL local
LOCAL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'admin',
    'database': 'condoescom',
    'port': 3306
}

# Orden correcto de migración (respetando dependencias)
MIGRATION_ORDER = [
    'usuarios',           # Tabla padre
    'condominios',        # Depende de usuarios
    'condominio_usuarios', # Depende de condominios y usuarios
    'documentos'          # Depende de usuarios
]

def migrate_table_data(local_conn, rds_conn, table_name):
    """Migrar datos de una tabla específica."""
    try:
        print(f"🔄 Migrando tabla: {table_name}")
        
        # Obtener datos de la tabla local
        with local_conn.cursor() as cursor:
            cursor.execute(f"SELECT * FROM {table_name}")
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
        
        if not rows:
            print(f"  ℹ️  Tabla {table_name} está vacía")
            return True
        
        # Limpiar tabla RDS primero (opcional)
        with rds_conn.cursor() as cursor:
            cursor.execute(f"DELETE FROM {table_name}")
            rds_conn.commit()
        
        # Insertar datos en RDS
        with rds_conn.cursor() as cursor:
            placeholders = ', '.join(['%s'] * len(columns))
            columns_str = ', '.join(columns)
            query = f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"
            cursor.executemany(query, rows)
            rds_conn.commit()
        
        print(f"  ✅ {len(rows)} registros migrados exitosamente")
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Función principal de migración."""
    print("🚀 Iniciando migración ordenada de datos a RDS...")
    
    local_conn = None
    rds_conn = None
    
    try:
        # Conectar a base de datos local
        print("🔄 Conectando a MySQL local...")
        local_conn = pymysql.connect(**LOCAL_CONFIG)
        print("✅ Conectado a MySQL local")
        
        # Conectar a RDS
        print("🔄 Conectando a RDS...")
        rds_conn = pymysql.connect(**Config.DB_CONFIG)
        print("✅ Conectado a RDS")
        
        # Deshabilitar verificación de claves foráneas temporalmente
        print("🔄 Deshabilitando verificación de claves foráneas...")
        with rds_conn.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Migrar tablas en orden
        migrated_count = 0
        for table_name in MIGRATION_ORDER:
            if migrate_table_data(local_conn, rds_conn, table_name):
                migrated_count += 1
            else:
                print(f"⚠️  Error en tabla {table_name}, continuando...")
        
        # Rehabilitar verificación de claves foráneas
        print("🔄 Rehabilitando verificación de claves foráneas...")
        with rds_conn.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        print(f"\n🎉 Migración completada: {migrated_count}/{len(MIGRATION_ORDER)} tablas")
        
        if migrated_count == len(MIGRATION_ORDER):
            print("🎊 ¡Todos los datos se migraron exitosamente!")
        else:
            print("⚠️  Algunas tablas tuvieron problemas")
            
    except Exception as e:
        print(f"❌ Error crítico: {e}")
        return False
    
    finally:
        # Cerrar conexiones
        if local_conn:
            local_conn.close()
        if rds_conn:
            rds_conn.close()
    
    return True

if __name__ == "__main__":
    print("🔧 Configuración:")
    print(f"  Local: {LOCAL_CONFIG['database']}@{LOCAL_CONFIG['host']}")
    print(f"  RDS: {Config.DB_CONFIG['database']}@{Config.DB_CONFIG['host']}")
    print(f"  Orden de migración: {' → '.join(MIGRATION_ORDER)}")
    
    response = input("\n¿Continuar con la migración? (y/N): ")
    if response.lower() in ['y', 'yes', 'sí', 'si']:
        main()
    else:
        print("Migración cancelada.")
