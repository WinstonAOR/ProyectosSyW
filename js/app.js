import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ PEGA AQUÍ TUS CREDENCIALES DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAXcZGumE0WIbX0T34zTWM4wdC_SQ-ydW0",
    authDomain: "proyectosenparejasyw.firebaseapp.com",
    projectId: "proyectosenparejasyw",
    storageBucket: "proyectosenparejasyw.firebasestorage.app",
    messagingSenderId: "213562957041",
    appId: "1:213562957041:web:60c52bb7712ea06d6b9d50"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let tipoActualModal = 'deposito';
let cacheMetas = [];
let metaSeleccionadaId = null;
let primeraCargaMovimientos = true; // Controla que no suene el audio al cargar la app por primera vez

// --- REPRODUCIR SONIDO DE MONEDA ---
function reproducirSonidoMoneda() {
    const audio = document.getElementById('audioMoneda');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio prevenido por el navegador: ", e));
    }
}

// --- SISTEMA DE NOTIFICACIONES TOAST ---
function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    let bgColors = tipo === 'success' ? 'bg-emerald-600/90 border-emerald-500 text-white' : 
                   tipo === 'error' ? 'bg-rose-600/90 border-rose-500 text-white' : 
                   'bg-slate-800/90 border-slate-700 text-slate-200';

    toast.className = `toast-item backdrop-blur-md px-4 py-3 rounded-2xl border shadow-xl text-xs font-bold flex items-center justify-between gap-3 w-full ${bgColors}`;
    let icono = tipo === 'success' ? '🪙' : tipo === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<div class="flex items-center gap-2"><span>${icono}</span><span>${mensaje}</span></div>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- GESTIÓN DE SESIÓN ---
document.addEventListener("DOMContentLoaded", () => {
    verificarSesion();
    escucharDatosEnVivo();
    inicializarPullToRefresh();
});

window.iniciarSesion = (nombre, avatar) => {
    const sesion = { nombre, avatar };
    localStorage.setItem("chanchito_sesion", JSON.stringify(sesion));
    verificarSesion();
    mostrarToast(`¡Bienvenido de nuevo, ${nombre}! 🐷`);
};

window.cerrarSesion = () => {
    localStorage.removeItem("chanchito_sesion");
    verificarSesion();
    mostrarToast("Sesión cerrada correctamente", "info");
};

function verificarSesion() {
    const sesionGuardada = localStorage.getItem("chanchito_sesion");
    const pantallaLogin = document.getElementById("pantallaLogin");
    const pantallaApp = document.getElementById("pantallaApp");
    const txtUsuarioLogueado = document.getElementById("txtUsuarioLogueado");

    if (sesionGuardada) {
        const usuario = JSON.parse(sesionGuardada);
        pantallaLogin.classList.add("hidden");
        pantallaApp.classList.remove("hidden");
        txtUsuarioLogueado.innerText = `Conectado como: ${usuario.avatar} ${usuario.nombre}`;
    } else {
        pantallaApp.classList.add("hidden");
        pantallaLogin.classList.remove("hidden");
    }
}

// --- CAMBIO DE PLAN ACTIVO EN PANTALLA ---
window.cambiarPlanActivo = (metaId) => {
    metaSeleccionadaId = metaId;
    actualizarInterfazConDatos();
};

// --- MODALES Y ACCIONES ---
window.abrirModalMeta = () => {
    document.getElementById('inputTituloMeta').value = '';
    document.getElementById('inputMontoMeta').value = '';
    document.getElementById('modalMeta').classList.remove('hidden');
};

window.cerrarModalMeta = () => {
    document.getElementById('modalMeta').classList.add('hidden');
};

window.guardarNuevaMeta = async () => {
    const titulo = document.getElementById('inputTituloMeta').value.trim();
    const metaMonto = Number(document.getElementById('inputMontoMeta').value);

    if (!titulo || !metaMonto || metaMonto <= 0) {
        mostrarToast('Por favor completa todos los campos de la meta', 'error');
        return;
    }

    try {
        mostrarToast('Creando nueva meta...', 'info');
        const docRef = await addDoc(collection(db, "planes"), {
            titulo: titulo,
            metaMonto: metaMonto,
            activo: true,
            creadoEn: new Date().toISOString()
        });
        metaSeleccionadaId = docRef.id;
        cerrarModalMeta();
        mostrarToast('¡Meta creada con éxito! 🎉');
    } catch (e) {
        console.error("Error al crear meta: ", e);
        mostrarToast('Error al guardar la meta en la nube', 'error');
    }
};

