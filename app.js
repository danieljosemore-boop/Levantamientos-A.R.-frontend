// 1. Configuración de la base de datos local
const db = new Dexie('InventarioPostesDB');
db.version(1).stores({
  postes: '++id, codigo, latitud, longitud, foto, sincronizado'
});

// Variables para almacenar coords temporalmente
let latActual = 0;
let lonActual = 0;

// Función GPS
function obtenerUbicacion() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            latActual = pos.coords.latitude;
            lonActual = pos.coords.longitude;
            document.getElementById('coords').innerText = `Lat: ${latActual}, Lon: ${lonActual}`;
        }, (err) => alert("Error al obtener GPS: " + err.message), { enableHighAccuracy: true });
    }
}

// 2. Función para enviar al servidor
async function sincronizarConServidor(poste) {
    const url = "https://levantamientos-a-r-frontend.onrender.com"; // CAMBIA POR TU URL REAL
    const formData = new FormData();
    formData.append("codigo", poste.codigo);
    formData.append("latitud", poste.latitud);
    formData.append("longitud", poste.longitud);
    formData.append("foto", poste.foto);

    const response = await fetch(url, { method: 'POST', body: formData });
    return response.ok;
}

// 3. Manejo del formulario (Guardado local)
document.getElementById('posteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevoPoste = {
        codigo: document.getElementById('codigo').value,
        latitud: latActual,
        longitud: lonActual,
        foto: document.getElementById('foto').files[0],
        sincronizado: 0
    };

    await db.postes.add(nuevoPoste);
    alert("Poste guardado localmente en la base de datos del dispositivo.");
    document.getElementById('posteForm').reset();
    document.getElementById('coords').innerText = "Ubicación: No capturada";
});

// 4. Sincronización de pendientes
async function sincronizarPendientes() {
    const estado = document.getElementById('estadoSync');
    estado.innerText = "Sincronizando...";

    const pendientes = await db.postes.where('sincronizado').equals(0).toArray();

    if (pendientes.length === 0) {
        estado.innerText = "Todo está al día.";
        return;
    }

    for (const poste of pendientes) {
        try {
            const exito = await sincronizarConServidor(poste);
            if (exito) {
                await db.postes.update(poste.id, { sincronizado: 1 });
            }
        } catch (err) {
            console.error("Error sincronizando:", err);
            estado.innerText = "Error de conexión. Intenta luego.";
            return;
        }
    }
    
    estado.innerText = "Sincronización completada exitosamente.";
}