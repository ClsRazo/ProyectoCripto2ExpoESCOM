#!/usr/bin/env python3
"""
Script para verificar si un PDF contiene información de firma digital
"""
import sys
import PyPDF2
import fitz  # PyMuPDF
import os

def verificar_firma_pypdf2(archivo_pdf):
    """Verificar firma usando PyPDF2"""
    try:
        with open(archivo_pdf, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            print(f"=== Análisis con PyPDF2 ===")
            print(f"Número de páginas: {len(reader.pages)}")
            
            # Verificar metadatos
            if reader.metadata:
                print("Metadatos del PDF:")
                for key, value in reader.metadata.items():
                    print(f"  {key}: {value}")
            else:
                print("No se encontraron metadatos")
            
            # Verificar campos de formulario (donde podrían estar las firmas)
            if hasattr(reader, 'form') and reader.form:
                print("Campos de formulario encontrados:")
                for field in reader.form.fields:
                    print(f"  {field}: {reader.form.fields[field]}")
            else:
                print("No se encontraron campos de formulario")
            
            # Verificar anotaciones en cada página
            for i, page in enumerate(reader.pages):
                if '/Annots' in page:
                    print(f"Página {i+1} tiene anotaciones:")
                    annots = page['/Annots']
                    for annot in annots:
                        annot_obj = annot.get_object()
                        if '/Subtype' in annot_obj:
                            print(f"  Tipo de anotación: {annot_obj['/Subtype']}")
                            if annot_obj['/Subtype'] == '/Widget':
                                print("    - Campo de widget (posible firma)")
                
    except Exception as e:
        print(f"Error con PyPDF2: {e}")

def verificar_firma_pymupdf(archivo_pdf):
    """Verificar firma usando PyMuPDF"""
    try:
        doc = fitz.open(archivo_pdf)
        
        print(f"\n=== Análisis con PyMuPDF ===")
        print(f"Número de páginas: {doc.page_count}")
        
        # Verificar metadatos
        metadata = doc.metadata
        if metadata:
            print("Metadatos del PDF:")
            for key, value in metadata.items():
                if value:
                    print(f"  {key}: {value}")
        else:
            print("No se encontraron metadatos")
        
        # Verificar firmas digitales
        try:
            # Intentar obtener información de firmas
            # Nota: PyMuPDF puede no detectar todas las firmas
            for page_num in range(doc.page_count):
                page = doc[page_num]
                
                # Verificar widgets/campos de formulario
                widgets = page.widgets()
                if widgets:
                    print(f"Página {page_num + 1} tiene widgets:")
                    for widget in widgets:
                        print(f"  Tipo: {widget.field_type}")
                        print(f"  Nombre: {widget.field_name}")
                        if widget.field_type == 'signature':
                            print("    *** CAMPO DE FIRMA ENCONTRADO ***")
                
                # Verificar anotaciones
                annots = page.annots()
                if annots:
                    print(f"Página {page_num + 1} tiene anotaciones:")
                    for annot in annots:
                        print(f"  Tipo: {annot.type[1]}")
                        if 'signature' in annot.type[1].lower():
                            print("    *** ANOTACIÓN DE FIRMA ENCONTRADA ***")
        
        except Exception as e:
            print(f"Error al verificar firmas: {e}")
        
        doc.close()
        
    except Exception as e:
        print(f"Error con PyMuPDF: {e}")

def verificar_contenido_binario(archivo_pdf):
    """Buscar patrones de firma en el contenido binario"""
    try:
        print(f"\n=== Análisis de contenido binario ===")
        
        with open(archivo_pdf, 'rb') as file:
            contenido = file.read()
        
        # Buscar palabras clave relacionadas con firmas
        palabras_clave = [
            b'/Sig', b'/FT/Sig', b'/ByteRange', b'/Contents',
            b'/SubFilter', b'/M', b'/Name', b'/Reason',
            b'Adobe.PPKLite', b'adbe.pkcs7.detached', b'adbe.pkcs7.sha1'
        ]
        
        encontradas = []
        for palabra in palabras_clave:
            if palabra in contenido:
                encontradas.append(palabra.decode('utf-8', errors='ignore'))
        
        if encontradas:
            print("Palabras clave de firma encontradas:")
            for palabra in encontradas:
                print(f"  - {palabra}")
        else:
            print("No se encontraron palabras clave de firma digital estándar")
        
        # Buscar patrones hexadecimales largos (posibles firmas)
        import re
        hex_patterns = re.findall(rb'[0-9a-fA-F]{64,}', contenido)
        if hex_patterns:
            print(f"Se encontraron {len(hex_patterns)} patrones hexadecimales largos (posibles firmas/hashes)")
            for i, pattern in enumerate(hex_patterns[:3]):  # Mostrar solo los primeros 3
                print(f"  Patrón {i+1}: {pattern[:64].decode('utf-8', errors='ignore')}...")
        
    except Exception as e:
        print(f"Error en análisis binario: {e}")

def main():
    if len(sys.argv) != 2:
        print("Uso: python verificar_pdf_firma.py <archivo.pdf>")
        sys.exit(1)
    
    archivo_pdf = sys.argv[1]
    
    if not os.path.exists(archivo_pdf):
        print(f"Error: El archivo {archivo_pdf} no existe")
        sys.exit(1)
    
    print(f"Analizando archivo: {archivo_pdf}")
    print(f"Tamaño del archivo: {os.path.getsize(archivo_pdf)} bytes")
    print("=" * 50)
    
    # Verificar con diferentes métodos
    verificar_firma_pypdf2(archivo_pdf)
    verificar_firma_pymupdf(archivo_pdf)
    verificar_contenido_binario(archivo_pdf)
    
    print("\n" + "=" * 50)
    print("Análisis completado")

if __name__ == "__main__":
    main()
