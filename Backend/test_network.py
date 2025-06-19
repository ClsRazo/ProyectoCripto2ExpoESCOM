#!/usr/bin/env python3
"""
Script simple para probar conectividad de red a RDS
"""
import socket
import time
from config import Config

def test_network_connectivity(host, port, timeout=10):
    """Prueba si podemos conectar al puerto especificado."""
    try:
        print(f"🔄 Probando conectividad de red a {host}:{port}...")
        
        # Crear socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        
        # Intentar conectar
        start_time = time.time()
        result = sock.connect_ex((host, port))
        end_time = time.time()
        
        sock.close()
        
        if result == 0:
            print(f"✅ Conectividad exitosa en {end_time - start_time:.2f} segundos")
            return True
        else:
            print(f"❌ No se pudo conectar. Código de error: {result}")
            return False
            
    except socket.timeout:
        print(f"❌ Timeout después de {timeout} segundos")
        return False
    except Exception as e:
        print(f"❌ Error de conectividad: {e}")
        return False

def test_dns_resolution(host):
    """Prueba resolución DNS"""
    try:
        print(f"🔄 Probando resolución DNS para {host}...")
        import socket
        ip = socket.gethostbyname(host)
        print(f"✅ DNS resuelto: {host} → {ip}")
        return ip
    except Exception as e:
        print(f"❌ Error de DNS: {e}")
        return None

if __name__ == "__main__":
    print("=== PRUEBA DE CONECTIVIDAD DE RED ===")
    
    host = Config.DB_CONFIG['host']
    port = Config.DB_CONFIG['port']
    
    print(f"Host objetivo: {host}")
    print(f"Puerto objetivo: {port}")
    
    # Probar DNS
    ip = test_dns_resolution(host)
    
    # Probar conectividad TCP
    success = test_network_connectivity(host, port)
    
    if success:
        print("\n🎉 La conectividad de red está OK!")
        print("El problema debe ser de autenticación o configuración de MySQL.")
    else:
        print("\n⚠️ PROBLEMA DE CONECTIVIDAD DE RED")
        print("Posibles causas:")
        print("1. Security Groups de AWS mal configurados")
        print("2. Network ACLs bloqueando conexiones")
        print("3. RDS no está en la misma VPC que EC2")
        print("4. Subnets mal configuradas")
        print("\nSolución recomendada:")
        print("- Verificar Security Groups de RDS y EC2")
        print("- Asegurar que ambos estén en la misma VPC")
        print("- Permitir conexiones MySQL (puerto 3306) desde EC2 a RDS")
