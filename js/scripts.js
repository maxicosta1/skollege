/**
 * ============================================================================
 * SISTEMA DE GESTIÓN ESCOLAR CON RFID - VERSIÓN COMPLETA CON PERMISOS
 * ============================================================================
 * 
 * PERMISOS POR ROL:
 * - Sin login: Solo ve pantalla de login
 * - Alumno: Solo ve "Anuncios"
 * - Profesor: Ve "Asistencias" y "Anuncios"
 * - Preceptor: Ve "Personas", "Cursos", "Asistencias", "Anuncios"
 * - Directivo: Ve todo (Personas, Cursos, Asistencias, Estadísticas, Usuarios, Administración, Anuncios)
 * 
 * @version 4.1
 * ============================================================================
 */

// ==================== VARIABLES GLOBALES ====================

let puertoSerial = null;
let lectorSerial = null;
let listaPersonas = [];
let listaUsuarios = [];
let listaCursos = [];
let listaAnuncios = [];
let usuarioActual = null;
let filtroActual = 'todos';
let confirmCallback = null;
let fotoSeleccionada = null;
let personaActualFicha = null;
let currentPage = 1;
let itemsPerPage = 10;

let configuracionSistema = {
    tema: 'default',
    autoSave: true
};

// ==================== FUNCIONES DE MODALES ====================

/**
 * Muestra una notificación modal
 * @param {string} mensaje - Texto a mostrar
 * @param {string} tipo - 'info', 'success', 'error', 'warning'
 * @param {string|null} titulo - Título personalizado
 */
function mostrarNotificacion(mensaje, tipo = 'info', titulo = null) {
    const modal = document.getElementById('notificationModal');
    const icon = document.getElementById('notificationIcon');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    
    let icono = 'fa-info-circle';
    let claseTipo = 'notification-info';
    let tituloPorDefecto = 'Notificación';
    
    switch(tipo) {
        case 'success':
            icono = 'fa-check-circle';
            claseTipo = 'notification-success';
            tituloPorDefecto = 'Éxito';
            break;
        case 'error':
            icono = 'fa-exclamation-circle';
            claseTipo = 'notification-error';
            tituloPorDefecto = 'Error';
            break;
        case 'warning':
            icono = 'fa-exclamation-triangle';
            claseTipo = 'notification-warning';
            tituloPorDefecto = 'Advertencia';
            break;
        default:
            icono = 'fa-info-circle';
            claseTipo = 'notification-info';
            tituloPorDefecto = 'Información';
            break;
    }
    
    icon.className = `fas ${icono}`;
    titleEl.textContent = titulo || tituloPorDefecto;
    messageEl.textContent = mensaje;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const closeBtn = document.getElementById('notificationCloseBtn');
    const cerrar = () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        closeBtn.removeEventListener('click', cerrar);
    };
    closeBtn.addEventListener('click', cerrar);
    modal.querySelector('.close-modal')?.addEventListener('click', cerrar);
}

/**
 * Muestra un diálogo de confirmación
 * @param {string} mensaje 
 * @param {Function} callbackOk 
 * @param {Function} callbackCancel 
 */
function mostrarConfirmacion(mensaje, callbackOk, callbackCancel = null) {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    
    messageEl.textContent = mensaje;
    confirmCallback = { ok: callbackOk, cancel: callbackCancel };
    
    const cerrar = () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleOk = () => {
        if (confirmCallback?.ok) confirmCallback.ok();
        cerrar();
    };
    
    const handleCancel = () => {
        if (confirmCallback?.cancel) confirmCallback.cancel();
        cerrar();
    };
    
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    modal.querySelector('.close-modal')?.addEventListener('click', handleCancel);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Muestra un modal de carga
 * @param {string} mensaje 
 */
function mostrarCarga(mensaje = 'Procesando...') {
    const modal = document.getElementById('loadingModal');
    document.getElementById('loadingMessage').textContent = mensaje;
    modal.classList.add('active');
}

function ocultarCarga() {
    document.getElementById('loadingModal').classList.remove('active');
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function mostrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// ==================== FUNCIONES DE FOTO ====================

function convertirImagenABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function manejarSeleccionFoto(file) {
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        mostrarNotificacion('La imagen es demasiado grande. Tamaño máximo: 2MB', 'warning');
        return;
    }
    
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    if (!tiposPermitidos.includes(file.type)) {
        mostrarNotificacion('Formato no soportado. Use JPG, PNG o GIF', 'warning');
        return;
    }
    
    mostrarCarga('Procesando imagen...');
    try {
        const base64 = await convertirImagenABase64(file);
        fotoSeleccionada = base64;
        const previewImg = document.getElementById('previewImage');
        if (previewImg) previewImg.src = base64;
        document.getElementById('btnEliminarFoto').style.display = 'inline-flex';
        ocultarCarga();
    } catch (error) {
        ocultarCarga();
        mostrarNotificacion('Error al procesar la imagen', 'error');
    }
}

function eliminarFotoSeleccionada() {
    fotoSeleccionada = null;
    const previewImg = document.getElementById('previewImage');
    if (previewImg) {
        previewImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    }
    document.getElementById('btnEliminarFoto').style.display = 'none';
    mostrarNotificacion('Foto eliminada', 'info');
}

// ==================== SISTEMA DE PERMISOS Y MENÚ ====================

const SECCIONES = {
    anuncios: { id: 'anuncios', icono: 'fa-bullhorn', texto: 'Anuncios', roles: ['alumno', 'profesor', 'preceptor', 'directivo'] },
    personas: { id: 'personas', icono: 'fa-users', texto: 'Personas', roles: ['preceptor', 'directivo'] },
    cursos: { id: 'cursos', icono: 'fa-graduation-cap', texto: 'Cursos', roles: ['preceptor', 'directivo'] },
    asistencias: { id: 'asistencias', icono: 'fa-clipboard-check', texto: 'Asistencias', roles: ['profesor', 'preceptor', 'directivo'] },
    estadisticas: { id: 'estadisticas', icono: 'fa-chart-pie', texto: 'Estadísticas', roles: ['directivo'] },
    usuariosGestion: { id: 'usuariosGestion', icono: 'fa-users-cog', texto: 'Usuarios', roles: ['directivo'] },
    administracion: { id: 'administracion', icono: 'fa-cogs', texto: 'Administración', roles: ['directivo'] }
};

function obtenerSeccionesPorRol(rol) {
    const secciones = [];
    for (const [key, seccion] of Object.entries(SECCIONES)) {
        if (seccion.roles.includes(rol)) {
            secciones.push(seccion);
        }
    }
    return secciones;
}

/**
 * Refresca el contenido de la sección activa según su ID
 * @param {string} sectionId 
 */
function refrescarSeccionActiva(sectionId) {
    switch(sectionId) {
        case 'anuncios':
            cargarAnuncios();
            break;
        case 'personas':
            cargarTablaPersonasSimplificada(filtroActual);
            break;
        case 'cursos':
            cargarTablaCursos();
            break;
        case 'asistencias':
            cargarTablaPersonasPrincipal();
            actualizarEstadisticasRapidas();
            break;
        case 'estadisticas':
            if (usuarioActual?.rol === 'directivo') cargarEstadisticasDetalladas();
            break;
        case 'usuariosGestion':
            if (usuarioActual?.rol === 'directivo') cargarTablaUsuariosGestion();
            break;
        case 'administracion':
            // No requiere carga dinámica
            break;
        default:
            break;
    }
}

function renderizarSidebar() {
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (!sidebarMenu) return;
    
    if (!usuarioActual) {
        sidebarMenu.innerHTML = '<li style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5);">Inicie sesión para ver las opciones</li>';
        return;
    }
    
    const secciones = obtenerSeccionesPorRol(usuarioActual.rol);
    
    if (secciones.length === 0) {
        sidebarMenu.innerHTML = '<li style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5);">Sin opciones disponibles</li>';
        return;
    }
    
    sidebarMenu.innerHTML = secciones.map(seccion => `
        <li>
            <a href="#${seccion.id}" class="nav-link" data-section="${seccion.id}">
                <i class="fas ${seccion.icono}"></i>
                <span>${seccion.texto}</span>
            </a>
        </li>
    `).join('');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) targetSection.classList.add('active');
            // Refrescar datos de la sección al mostrarla
            refrescarSeccionActiva(sectionId);
            if (window.innerWidth < 992) cerrarSidebar();
        });
    });
    
    const primeraSeccion = secciones[0]?.id;
    if (primeraSeccion) {
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(primeraSeccion).classList.add('active');
        const activeLink = document.querySelector(`.nav-link[data-section="${primeraSeccion}"]`);
        if (activeLink) activeLink.classList.add('active');
        refrescarSeccionActiva(primeraSeccion);
    }
}

