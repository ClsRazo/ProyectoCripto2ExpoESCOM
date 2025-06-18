#!/usr/bin/env python3
"""
Script de prueba para verificar las funcionalidades del condómino
"""

import requests
import json
import os
from pathlib import Path

BASE_URL = "http://localhost:5000/api"

def test_register_and_login():
    """Prueba registro e inicio de sesión"""
    print("=== Probando registro e inicio de sesión ===")
    
    # Datos de prueba
    test_user = {
        "nombre": "Juan Pérez",
        "correo": "juan.test@example.com",
        "password": "password123",
        "rol": "condomino"
    }
    
    # Registro
    print("Registrando usuario...")
    response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
    print(f"Registro: {response.status_code} - {response.json()}")
    
    # Login
    print("Iniciando sesión...")
    login_data = {
        "correo": test_user["correo"],
        "password": test_user["password"]
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    result = response.json()
    print(f"Login: {response.status_code} - {result}")
    
    if response.status_code == 200:
        return result.get("token")
    return None

def test_profile(token):
    """Prueba obtener perfil"""
    print("\n=== Probando perfil ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/condomino/perfil", headers=headers)
    print(f"Perfil: {response.status_code} - {response.json()}")

def test_validate_code(token):
    """Prueba validación de código de condominio"""
    print("\n=== Probando validación de código ===")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Código inválido
    response = requests.post(
        f"{BASE_URL}/condominio/validate-code", 
        json={"codigo": "INVALID123"}, 
        headers=headers
    )
    print(f"Código inválido: {response.status_code} - {response.json()}")
    
    # Código válido (si existe)
    response = requests.post(
        f"{BASE_URL}/condominio/validate-code", 
        json={"codigo": "COND123"}, 
        headers=headers
    )
    print(f"Código de prueba: {response.status_code} - {response.json()}")

def main():
    """Función principal"""
    try:
        # Verificar que los servidores estén corriendo
        print("Verificando conexión con el backend...")
        response = requests.get(f"{BASE_URL}/auth/health", timeout=5)
        print("✓ Backend conectado")
    except requests.exceptions.RequestException:
        print("✗ Backend no disponible. Asegúrate de que esté corriendo en puerto 5000")
        return
    
    # Ejecutar pruebas
    token = test_register_and_login()
    
    if token:
        test_profile(token)
        test_validate_code(token)
        print("\n✓ Pruebas básicas completadas")
    else:
        print("\n✗ No se pudo obtener token de autenticación")

if __name__ == "__main__":
    main()
