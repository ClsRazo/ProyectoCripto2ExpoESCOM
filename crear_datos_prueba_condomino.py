#!/usr/bin/env python3
"""
Script para crear datos de prueba para el condómino
"""

import sys
import os
import io
from datetime import datetime
from werkzeug.security import generate_password_hash

# Agregar el directorio backend al path
backend_dir = os.path.join(os.path.dirname(__file__), 'Backend')
sys.path.insert(0, backend_dir)

from models import db, Usuario, Condominio, CondominioUsuario, Documento
from app import create_app
from crypto_utils import generar_par_claves_ec, cifrar_aes_gcm, firmar_datos, serializar_clave_privada, serializar_clave_publica
import json
import base64

def create_test_data():
    """Crear datos de prueba para el condómino"""
    app = create_app()
    
    with app.app_context():
        print("=== Creando datos de prueba para condómino ===")
        
        # 1. Verificar si ya existe un condómino de prueba
        test_condomino = Usuario.query.filter_by(correo='condomino@test.com').first()
        
        if not test_condomino:
            print("1. Creando usuario condómino de prueba...")
              # Generar claves para el condómino
            private_key, public_key = generar_par_claves_ec()
            private_key_pem = serializar_clave_privada(private_key)
            public_key_pem = serializar_clave_publica(public_key)
            
            # Crear usuario condómino
            test_condomino = Usuario(
                nombre='Condómino de Prueba',
                correo='condomino@test.com',
                password_hash=generate_password_hash('password123'),
                rol='condomino',
                clave_publica=public_key_pem,
                is_verified=True
            )
            
            db.session.add(test_condomino)
            db.session.commit()
            
            # Guardar clave privada en archivo
            with open('condomino_test_private_key.pem', 'w') as f:
                f.write(private_key_pem)
            
            print(f"✓ Usuario condómino creado con ID: {test_condomino.id}")
            print("✓ Clave privada guardada en: condomino_test_private_key.pem")
        else:
            print(f"1. Usuario condómino de prueba ya existe (ID: {test_condomino.id})")
        
        # 2. Verificar si el condómino pertenece a un condominio
        condominio_usuario = CondominioUsuario.query.filter_by(id_usuario=test_condomino.id).first()
        
        if not condominio_usuario:
            print("2. Asociando condómino al condominio...")
            
            # Buscar el primer condominio disponible
            condominio = Condominio.query.first()
            if not condominio:
                print("✗ No hay condominios disponibles")
                return
            
            # Crear asociación
            condominio_usuario = CondominioUsuario(
                id_usuario=test_condomino.id,
                id_condominio=condominio.id
            )
            
            db.session.add(condominio_usuario)
            db.session.commit()
            
            print(f"✓ Condómino asociado al condominio: {condominio.nombre}")
        else:
            condominio = Condominio.query.get(condominio_usuario.id_condominio)
            print(f"2. Condómino ya pertenece al condominio: {condominio.nombre}")
        
        # 3. Crear estado de cuenta de prueba
        estado_existente = Documento.query.filter_by(
            id_emisor=test_condomino.id,
            tipo_documento='estado_cuenta'
        ).first()
        
        if not estado_existente:
            print("3. Creando estado de cuenta de prueba...")
            
            # Crear un PDF simple de prueba
            pdf_content = b"""%%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Estado de Cuenta de Prueba) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000109 00000 n 
0000000183 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
276
%%EOF"""
            
            # Obtener admin para cifrado
            admin = Usuario.query.join(CondominioUsuario).filter(
                CondominioUsuario.id_condominio == condominio.id,
                Usuario.rol == 'admin'
            ).first()
            
            if admin and admin.clave_publica:
                print("  - Cifrando estado de cuenta con ECDH...")
                
                # Leer clave privada del condómino
                try:
                    with open('condomino_test_private_key.pem', 'r') as f:
                        private_key_pem = f.read()
                    
                    # Derivar clave compartida
                    from crypto_utils import derive_shared_key
                    clave_compartida = derive_shared_key(private_key_pem, admin.clave_publica)
                    
                    # Cifrar con AES-GCM
                    nonce, tag, ciphertext = cifrar_aes_gcm(clave_compartida, pdf_content)
                    
                    # Crear metadatos
                    metadata = {
                        'nonce': base64.b64encode(nonce).decode('utf-8'),
                        'tag': base64.b64encode(tag).decode('utf-8'),
                        'ciphertext': base64.b64encode(ciphertext).decode('utf-8')
                    }
                    
                    # Crear contenido cifrado con metadatos
                    contenido_cifrado = b'ENCRYPTED:' + json.dumps(metadata).encode('utf-8') + b'|||'
                    
                    print("  - Estado de cuenta cifrado correctamente")
                    
                except Exception as e:
                    print(f"  - Error cifrando: {e}")
                    contenido_cifrado = pdf_content  # Fallback sin cifrado
            else:
                print("  - No se pudo cifrar (admin sin clave), guardando sin cifrar")
                contenido_cifrado = pdf_content
            
            # Firmar el documento
            try:
                with open('condomino_test_private_key.pem', 'r') as f:
                    private_key_pem = f.read()
                
                firma = firmar_datos(private_key_pem, pdf_content)
                print("  - Documento firmado correctamente")
            except Exception as e:
                print(f"  - Error firmando: {e}")
                firma = b''
            
            # Crear documento
            estado_cuenta = Documento(
                id_emisor=test_condomino.id,
                id_condominio=condominio.id,
                tipo_documento='estado_cuenta',
                contenido_cifrado=contenido_cifrado,
                firma_emisor=firma
            )
            
            db.session.add(estado_cuenta)
            db.session.commit()
            
            print(f"✓ Estado de cuenta creado con ID: {estado_cuenta.id}")
        else:
            print(f"3. Estado de cuenta ya existe (ID: {estado_existente.id})")
        
        print("\n=== Datos de prueba creados ===")
        print(f"Usuario: condomino@test.com")
        print(f"Contraseña: password123")
        print(f"Clave privada: condomino_test_private_key.pem")
        print(f"Condominio: {condominio.nombre} (ID: {condominio.id})")

if __name__ == '__main__':
    create_test_data()