function cerrarSidebar() {
    document.getElementById('sidebar')?.classList.remove('active');
    document.getElementById('overlay')?.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ==================== LOGIN ====================

function inicializarLogin() {
    const formLogin = document.getElementById('formLoginPrincipal');
    const btnLoginHeader = document.getElementById('btnLoginHeader');
    
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const usuario = document.getElementById('loginUsuario').value;
            const contrasena = document.getElementById('loginContrasena').value;
            
            const usuarioEncontrado = listaUsuarios.find(u => 
                u.usuario === usuario && u.contrasena === contrasena && u.activo
            );
            
            if (usuarioEncontrado) {
                usuarioActual = {
                    usuario: usuarioEncontrado.usuario,
                    rol: usuarioEncontrado.rol,
                    id_persona: usuarioEncontrado.id_persona
                };
                localStorage.setItem('usuarioActual', JSON.stringify(usuarioActual));
                actualizarUIporSesion();
                mostrarNotificacion(`Bienvenido ${usuarioEncontrado.rol}`, 'success');
                document.getElementById('loginUsuario').value = '';
                document.getElementById('loginContrasena').value = '';
            } else {
                mostrarNotificacion('Usuario o contraseña incorrectos', 'error');
            }
        });
    }
    
    if (btnLoginHeader) {
        btnLoginHeader.addEventListener('click', () => {
            document.getElementById('loginSection').classList.add('active');
            document.querySelectorAll('.section').forEach(s => {
                if (s.id !== 'loginSection') s.classList.remove('active');
            });
        });
    }
}

function cerrarSesion() {
    mostrarConfirmacion('¿Estás seguro de que deseas cerrar sesión?', () => {
        usuarioActual = null;
        localStorage.removeItem('usuarioActual');
        actualizarUIporSesion();
        mostrarNotificacion('Sesión cerrada correctamente', 'info');
    });
}

// ==================== ANUNCIOS ====================

function cargarAnuncios() {
    const stored = localStorage.getItem('anuncios');
    if (stored) {
        listaAnuncios = JSON.parse(stored);
    } else {
        listaAnuncios = [
            {
                id: 1,
                titulo: 'Bienvenidos al ciclo lectivo 2024',
                contenido: 'Se informa a toda la comunidad educativa que el ciclo lectivo dará inicio el día 1 de marzo.',
                visibilidad: 'todos',
                autor: 'Dirección',
                fecha: new Date().toISOString()
            },
            {
                id: 2,
                titulo: 'Reunión de padres',
                contenido: 'Se convoca a reunión de padres el día viernes 15 a las 18:00 hs en el salón de actos.',
                visibilidad: 'todos',
                autor: 'Preceptoría',
                fecha: new Date().toISOString()
            }
        ];
        localStorage.setItem('anuncios', JSON.stringify(listaAnuncios));
    }
    
    const container = document.getElementById('anunciosList');
    if (!container) return;
    
    let anunciosFiltrados = listaAnuncios;
    if (usuarioActual) {
        anunciosFiltrados = listaAnuncios.filter(a => 
            a.visibilidad === 'todos' || a.visibilidad === `${usuarioActual.rol}s` || a.visibilidad === usuarioActual.rol
        );
    }
    
    anunciosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (anunciosFiltrados.length === 0) {
        container.innerHTML = '<div class="anuncio-card" style="text-align: center;">No hay anuncios disponibles</div>';
        return;
    }
    
    container.innerHTML = anunciosFiltrados.map(anuncio => `
        <div class="anuncio-card">
            <div class="anuncio-header">
                <span class="anuncio-titulo"><i class="fas fa-bullhorn"></i> ${anuncio.titulo}</span>
                <span class="anuncio-fecha">${new Date(anuncio.fecha).toLocaleString()}</span>
            </div>
            <div class="anuncio-contenido">${anuncio.contenido}</div>
            <div class="anuncio-autor">
                <i class="fas fa-user"></i> Publicado por: ${anuncio.autor}
                <span class="anuncio-visibilidad">
                    <i class="fas fa-eye"></i> Visible para: ${anuncio.visibilidad === 'todos' ? 'Todos' : anuncio.visibilidad}
                </span>
                ${(usuarioActual?.rol === 'directivo' || usuarioActual?.rol === 'preceptor') ? `
                    <button class="btn-eliminar-anuncio" data-id="${anuncio.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn-eliminar-anuncio').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            mostrarConfirmacion('¿Eliminar este anuncio?', () => {
                listaAnuncios = listaAnuncios.filter(a => a.id !== id);
                localStorage.setItem('anuncios', JSON.stringify(listaAnuncios));
                cargarAnuncios();
                mostrarNotificacion('Anuncio eliminado', 'success');
            });
        });
    });
}