window.abrirModalMovimiento = (tipo) => {
    if (cacheMetas.length === 0) {
        mostrarToast('Primero debes crear al menos una meta de ahorro', 'error');
        return;
    }
    tipoActualModal = tipo;
    const metaActualObj = cacheMetas.find(m => m.id === metaSeleccionadaId) || cacheMetas[0];

    document.getElementById('tituloModalMov').innerText = tipo === 'deposito' ? '➕ Depositar a la Meta' : '➖ Retirar de la Meta';
    document.getElementById('txtSubtituloModalMeta').innerText = `Plan seleccionado: ${metaActualObj.titulo}`;
    document.getElementById('inputMonto').value = '';
    document.getElementById('inputMotivo').value = '';

    document.getElementById('modalMovimiento').classList.remove('hidden');
};

window.cerrarModalMovimiento = () => {
    document.getElementById('modalMovimiento').classList.add('hidden');
};

window.ejecutarMovimiento = async () => {
    const monto = Number(document.getElementById('inputMonto').value);
    const motivo = document.getElementById('inputMotivo').value.trim() || (tipoActualModal === 'deposito' ? 'Depósito' : 'Retiro');
    
    const sesionGuardada = localStorage.getItem("chanchito_sesion");
    if (!sesionGuardada) return;
    const usuarioActual = JSON.parse(sesionGuardada).nombre;

    if (!monto || monto <= 0) {
        mostrarToast('Por favor ingresa un monto válido mayor a 0', 'error');
        return;
    }

    if (!metaSeleccionadaId) {
        mostrarToast('No hay ninguna meta seleccionada en pantalla', 'error');
        return;
    }

    try {
        mostrarToast('Guardando movimiento...', 'info');
        await addDoc(collection(db, "movimientos"), {
            metaId: metaSeleccionadaId,
            usuario: usuarioActual,
            tipo: tipoActualModal,
            monto: monto,
            motivo: motivo,
            fecha: new Date().toISOString()
        });
        cerrarModalMovimiento();
    } catch (e) {
        console.error("Error al guardar movimiento: ", e);
        mostrarToast('Error al conectar con la base de datos', 'error');
    }
};

// --- VARIABLES GLOBALES PARA SNAPSHOTS ---
let snapshotMetasGlobal = [];
let snapshotMovsGlobal = [];

function escucharDatosEnVivo() {
    // Escuchar Planes (Metas)
    onSnapshot(query(collection(db, "planes"), orderBy("creadoEn", "desc")), (snapshotPlan) => {
        let metas = [];
        snapshotPlan.forEach((doc) => {
            metas.push({ id: doc.id, ...doc.data() });
        });
        cacheMetas = metas;
        snapshotMetasGlobal = metas;

        if (metas.length > 0 && (!metaSeleccionadaId || !metas.some(m => m.id === metaSeleccionadaId))) {
            metaSeleccionadaId = metas[0].id;
        }

        actualizarInterfazConDatos();
    });

    // Escuchar Movimientos
    onSnapshot(query(collection(db, "movimientos"), orderBy("fecha", "desc")), (snapshotMov) => {
        let movimientos = [];
        snapshotMov.forEach((doc) => {
            movimientos.push(doc.data());
        });

        // Detectar si entró un movimiento NUEVO en tiempo real (excluyendo la carga inicial)
        if (!primeraCargaMovimientos && snapshotMovsGlobal.length > 0 && movimientos.length > snapshotMovsGlobal.length) {
            const ultimoMov = movimientos[0]; // El más reciente
            const metaObj = cacheMetas.find(m => m.id === ultimoMov.metaId);
            const nombreMeta = metaObj ? metaObj.titulo : 'alcancía';
            
            reproducirSonidoMoneda();
            mostrarToast(`🪙 ¡${ultimoMov.usuario} hizo un ${ultimoMov.tipo} de ₡${ultimoMov.monto.toLocaleString()} en "${nombreMeta}"!`);
        }

        snapshotMovsGlobal = movimientos;
        primeraCargaMovimientos = false;

        actualizarInterfazConDatos();
    });
}

