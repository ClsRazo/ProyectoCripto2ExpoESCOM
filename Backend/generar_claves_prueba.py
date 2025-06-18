#!/usr/bin/env python3
"""
Script para generar claves de prueba para el sistema de condominio
"""

from crypto_utils import generar_par_claves_ec, serializar_clave_privada, serializar_clave_publica
import os

def generar_claves_prueba():
    """Genera claves de prueba para admin y condómino"""
    
    # Crear directorio de pruebas si no existe
    if not os.path.exists('test_keys'):
        os.makedirs('test_keys')
    
    # Generar claves para admin
    print("Generando claves para admin...")
    admin_priv, admin_pub = generar_par_claves_ec()
    admin_priv_pem = serializar_clave_privada(admin_priv)
    admin_pub_pem = serializar_clave_publica(admin_pub)
    
    with open('test_keys/admin_private.pem', 'w') as f:
        f.write(admin_priv_pem)
    
    with open('test_keys/admin_public.pem', 'w') as f:
        f.write(admin_pub_pem)
    
    # Generar claves para condómino
    print("Generando claves para condómino...")
    condo_priv, condo_pub = generar_par_claves_ec()
    condo_priv_pem = serializar_clave_privada(condo_priv)
    condo_pub_pem = serializar_clave_publica(condo_pub)
    
    with open('test_keys/condomino_private.pem', 'w') as f:
        f.write(condo_priv_pem)
    
    with open('test_keys/condomino_public.pem', 'w') as f:
        f.write(condo_pub_pem)
    
    print("\n✅ Claves generadas exitosamente en el directorio 'test_keys/':")
    print("- admin_private.pem (clave privada del admin)")
    print("- admin_public.pem (clave pública del admin)")
    print("- condomino_private.pem (clave privada del condómino)")
    print("- condomino_public.pem (clave pública del condómino)")
    
    print(f"\n📋 Clave pública del admin para copiar a la BD:")
    print(admin_pub_pem)

if __name__ == "__main__":
    generar_claves_prueba()