function crearAnuncio(titulo, contenido, visibilidad) {
    const nuevoAnuncio = {
        id: Date.now(),
        titulo,
        contenido,
        visibilidad,
        autor: usuarioActual?.usuario || 'Administrador',
        fecha: new Date().toISOString()
    };
    listaAnuncios.push(nuevoAnuncio);
    localStorage.setItem('anuncios', JSON.stringify(listaAnuncios));
    cargarAnuncios();
}

// ==================== GESTIÓN DE PERSONAS ====================

/**
 * Carga la tabla simplificada de personas (sección "Personas")
 * @param {string} filtro - 'todos', 'alumno', 'profesor', 'preceptor'
 */
function cargarTablaPersonasSimplificada(filtro = 'todos') {
    const tbody = document.getElementById('personasTableBody_personas');
    if (!tbody) return;
    
    let personasFiltradas = listaPersonas;
    if (filtro !== 'todos') {
        personasFiltradas = listaPersonas.filter(p => p.rol === filtro);
    }
    
    if (personasFiltradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay personas registradas</td></tr>';
        return;
    }
    
    tbody.innerHTML = personasFiltradas.map(persona => `
        <tr class="clickable-row" data-id="${persona.tarjeta_id || persona.id}">
            <td>${persona.foto ? `<img src="${persona.foto}" class="user-thumb">` : '<i class="fas fa-user-circle" style="font-size: 35px; color: #bdc3c7;"></i>'}</td>
            <td>${persona.tarjeta_id || persona.id || '-'}</td>
            <td>${persona.nombre}</td>
            <td>${persona.apellido}</td>
            <td><span class="rol-badge ${persona.rol}">${persona.rol}</span></td>
            <td>${persona.detalle || '-'}</td>
            <td>
                <button class="btn-icon ver-ficha-persona" data-id="${persona.tarjeta_id || persona.id}"><i class="fas fa-id-card"></i></button>
                <button class="btn-icon editar-persona" data-id="${persona.tarjeta_id || persona.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-icon eliminar-persona" data-id="${persona.tarjeta_id || persona.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.ver-ficha-persona').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); mostrarFichaAlumno(btn.getAttribute('data-id')); });
    });
}

/**
 * Carga la tabla principal de personas (sección "Asistencias") con paginación
 */
function cargarTablaPersonasPrincipal() {
    const tbody = document.getElementById('personasTableBody_asistencias');
    if (!tbody) return;
    
    const datosFiltrados = filtrarPersonas();
    const start = (currentPage - 1) * itemsPerPage;
    const paginados = datosFiltrados.slice(start, start + itemsPerPage);
    
    if (paginados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay registros</td></tr>';
    } else {
        tbody.innerHTML = paginados.map(persona => `
            <tr class="clickable-row" data-id="${persona.tarjeta_id}">
                <td>${persona.foto ? `<img src="${persona.foto}" class="user-thumb">` : '<i class="fas fa-user-circle" style="font-size: 35px; color: #bdc3c7;"></i>'}</td>
                <td><strong>${persona.tarjeta_id || 'No asignado'}</strong></td>
                <td>${persona.nombre}</td>
                <td>${persona.apellido}</td>
                <td><span class="rol-badge ${persona.rol}">${persona.rol}</span></td>
                <td>${persona.detalle || '-'}</td>
                <td><span class="status ${persona.estado === 'Presente' ? 'active' : 'inactive'}">${persona.estado}</span></td>
                <td>${new Date(persona.fecha_registro).toLocaleDateString()}</td>
                <td>
                    <button class="btn-icon ver-ficha-asistencia" data-id="${persona.tarjeta_id}"><i class="fas fa-id-card"></i></button>
                    ${(usuarioActual?.rol === 'directivo' || usuarioActual?.rol === 'preceptor') ? `
                        <button class="btn-icon editar-persona" data-id="${persona.tarjeta_id}"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon eliminar-persona" data-id="${persona.tarjeta_id}"><i class="fas fa-trash"></i></button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }
    
    document.getElementById('personasCount').textContent = datosFiltrados.length;
    document.getElementById('totalCount').textContent = listaPersonas.length;
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = start + itemsPerPage >= datosFiltrados.length;
    
    document.querySelectorAll('.ver-ficha-asistencia').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); mostrarFichaAlumno(btn.getAttribute('data-id')); });
    });
}

/**
 * Filtra personas según búsqueda y filtro de rol
 * @returns {Array} Personas filtradas
 */
function filtrarPersonas() {
    const searchInput = document.getElementById('searchInput');
    const termino = searchInput?.value.toLowerCase() || '';
    let filtradas = listaPersonas;
    if (filtroActual !== 'todos') filtradas = filtradas.filter(p => p.rol === filtroActual);
    if (termino) filtradas = filtradas.filter(p => 
        p.nombre.toLowerCase().includes(termino) || p.apellido.toLowerCase().includes(termino) ||
        (p.tarjeta_id && p.tarjeta_id.toLowerCase().includes(termino)) || (p.detalle && p.detalle.toLowerCase().includes(termino)) ||
        (p.dni && p.dni.toLowerCase().includes(termino))
    );
    return filtradas;
}

function mostrarFichaAlumno(personaId) {
    const persona = listaPersonas.find(p => p.tarjeta_id === personaId || p.id === personaId);
    if (!persona) return;
    personaActualFicha = persona;
    
    document.getElementById('fichaNombreCompleto').textContent = `${persona.nombre} ${persona.apellido}`;
    document.getElementById('fichaDNI').textContent = persona.dni || '-';
    document.getElementById('fichaRol').textContent = persona.rol;
    document.getElementById('fichaRol').className = `rol-badge ${persona.rol}`;
    document.getElementById('fichaDetalle').textContent = persona.detalle || '-';
    document.getElementById('fichaTarjetaId').textContent = persona.tarjeta_id || 'No asignado';
    document.getElementById('fichaEstado').textContent = persona.estado || 'Presente';
    document.getElementById('fichaEstado').className = `status ${(persona.estado || 'Presente') === 'Presente' ? 'active' : 'inactive'}`;
    document.getElementById('fichaFechaRegistro').textContent = persona.fecha_registro ? new Date(persona.fecha_registro).toLocaleDateString() : '-';
    document.getElementById('fichaFoto').src = persona.foto || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    
    mostrarModal('fichaAlumnoModal');
}

function actualizarEstadisticasRapidas() {
    document.getElementById('totalPersonas').textContent = listaPersonas.length;
    document.getElementById('totalAlumnos').textContent = listaPersonas.filter(p => p.rol === 'alumno').length;
    document.getElementById('totalProfesores').textContent = listaPersonas.filter(p => p.rol === 'profesor').length;
    document.getElementById('totalActivos').textContent = listaPersonas.filter(p => p.estado === 'Presente').length;
}

// ==================== GESTIÓN DE CURSOS ====================

function cargarTablaCursos(filtro = 'todos') {
    const tbody = document.getElementById('cursosTableBody');
    if (!tbody) return;
    
    let cursosFiltrados = listaCursos;
    if (filtro !== 'todos') cursosFiltrados = listaCursos.filter(c => c.anio.toString() === filtro);
    
    if (cursosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay cursos registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = cursosFiltrados.map(curso => {
        const cantidad = listaPersonas.filter(p => p.rol === 'alumno' && p.detalle === `${curso.anio}° ${curso.division}`).length;
        return `
            <tr class="clickable-row" data-id="${curso.id}">
                <td>${curso.anio}° Año</td>
                <td>${curso.division}ra División</td>
                <td>${cantidad} alumno${cantidad !== 1 ? 's' : ''}</td>
                <td>
                    <button class="btn-icon eliminar-curso" data-id="${curso.id}"><i class="fas fa-trash"></i></button>
                    <button class="btn-icon ver-alumnos" data-id="${curso.id}"><i class="fas fa-users"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.eliminar-curso').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); eliminarCurso(btn.getAttribute('data-id')); });
    });
    document.querySelectorAll('.ver-alumnos').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); verAlumnosDelCurso(btn.getAttribute('data-id')); });
    });
}