function actualizarInterfazConDatos() {
    const metas = snapshotMetasGlobal;
    const movimientos = snapshotMovsGlobal;

    const selectPlan = document.getElementById('selectPlanActivo');
    if (metas.length === 0) {
        selectPlan.innerHTML = `<option value="">No hay metas creadas</option>`;
        document.getElementById('txtSaldoMetaActiva').innerText = `₡0.00`;
        document.getElementById('txtMetaMonto').innerText = `₡0`;
        document.getElementById('txtPorcentaje').innerText = `0%`;
        document.getElementById('barraProgreso').style.width = `0%`;
        document.getElementById('txtNombrePlanHistorial').innerText = `--`;
        document.getElementById('listaMovimientos').innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Crea una meta arriba para comenzar.</p>`;
        return;
    }

    selectPlan.innerHTML = metas.map(m => `
        <option value="${m.id}" ${m.id === metaSeleccionadaId ? 'selected' : ''}>${m.titulo}</option>
    `).join('');

    const metaActiva = metas.find(m => m.id === metaSeleccionadaId) || metas[0];
    metaSeleccionadaId = metaActiva.id;

    let saldoActualMeta = 0;
    movimientos.forEach(m => {
        if (m.metaId === metaActiva.id) {
            const factor = m.tipo === 'deposito' ? 1 : -1;
            saldoActualMeta += Number(m.monto) * factor;
        }
    });

    let porcentaje = Math.min(Math.round((saldoActualMeta / metaActiva.metaMonto) * 100), 100);
    if (porcentaje < 0) porcentaje = 0;

    document.getElementById('txtSaldoMetaActiva').innerText = `₡${saldoActualMeta.toLocaleString()}`;
    document.getElementById('txtMetaMonto').innerText = `₡${metaActiva.metaMonto.toLocaleString()}`;
    document.getElementById('txtPorcentaje').innerText = `${porcentaje}%`;
    document.getElementById('barraProgreso').style.width = `${porcentaje}%`;
    document.getElementById('txtNombrePlanHistorial').innerText = metaActiva.titulo;

    const movimientosDelPlan = movimientos.filter(m => m.metaId === metaActiva.id);
    const contenedorMov = document.getElementById('listaMovimientos');

    if (movimientosDelPlan.length === 0) {
        contenedorMov.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">No hay movimientos en este plan aún.</p>`;
        return;
    }

    contenedorMov.innerHTML = movimientosDelPlan.map(m => `
        <div class="bg-slate-900 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${m.tipo === 'deposito' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                    ${m.tipo === 'deposito' ? '📥' : '📤'}
                </div>
                <div>
                    <h4 class="text-xs font-bold text-slate-200">${m.motivo}</h4>
                    <p class="text-[10px] text-slate-400">Por <span class="text-pink-400 font-semibold">${m.usuario}</span></p>
                </div>
            </div>
            <span class="text-sm font-extrabold ${m.tipo === 'deposito' ? 'text-emerald-400' : 'text-rose-400'}">
                ${m.tipo === 'deposito' ? '+' : '-'}₡${m.monto.toLocaleString()}
            </span>
        </div>
    `).join('');
}

// --- PULL TO REFRESH ---
window.forzarSincronizacion = () => {
    const indicator = document.getElementById('pullIndicator');
    indicator.style.transform = 'translateY(0)';
    mostrarToast("Verificando datos más recientes...", "info");

    setTimeout(() => {
        indicator.style.transform = 'translateY(-100%)';
        mostrarToast("¡Alcancía sincronizada al día! 🐷");
    }, 1000);
};

function inicializarPullToRefresh() {
    const container = document.getElementById('mainScrollContainer');
    const indicator = document.getElementById('pullIndicator');
    let startY = 0;

    container.addEventListener('touchstart', (e) => {
        if (container.scrollTop === 0) {
            startY = e.touches[0].clientY;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        let currentY = e.touches[0].clientY;
        if (container.scrollTop === 0 && currentY - startY > 80) {
            indicator.style.transform = 'translateY(0)';
        }
    }, { passive: true });

    container.addEventListener('touchend', () => {
        if (indicator.style.transform === 'translateY(0px)' || indicator.style.transform === 'translateY(0)') {
            mostrarToast("Sincronizando...", "info");
            setTimeout(() => {
                indicator.style.transform = 'translateY(-100%)';
                mostrarToast("¡Sincronización completada!");
            }, 800);
        }
    });
}