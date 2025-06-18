// Script de prueba para las correcciones del condómino
// Ejecutar en la consola del navegador después de hacer login como condómino

console.log('=== Test de correcciones del condómino ===');

// Test 1: Verificar que el objeto condominio tenga ID
async function testCondominioId() {
    console.log('\n1. Verificando ID del condominio...');
    
    try {
        // Simular lo que hace el frontend
        const response = await fetch('http://localhost:5000/api/condomino/info', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Info del condómino:', data);
        
        if (data.condominio && data.condominio.id) {
            console.log(`✓ Condominio ID encontrado: ${data.condominio.id}`);
            return data.condominio.id;
        } else {
            console.log('✗ No se encontró ID del condominio');
            return null;
        }
    } catch (error) {
        console.error('✗ Error obteniendo info del condómino:', error);
        return null;
    }
}

// Test 2: Verificar endpoint de balance general
async function testBalanceGeneral(condominioId) {
    console.log('\n2. Probando endpoint de balance general...');
    
    if (!condominioId) {
        console.log('✗ No hay ID de condominio para probar');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:5000/api/condomino/balance-general/${condominioId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log(`URL probada: http://localhost:5000/api/condomino/balance-general/${condominioId}`);
        console.log('Status:', response.status);
        console.log('Headers:', [...response.headers.entries()]);
        
        if (response.ok) {
            console.log('✓ Endpoint de balance general responde correctamente');
            const blob = await response.blob();
            console.log('✓ Blob recibido, tamaño:', blob.size, 'bytes');
            
            // Crear URL para verificar
            const url = URL.createObjectURL(blob);
            console.log('✓ URL del PDF creada:', url);
            
            // Limpiar
            URL.revokeObjectURL(url);
        } else {
            console.log('✗ Error en endpoint:', response.status, response.statusText);
            const errorText = await response.text();
            console.log('Error details:', errorText);
        }
    } catch (error) {
        console.error('✗ Error probando balance general:', error);
    }
}

// Test 3: Verificar que no se use 'undefined' en URLs
function testNoUndefinedUrls() {
    console.log('\n3. Verificando que no se usen IDs undefined...');
    
    // Interceptar fetch para detectar URLs con 'undefined'
    const originalFetch = window.fetch;
    let undefinedDetected = false;
    
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('undefined')) {
            console.error('✗ URL con undefined detectada:', url);
            undefinedDetected = true;
        }
        return originalFetch.apply(this, args);
    };
    
    setTimeout(() => {
        window.fetch = originalFetch;
        if (!undefinedDetected) {
            console.log('✓ No se detectaron URLs con undefined');
        }
    }, 5000);
    
    console.log('Interceptor de fetch instalado por 5 segundos...');
}

// Ejecutar todas las pruebas
async function runAllTests() {
    console.log('Iniciando pruebas...');
    
    // Test de interceptor
    testNoUndefinedUrls();
    
    // Test de ID de condominio
    const condominioId = await testCondominioId();
    
    // Test de balance general
    await testBalanceGeneral(condominioId);
    
    console.log('\n=== Pruebas completadas ===');
    console.log('Ahora puedes hacer clic en los botones en la interfaz para ver si funcionan correctamente.');
}

// Ejecutar automáticamente
runAllTests();