function eliminarCurso(id) {
    mostrarConfirmacion('¿Eliminar este curso?', () => {
        listaCursos = listaCursos.filter(c => c.id !== id);
        guardarCursos();
        cargarTablaCursos();
        mostrarNotificacion('Curso eliminado', 'success');
    });
}

function verAlumnosDelCurso(cursoId) {
    const curso = listaCursos.find(c => c.id === cursoId);
    if (!curso) return;
    document.getElementById('cursoTitulo').textContent = `${curso.anio}° Año ${curso.division}ra División`;
    
    const alumnos = listaPersonas.filter(p => p.rol === 'alumno' && p.detalle === `${curso.anio}° ${curso.division}`);
    const tbody = document.getElementById('alumnosCursoTableBody');
    
    if (alumnos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay alumnos en este curso</td></tr>';
    } else {
        tbody.innerHTML = alumnos.map(a => `
            <tr class="clickable-row" data-id="${a.tarjeta_id}">
                <td>${a.foto ? `<img src="${a.foto}" class="alumno-thumb">` : '<i class="fas fa-user-circle" style="font-size: 35px;"></i>'}</td>
                <td>${a.nombre}</td>
                <td>${a.apellido}</td>
                <td>${a.dni || '-'}</td>
                <td><button class="btn-icon ver-ficha" data-id="${a.tarjeta_id}"><i class="fas fa-id-card"></i> Ver Ficha</button></td>
            </tr>
        `).join('');
    }
    
    document.querySelectorAll('.ver-ficha').forEach(btn => {
        btn.addEventListener('click', () => mostrarFichaAlumno(btn.getAttribute('data-id')));
    });
    mostrarModal('alumnosCursoModal');
}

// ==================== GESTIÓN DE USUARIOS ====================

function cargarTablaUsuariosGestion() {
    const tbody = document.getElementById('usuariosGestionTableBody');
    if (!tbody) return;
    
    if (listaUsuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay usuarios registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = listaUsuarios.map(usuario => {
        const persona = listaPersonas.find(p => p.id === usuario.id_persona || p.tarjeta_id === usuario.id_persona);
        return `
            <tr>
                <td>${usuario.usuario}</td>
                <td>${persona ? `${persona.nombre} ${persona.apellido}` : 'No asociado'}</td>
                <td><span class="rol-badge ${usuario.rol}">${usuario.rol}</span></td>
                <td><span class="status ${usuario.activo ? 'active' : 'inactive'}">${usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>${new Date(usuario.fechaCreacion).toLocaleDateString()}</td>
                <td>
                    <button class="btn-icon reset-pass" data-usuario="${usuario.usuario}"><i class="fas fa-key"></i></button>
                    <button class="btn-icon eliminar-usuario-gestion" data-usuario="${usuario.usuario}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.querySelectorAll('.reset-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const usuario = btn.getAttribute('data-usuario');
            const nuevaPass = prompt('Nueva contraseña para ' + usuario);
            if (nuevaPass && nuevaPass.length >= 4) {
                const user = listaUsuarios.find(u => u.usuario === usuario);
                if (user) {
                    user.contrasena = nuevaPass;
                    localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
                    mostrarNotificacion('Contraseña actualizada', 'success');
                }
            } else if (nuevaPass) {
                mostrarNotificacion('La contraseña debe tener al menos 4 caracteres', 'warning');
            }
        });
    });
    
    document.querySelectorAll('.eliminar-usuario-gestion').forEach(btn => {
        btn.addEventListener('click', () => {
            const usuario = btn.getAttribute('data-usuario');
            mostrarConfirmacion(`¿Eliminar usuario ${usuario}?`, () => {
                listaUsuarios = listaUsuarios.filter(u => u.usuario !== usuario);
                localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
                cargarTablaUsuariosGestion();
                mostrarNotificacion('Usuario eliminado', 'success');
            });
        });
    });
}

function cargarSelectPersonas() {
    const select = document.getElementById('selectPersona');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar persona...</option>' + 
        listaPersonas.map(p => `<option value="${p.id || p.tarjeta_id}">${p.nombre} ${p.apellido} - ${p.rol}</option>`).join('');
}

function asociarUsuarioAPersona(usuario, contrasena, rol, idPersona) {
    if (listaUsuarios.find(u => u.usuario === usuario)) {
        mostrarNotificacion('El nombre de usuario ya existe', 'error');
        return false;
    }
    
    const nuevoUsuario = {
        usuario,
        contrasena,
        rol,
        id_persona: idPersona,
        activo: true,
        fechaCreacion: new Date().toISOString()
    };
    listaUsuarios.push(nuevoUsuario);
    localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
    return true;
}

// ==================== ESTADÍSTICAS ====================

function cargarEstadisticasDetalladas() {
    const total = listaPersonas.length;
    if (total === 0) {
        document.getElementById('statAlumnosDetallado').textContent = '0';
        document.getElementById('statProfesoresDetallado').textContent = '0';
        document.getElementById('statPreceptoresDetallado').textContent = '0';
        document.getElementById('statDirectivosDetallado').textContent = '0';
        return;
    }
    
    const alumnos = listaPersonas.filter(p => p.rol === 'alumno').length;
    const profesores = listaPersonas.filter(p => p.rol === 'profesor').length;
    const preceptores = listaPersonas.filter(p => p.rol === 'preceptor').length;
    const directivos = listaPersonas.filter(p => p.rol === 'directivo').length;
    const presentes = listaPersonas.filter(p => p.estado === 'Presente').length;
    const ausentes = listaPersonas.filter(p => p.estado === 'Ausente').length;
    
    document.getElementById('statAlumnosDetallado').textContent = alumnos;
    document.getElementById('statProfesoresDetallado').textContent = profesores;
    document.getElementById('statPreceptoresDetallado').textContent = preceptores;
    document.getElementById('statDirectivosDetallado').textContent = directivos;
    document.getElementById('totalPersonasDetallado').textContent = total;
    document.getElementById('totalPresentesDetallado').textContent = presentes;
    document.getElementById('totalAusentesDetallado').textContent = ausentes;
    document.getElementById('totalTarjetasAsignadas').textContent = listaPersonas.filter(p => p.tarjeta_id).length;
    document.getElementById('totalCursosActivos').textContent = listaCursos.length;
    
    const circunferencia = 2 * Math.PI * 15.9155;
    const circleAlumnos = document.querySelector('.circle-alumnos');
    const circleProfesores = document.querySelector('.circle-profesores');
    const circlePreceptores = document.querySelector('.circle-preceptores');
    const circleDirectivos = document.querySelector('.circle-directivos');
    
    if (circleAlumnos) circleAlumnos.setAttribute('stroke-dasharray', `${(alumnos / total) * circunferencia}, ${circunferencia}`);
    if (circleProfesores) circleProfesores.setAttribute('stroke-dasharray', `${(profesores / total) * circunferencia}, ${circunferencia}`);
    if (circlePreceptores) circlePreceptores.setAttribute('stroke-dasharray', `${(preceptores / total) * circunferencia}, ${circunferencia}`);
    if (circleDirectivos) circleDirectivos.setAttribute('stroke-dasharray', `${(directivos / total) * circunferencia}, ${circunferencia}`);
    
    const percentages = document.querySelectorAll('.percentage');
    const valores = [alumnos, profesores, preceptores, directivos];
    percentages.forEach((el, i) => {
        if (el) el.textContent = `${Math.round((valores[i] / total) * 100)}%`;
    });
}

function exportarEstadisticasAExcel() {
    if (!usuarioActual || usuarioActual.rol !== 'directivo') return;
    
    const resumen = [
        ['RESUMEN GENERAL DEL SISTEMA'],
        ['Métrica', 'Valor'],
        ['Total Personas', listaPersonas.length],
        ['Alumnos', listaPersonas.filter(p => p.rol === 'alumno').length],
        ['Profesores', listaPersonas.filter(p => p.rol === 'profesor').length],
        ['Preceptores', listaPersonas.filter(p => p.rol === 'preceptor').length],
        ['Directivos', listaPersonas.filter(p => p.rol === 'directivo').length],
        ['Presentes', listaPersonas.filter(p => p.estado === 'Presente').length],
        ['Ausentes', listaPersonas.filter(p => p.estado === 'Ausente').length],
        ['Tarjetas RFID', listaPersonas.filter(p => p.tarjeta_id).length],
        ['Cursos Activos', listaCursos.length]
    ];
    
    let csv = '';
    resumen.forEach(fila => { csv += fila.join(',') + '\n'; });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `estadisticas_expotec_${new Date().toISOString().split('T')[0]}.csv`;
    enlace.click();
    
    mostrarNotificacion('Estadísticas exportadas', 'success');
}

function imprimirEstadisticas() {
    window.print();
}

// ==================== FUNCIONES DE INICIALIZACIÓN ====================

function guardarPersonas() { localStorage.setItem('personas', JSON.stringify(listaPersonas)); }
function guardarCursos() { localStorage.setItem('cursos', JSON.stringify(listaCursos)); }

function cargarDatosIniciales() {
    const storedPersonas = localStorage.getItem('personas');
    if (storedPersonas) {
        listaPersonas = JSON.parse(storedPersonas);
    } else {
        listaPersonas = [
            { id: '1', tarjeta_id: 'A1B2C3D4', nombre: 'Ana', apellido: 'García', dni: '12345678', rol: 'alumno', detalle: '4° A', estado: 'Presente', fecha_registro: new Date().toISOString(), foto: null },
            { id: '2', tarjeta_id: 'E5F6G7H8', nombre: 'Carlos', apellido: 'López', dni: '87654321', rol: 'profesor', detalle: 'Matemáticas', estado: 'Presente', fecha_registro: new Date().toISOString(), foto: null },
            { id: '3', tarjeta_id: 'I9J0K1L2', nombre: 'María', apellido: 'Rodríguez', dni: '11223344', rol: 'preceptor', detalle: 'Secretaría', estado: 'Presente', fecha_registro: new Date().toISOString(), foto: null },
            { id: '4', tarjeta_id: 'M3N4O5P6', nombre: 'Juan', apellido: 'Pérez', dni: '44332211', rol: 'directivo', detalle: 'Director', estado: 'Presente', fecha_registro: new Date().toISOString(), foto: null }
        ];
        guardarPersonas();
    }
    
    const storedUsuarios = localStorage.getItem('usuarios');
    if (storedUsuarios) {
        listaUsuarios = JSON.parse(storedUsuarios);
    } else {
        listaUsuarios = [
            { usuario: 'admin', contrasena: '1234', rol: 'directivo', activo: true, fechaCreacion: new Date().toISOString() },
            { usuario: 'profesor1', contrasena: '1234', rol: 'profesor', activo: true, fechaCreacion: new Date().toISOString() },
            { usuario: 'preceptor1', contrasena: '1234', rol: 'preceptor', activo: true, fechaCreacion: new Date().toISOString() },
            { usuario: 'alumno1', contrasena: '1234', rol: 'alumno', activo: true, fechaCreacion: new Date().toISOString() }
        ];
        localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
    }
    
    const storedCursos = localStorage.getItem('cursos');
    if (storedCursos) {
        listaCursos = JSON.parse(storedCursos);
    } else {
        listaCursos = [
            { id: '1', anio: 4, division: 2, fechaCreacion: new Date().toISOString() },
            { id: '2', anio: 5, division: 1, fechaCreacion: new Date().toISOString() }
        ];
        guardarCursos();
    }
    
    const storedConfig = localStorage.getItem('configuracion');
    if (storedConfig) configuracionSistema = JSON.parse(storedConfig);
    
    const storedUsuario = localStorage.getItem('usuarioActual');
    if (storedUsuario) usuarioActual = JSON.parse(storedUsuario);
}

function actualizarUIporSesion() {
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    const btnLoginHeader = document.getElementById('btnLoginHeader');
    const sidebar = document.getElementById('sidebar');
    
    if (usuarioActual) {
        if (loginSection) loginSection.classList.remove('active');
        if (userInfo) userInfo.style.display = 'flex';
        if (btnLoginHeader) btnLoginHeader.style.display = 'none';
        
        document.getElementById('userName').textContent = usuarioActual.usuario;
        let rolTexto = '';
        switch(usuarioActual.rol) {
            case 'directivo': rolTexto = 'Directivo'; break;
            case 'profesor': rolTexto = 'Profesor'; break;
            case 'preceptor': rolTexto = 'Preceptor'; break;
            case 'alumno': rolTexto = 'Alumno'; break;
            default: rolTexto = usuarioActual.rol;
        }
        document.getElementById('userRole').textContent = rolTexto;
        document.getElementById('sidebarUserName').textContent = usuarioActual.usuario;
        document.getElementById('sidebarUserRole').textContent = rolTexto;
        
        renderizarSidebar();
        
        // Carga inicial de datos según rol
        if (usuarioActual.rol === 'directivo') {
            cargarTablaUsuariosGestion();
            cargarEstadisticasDetalladas();
            cargarTablaPersonasSimplificada();
            cargarTablaCursos();
            cargarTablaPersonasPrincipal();
            actualizarEstadisticasRapidas();
        } else if (usuarioActual.rol === 'preceptor') {
            cargarTablaPersonasSimplificada();
            cargarTablaCursos();
            cargarTablaPersonasPrincipal();
            actualizarEstadisticasRapidas();
        } else if (usuarioActual.rol === 'profesor') {
            cargarTablaPersonasPrincipal();
            actualizarEstadisticasRapidas();
        }
        
        cargarAnuncios();
        
        const puedeGestionarPersonas = (usuarioActual.rol === 'directivo' || usuarioActual.rol === 'preceptor');
        const btnNuevaPersona = document.getElementById('btnNuevaPersona');
        const nuevaPersonaBtn = document.getElementById('nuevaPersonaBtn');
        if (btnNuevaPersona) btnNuevaPersona.style.display = puedeGestionarPersonas ? 'inline-flex' : 'none';
        if (nuevaPersonaBtn) nuevaPersonaBtn.style.display = puedeGestionarPersonas ? 'inline-flex' : 'none';
        
        const btnCrearAnuncioContainer = document.getElementById('btnCrearAnuncioContainer');
        if (btnCrearAnuncioContainer) {
            btnCrearAnuncioContainer.style.display = (usuarioActual.rol === 'directivo' || usuarioActual.rol === 'preceptor') ? 'block' : 'none';
        }
        
    } else {
        if (loginSection) loginSection.classList.add('active');
        if (userInfo) userInfo.style.display = 'none';
        if (btnLoginHeader) btnLoginHeader.style.display = 'flex';
        if (sidebar) sidebar.classList.remove('active');
        
        const sidebarMenu = document.getElementById('sidebarMenu');
        if (sidebarMenu) {
            sidebarMenu.innerHTML = '<li style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5);">Inicie sesión para continuar</li>';
        }
    }
}

// ==================== FUNCIONES RFID ====================

function resetearRFID() {
    const rfidMessage = document.getElementById('rfidMessage');
    const tarjetaIdInput = document.getElementById('tarjetaId');
    const tarjetaIdManual = document.getElementById('tarjetaIdManual');
    if (rfidMessage) {
        rfidMessage.innerHTML = '<i class="fas fa-rss"></i><span>Escanear Tarjeta...</span>';
        rfidMessage.classList.remove('scanning', 'scanned');
    }
    if (tarjetaIdInput) tarjetaIdInput.value = '';
    if (tarjetaIdManual) tarjetaIdManual.value = '';
}

function manejarTarjetaEscaneada(codigo) {
    const tarjetaIdInput = document.getElementById('tarjetaId');
    const rfidMessage = document.getElementById('rfidMessage');
    const tarjetaIdManual = document.getElementById('tarjetaIdManual');
    if (tarjetaIdInput) tarjetaIdInput.value = codigo;
    if (tarjetaIdManual) tarjetaIdManual.value = codigo;
    if (rfidMessage) {
        rfidMessage.innerHTML = `<i class="fas fa-check"></i><span>Tarjeta: ${codigo}</span>`;
        rfidMessage.classList.remove('scanning');
        rfidMessage.classList.add('scanned');
    }
}

async function conectarRFID() {
    try {
        if (!puertoSerial) {
            if (!('serial' in navigator)) {
                mostrarNotificacion('Tu navegador no soporta la API Serial. Usa Chrome o Edge.', 'error');
                return;
            }
            mostrarCarga('Conectando al lector RFID...');
            puertoSerial = await navigator.serial.requestPort();
            await puertoSerial.open({ baudRate: 115200 });
            ocultarCarga();
            const botonConectar = document.getElementById('connectBtn');
            if (botonConectar) {
                botonConectar.innerHTML = '<i class="fas fa-plug"></i> Conectado';
                botonConectar.classList.add("connected");
            }
            const rfidMessage = document.getElementById('rfidMessage');
            if (rfidMessage) {
                rfidMessage.innerHTML = '<i class="fas fa-rss"></i><span>Escaneando...</span>';
                rfidMessage.classList.add('scanning');
            }
            mostrarNotificacion('Lector RFID conectado', 'success');
            escucharPuertoSerial();
        } else {
            desconectarRFID();
        }
    } catch (err) {
        ocultarCarga();
        mostrarNotificacion('Error al conectar: ' + err.message, 'error');
        resetearRFID();
    }
}

async function desconectarRFID() {
    if (lectorSerial) { await lectorSerial.cancel(); lectorSerial = null; }
    if (puertoSerial) { await puertoSerial.close(); puertoSerial = null; }
    const botonConectar = document.getElementById('connectBtn');
    if (botonConectar) {
        botonConectar.innerHTML = '<i class="fas fa-plug"></i> Conectar RFID';
        botonConectar.classList.remove("connected");
    }
    resetearRFID();
    mostrarNotificacion('Lector RFID desconectado', 'info');
}

async function escucharPuertoSerial() {
    try {
        const decodificador = new TextDecoderStream();
        puertoSerial.readable.pipeTo(decodificador.writable);
        lectorSerial = decodificador.readable.getReader();
        let buffer = "";
        while (true) {
            const { value, done } = await lectorSerial.read();
            if (done) break;
            if (!value) continue;
            buffer += value;
            let lineas = buffer.split(/\r?\n/);
            buffer = lineas.pop();
            for (let linea of lineas) {
                const codigo = linea.trim();
                if (codigo && /^[A-F0-9]+$/i.test(codigo)) {
                    manejarTarjetaEscaneada(codigo.toUpperCase());
                }
            }
        }
    } catch (error) {
        console.error('Error en lectura serial:', error);
        if (error.name !== 'InterruptedError') {
            mostrarNotificacion('Error en lectura serial', 'error');
        }
    }
}

// ==================== FORMULARIO NUEVA PERSONA ====================

function configurarCampoDinamico() {
    const rolSelect = document.getElementById('rol');
    const campoDinamico = document.getElementById('campoDinamico');
    const labelDinamico = document.getElementById('labelDinamico');
    const inputContainer = document.getElementById('inputDinamicoContainer');
    if (!rolSelect || !campoDinamico || !inputContainer) return;
    const rol = rolSelect.value;
    if (rol === '') { campoDinamico.classList.add('hidden'); return; }
    campoDinamico.classList.remove('hidden');
    inputContainer.innerHTML = '';
    switch(rol) {
        case 'alumno':
            labelDinamico.innerHTML = '<i class="fas fa-graduation-cap"></i> Curso';
            const selectCurso = document.createElement('select');
            selectCurso.id = 'inputDinamico';
            selectCurso.name = 'campo_adicional';
            selectCurso.required = true;
            selectCurso.innerHTML = '<option value="">Seleccionar curso</option>';
            listaCursos.forEach(curso => {
                const option = document.createElement('option');
                option.value = `${curso.anio}° ${curso.division}`;
                option.textContent = `${curso.anio}° ${curso.division}ra División`;
                selectCurso.appendChild(option);
            });
            inputContainer.appendChild(selectCurso);
            break;
        case 'profesor':
            labelDinamico.innerHTML = '<i class="fas fa-book"></i> Materia';
            const inputMateria = document.createElement('input');
            inputMateria.type = 'text';
            inputMateria.id = 'inputDinamico';
            inputMateria.name = 'campo_adicional';
            inputMateria.placeholder = 'Ej: Matemáticas';
            inputMateria.required = true;
            inputContainer.appendChild(inputMateria);
            break;
        case 'preceptor':
            labelDinamico.innerHTML = '<i class="fas fa-briefcase"></i> Área';
            const inputArea = document.createElement('input');
            inputArea.type = 'text';
            inputArea.id = 'inputDinamico';
            inputArea.name = 'campo_adicional';
            inputArea.placeholder = 'Ej: Secretaría';
            inputArea.required = true;
            inputContainer.appendChild(inputArea);
            break;
        case 'directivo':
            labelDinamico.innerHTML = '<i class="fas fa-user-tie"></i> Cargo';
            const inputCargo = document.createElement('input');
            inputCargo.type = 'text';
            inputCargo.id = 'inputDinamico';
            inputCargo.name = 'campo_adicional';
            inputCargo.placeholder = 'Ej: Director';
            inputCargo.required = true;
            inputContainer.appendChild(inputCargo);
            break;
    }
}

function manejarEnvioNuevaPersona(e) {
    e.preventDefault();
    const tarjetaIdInput = document.getElementById('tarjetaId');
    const tarjetaIdManual = document.getElementById('tarjetaIdManual');
    let codigoRFID = '';
    if (tarjetaIdManual?.value.trim()) codigoRFID = tarjetaIdManual.value.trim().toUpperCase();
    else if (tarjetaIdInput?.value) codigoRFID = tarjetaIdInput.value;
    const rol = document.getElementById('rol').value;
    if (rol === 'alumno' && !codigoRFID) {
        mostrarNotificacion('Debe escanear o ingresar el código RFID para registrar un alumno', 'warning');
        return;
    }
    if (codigoRFID && listaPersonas.find(p => p.tarjeta_id === codigoRFID)) {
        mostrarNotificacion('Esta tarjeta ya está registrada', 'error');
        return;
    }
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const dni = document.getElementById('dni').value;
    const campoAdicional = document.getElementById('inputDinamico')?.value || '';
    if (!campoAdicional) {
        const campos = { alumno: 'un curso', profesor: 'una materia', preceptor: 'un área', directivo: 'un cargo' };
        mostrarNotificacion(`Debe especificar ${campos[rol]}`, 'warning');
        return;
    }
    const nuevaPersona = {
        id: Date.now().toString(),
        tarjeta_id: codigoRFID || `MANUAL_${Date.now()}`,
        nombre, apellido, dni: dni || null,
        rol, detalle: campoAdicional,
        estado: 'Presente',
        fecha_registro: new Date().toISOString(),
        foto: fotoSeleccionada || null
    };
    listaPersonas.push(nuevaPersona);
    guardarPersonas();
    cargarTablaPersonasPrincipal();
    cargarTablaPersonasSimplificada();
    actualizarEstadisticasRapidas();
    if (usuarioActual?.rol === 'directivo') cargarEstadisticasDetalladas();
    mostrarNotificacion('Persona registrada exitosamente', 'success');
    cerrarModal('nuevoAlumnoModal');
}

// ==================== INICIALIZACIÓN DE EVENTOS ====================

function inicializarEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');
    
    menuToggle?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    const cerrar = () => {
        document.getElementById('sidebar').classList.remove('active');
        overlay?.classList.remove('active');
        document.body.style.overflow = 'auto';
    };
    closeSidebar?.addEventListener('click', cerrar);
    overlay?.addEventListener('click', cerrar);
    
    document.getElementById('btnLogoutHeader')?.addEventListener('click', cerrarSesion);
    document.getElementById('btnConfiguracion')?.addEventListener('click', () => mostrarModal('configuracionModal'));
    document.getElementById('btnExportar')?.addEventListener('click', () => mostrarNotificacion('Exportando datos...', 'info'));
    document.getElementById('btnAsociarUsuario')?.addEventListener('click', () => { cargarSelectPersonas(); mostrarModal('asociarUsuarioModal'); });
    document.getElementById('btnCrearAnuncio')?.addEventListener('click', () => mostrarModal('crearAnuncioModal'));
    document.getElementById('btnNuevoCurso')?.addEventListener('click', () => mostrarModal('nuevoCursoModal'));
    document.getElementById('btnExportarEstadisticas')?.addEventListener('click', exportarEstadisticasAExcel);
    document.getElementById('btnImprimirEstadisticas')?.addEventListener('click', imprimirEstadisticas);
    
    const abrirModalPersona = () => {
        if (usuarioActual?.rol === 'directivo' || usuarioActual?.rol === 'preceptor') {
            resetearRFID();
            fotoSeleccionada = null;
            document.getElementById('previewImage').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
            document.getElementById('btnEliminarFoto').style.display = 'none';
            mostrarModal('nuevoAlumnoModal');
        } else {
            mostrarNotificacion('No tienes permisos', 'warning');
        }
    };
    document.getElementById('btnNuevaPersona')?.addEventListener('click', abrirModalPersona);
    document.getElementById('nuevaPersonaBtn')?.addEventListener('click', abrirModalPersona);
    
    document.getElementById('fotoPerfil')?.addEventListener('change', (e) => { if (e.target.files?.[0]) manejarSeleccionFoto(e.target.files[0]); });
    document.getElementById('btnEliminarFoto')?.addEventListener('click', eliminarFotoSeleccionada);
    document.getElementById('rol')?.addEventListener('change', configurarCampoDinamico);
    document.getElementById('connectBtn')?.addEventListener('click', conectarRFID);
    document.getElementById('tarjetaIdManual')?.addEventListener('input', function() { document.getElementById('tarjetaId').value = this.value.toUpperCase(); });
    document.getElementById('formNuevoAlumno')?.addEventListener('submit', manejarEnvioNuevaPersona);
    
    document.getElementById('formNuevoCurso')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const anio = document.getElementById('anio').value;
        const division = document.getElementById('division').value;
        if (anio && division) {
            listaCursos.push({ id: Date.now().toString(), anio: parseInt(anio), division: parseInt(division), fechaCreacion: new Date().toISOString() });
            guardarCursos();
            cargarTablaCursos();
            cerrarModal('nuevoCursoModal');
            mostrarNotificacion('Curso creado', 'success');
        }
    });
    
    document.getElementById('formAsociarUsuario')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const usuario = document.getElementById('nuevoUsuarioNombre').value;
        const pass = document.getElementById('nuevoUsuarioPass').value;
        const rol = document.getElementById('nuevoUsuarioRol').value;
        const idPersona = document.getElementById('selectPersona').value;
        if (!usuario || !pass || !rol || !idPersona) { mostrarNotificacion('Complete todos los campos', 'warning'); return; }
        if (pass.length < 4) { mostrarNotificacion('La contraseña debe tener al menos 4 caracteres', 'warning'); return; }
        if (asociarUsuarioAPersona(usuario, pass, rol, idPersona)) {
            cerrarModal('asociarUsuarioModal');
            cargarTablaUsuariosGestion();
            mostrarNotificacion('Usuario asociado', 'success');
        }
    });
    
    document.getElementById('formCrearAnuncio')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const titulo = document.getElementById('anuncioTitulo').value;
        const contenido = document.getElementById('anuncioContenido').value;
        const visibilidad = document.getElementById('anuncioVisibilidad').value;
        if (titulo && contenido) {
            crearAnuncio(titulo, contenido, visibilidad);
            cerrarModal('crearAnuncioModal');
            mostrarNotificacion('Anuncio publicado', 'success');
        }
    });
    
    document.getElementById('formConfiguracion')?.addEventListener('submit', (e) => {
        e.preventDefault();
        configuracionSistema.tema = document.getElementById('configTema').value;
        configuracionSistema.autoSave = document.getElementById('configAutoSave').checked;
        localStorage.setItem('configuracion', JSON.stringify(configuracionSistema));
        document.body.classList.remove('tema-default', 'tema-dark', 'tema-light');
        document.body.classList.add(`tema-${configuracionSistema.tema}`);
        cerrarModal('configuracionModal');
        mostrarNotificacion('Configuración guardada', 'success');
    });
    
    document.querySelectorAll('#personas .filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('#personas .filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            cargarTablaPersonasSimplificada(this.dataset.filter);
        });
    });
    
    document.querySelectorAll('#cursos .filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('#cursos .filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            cargarTablaCursos(this.dataset.filter);
        });
    });
    
    document.querySelectorAll('#asistencias .filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('#asistencias .filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filtroActual = this.dataset.filter;
            currentPage = 1;
            cargarTablaPersonasPrincipal();
            actualizarEstadisticasRapidas();
        });
    });
    
    document.getElementById('searchPersonas')?.addEventListener('input', function(e) {
        const termino = e.target.value.toLowerCase();
        document.querySelectorAll('#personasTableBody_personas tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(termino) ? '' : 'none';
        });
    });
    
    document.getElementById('searchCursos')?.addEventListener('input', function(e) {
        const termino = e.target.value.toLowerCase();
        document.querySelectorAll('#cursosTableBody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(termino) ? '' : 'none';
        });
    });
    
    document.getElementById('searchInput')?.addEventListener('input', () => { currentPage = 1; cargarTablaPersonasPrincipal(); });
    document.getElementById('prevPage')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; cargarTablaPersonasPrincipal(); } });
    document.getElementById('nextPage')?.addEventListener('click', () => { currentPage++; cargarTablaPersonasPrincipal(); });
    
    document.getElementById('btnCambiarEstado')?.addEventListener('click', () => {
        if (personaActualFicha) {
            const nuevoEstado = personaActualFicha.estado === 'Presente' ? 'Ausente' : 'Presente';
            mostrarConfirmacion(`¿Cambiar estado a ${nuevoEstado}?`, () => {
                personaActualFicha.estado = nuevoEstado;
                guardarPersonas();
                cargarTablaPersonasPrincipal();
                actualizarEstadisticasRapidas();
                if (usuarioActual?.rol === 'directivo') cargarEstadisticasDetalladas();
                mostrarFichaAlumno(personaActualFicha.tarjeta_id);
                mostrarNotificacion(`Estado cambiado a ${nuevoEstado}`, 'success');
            });
        }
    });
    
    document.getElementById('btnEliminarFicha')?.addEventListener('click', () => {
        if (personaActualFicha) {
            mostrarConfirmacion(`¿Eliminar a ${personaActualFicha.nombre}?`, () => {
                listaPersonas = listaPersonas.filter(p => p.tarjeta_id !== personaActualFicha.tarjeta_id);
                guardarPersonas();
                cargarTablaPersonasPrincipal();
                cargarTablaPersonasSimplificada();
                actualizarEstadisticasRapidas();
                if (usuarioActual?.rol === 'directivo') cargarEstadisticasDetalladas();
                cerrarModal('fichaAlumnoModal');
                mostrarNotificacion('Persona eliminada', 'success');
            });
        }
    });

        // ==================== CIERRE DE MODALES GLOBAL ====================
    // Cerrar modal al hacer clic en la X (close-modal)
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) cerrarModal(modal.id);
        });
    });

    // Cerrar modal al hacer clic en el botón Cancelar (dentro de modales)
    document.querySelectorAll('.modal .btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) cerrarModal(modal.id);
        });
    });

    // Cerrar modal al hacer clic en el overlay (fondo oscuro)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                cerrarModal(modal.id);
            }
        });
    });
}

// ==================== INICIO DEL SISTEMA ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== SISTEMA EXPOTEC 2026 INICIADO ===');
    cargarDatosIniciales();
    inicializarLogin();
    inicializarEventListeners();
    actualizarUIporSesion();
    document.body.classList.add(`tema-${configuracionSistema.tema}`);
});