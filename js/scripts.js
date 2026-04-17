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
 * - Directivo: Ve todo (Personas, Cursos, Asistencias, Estadísticas, Usuarios, Administración, Anuncios, Profesores)
 * 
 * @version 5.0
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

// Variables para nuevas funcionalidades
let personaEditando = null;
let nuevaFotoEdit = null;
let fechaActualAsistencia = new Date().toISOString().split('T')[0];

// ==================== FUNCIONES DE MODALES ====================

function mostrarNotificacion(mensaje, tipo = 'info', titulo = null) {
    const modal = document.getElementById('notificationModal');
    const icon = document.getElementById('notificationIcon');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    
    let icono = 'fa-info-circle';
    let tituloPorDefecto = 'Notificación';
    
    switch(tipo) {
        case 'success':
            icono = 'fa-check-circle';
            tituloPorDefecto = 'Éxito';
            break;
        case 'error':
            icono = 'fa-exclamation-circle';
            tituloPorDefecto = 'Error';
            break;
        case 'warning':
            icono = 'fa-exclamation-triangle';
            tituloPorDefecto = 'Advertencia';
            break;
        default:
            icono = 'fa-info-circle';
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
    profesores: { id: 'profesores', icono: 'fa-chalkboard-teacher', texto: 'Profesores', roles: ['directivo'] },
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
        case 'profesores':
            cargarTablaProfesores();
            actualizarStatsProfesores();
            break;
        default:
            break;
    }
}

function renderizarSidebar() {
    const sidebarMenuContainer = document.getElementById('sidebarMenuContainer');
    if (!sidebarMenuContainer) return;
    
    if (!usuarioActual) {
        sidebarMenuContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5);">Inicie sesión para ver las opciones</div>';
        return;
    }
    
    const secciones = obtenerSeccionesPorRol(usuarioActual.rol);
    
    if (secciones.length === 0) {
        sidebarMenuContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5);">Sin opciones disponibles</div>';
        return;
    }
    
    const grupos = {
        principal: { titulo: 'Sistema Escolar', items: ['anuncios', 'asistencias'] },
        gestion: { titulo: 'Gestión', items: ['personas', 'cursos', 'profesores'] },
        analisis: { titulo: 'Análisis', items: ['estadisticas', 'usuariosGestion'] },
        sistema: { titulo: 'Sistema', items: ['administracion'] }
    };
    
    const getSeccionInfo = (id) => {
        const seccion = SECCIONES[id];
        return seccion ? { icono: seccion.icono, texto: seccion.texto } : null;
    };
    
    let html = '';
    
    for (const [grupoKey, grupo] of Object.entries(grupos)) {
        const itemsDelGrupo = grupo.items.filter(itemId => secciones.some(s => s.id === itemId));
        if (itemsDelGrupo.length === 0) continue;
        
        html += `<div class="nav-section">`;
        html += `<div class="nav-section-title">${grupo.titulo}</div>`;
        html += `<ul>`;
        
        itemsDelGrupo.forEach(itemId => {
            const info = getSeccionInfo(itemId);
            if (info) {
                html += `
                    <li>
                        <a href="#${itemId}" class="nav-link" data-section="${itemId}">
                            <i class="fas ${info.icono}"></i>
                            <span>${info.texto}</span>
                        </a>
                    </li>
                `;
            }
        });
        
        html += `</ul>`;
        html += `</div>`;
    }
    
    sidebarMenuContainer.innerHTML = html;
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) targetSection.classList.add('active');
            refrescarSeccionActiva(sectionId);
            if (window.innerWidth < 992) cerrarSidebar();
        });
    });
    
    const primeraSeccion = secciones[0]?.id;
    if (primeraSeccion) {
        const seccionActiva = document.getElementById(primeraSeccion);
        if (seccionActiva && !seccionActiva.classList.contains('active')) {
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            seccionActiva.classList.add('active');
        }
        const activeLink = document.querySelector(`.nav-link[data-section="${primeraSeccion}"]`);
        if (activeLink) activeLink.classList.add('active');
        refrescarSeccionActiva(primeraSeccion);
    }
    
    hacerSidebarColapsable();
}

function cerrarSidebar() {
    document.getElementById('sidebar')?.classList.remove('active');
    document.getElementById('overlay')?.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function hacerSidebarColapsable() {
    document.querySelectorAll('.nav-section').forEach(section => {
        const title = section.querySelector('.nav-section-title');
        const ul = section.querySelector('ul');
        
        if (title && ul && !title.hasAttribute('data-collapsible-setup')) {
            title.setAttribute('data-collapsible-setup', 'true');
            title.style.cursor = 'pointer';
            title.style.display = 'flex';
            title.style.justifyContent = 'space-between';
            title.style.alignItems = 'center';
            
            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = '<i class="fas fa-chevron-down" style="font-size: 0.6rem;"></i>';
            title.appendChild(iconSpan);
            
            let collapsed = false;
            title.addEventListener('click', (e) => {
                e.stopPropagation();
                collapsed = !collapsed;
                ul.style.display = collapsed ? 'none' : 'block';
                iconSpan.innerHTML = collapsed ? '<i class="fas fa-chevron-right" style="font-size: 0.6rem;"></i>' : '<i class="fas fa-chevron-down" style="font-size: 0.6rem;"></i>';
            });
        }
    });
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
                    rol: usuarioEncontrado.rol.toLowerCase(),
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
            { id: 1, titulo: 'Bienvenidos al ciclo lectivo 2024', contenido: 'Se informa a toda la comunidad educativa que el ciclo lectivo dará inicio el día 1 de marzo.', visibilidad: 'todos', autor: 'Dirección', fecha: new Date().toISOString() },
            { id: 2, titulo: 'Reunión de padres', contenido: 'Se convoca a reunión de padres el día viernes 15 a las 18:00 hs en el salón de actos.', visibilidad: 'todos', autor: 'Preceptoría', fecha: new Date().toISOString() }
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
    
    document.querySelectorAll('.editar-persona').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); abrirModalEditarPersona(btn.getAttribute('data-id')); });
    });
}

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
    
    document.querySelectorAll('.editar-persona').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); abrirModalEditarPersona(btn.getAttribute('data-id')); });
    });
}

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

// ==================== PROFESORES (DEFINIDO ANTES DE cargarDatosIniciales) ====================

let listaProfesores = [];
let profesorEditando = null;
let materiasTemp = [];
let horarioTemp = [];
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function cargarDatosProfesores() {
    const stored = localStorage.getItem('profesores');
    if (stored) {
        listaProfesores = JSON.parse(stored);
    } else {
        listaProfesores = [
            {
                id: '1',
                nombre: 'Carlos',
                apellido: 'López',
                email: 'carlos.lopez@escuela.edu',
                telefono: '1234-5678',
                dni: '87654321',
                fechaIngreso: '2023-03-01',
                foto: null,
                estado: 'activo',
                materias: ['Matemáticas', 'Álgebra'],
                horario: [
                    { dia: 'Lunes', hora: '08:00 - 10:00', materia: 'Matemáticas' },
                    { dia: 'Miércoles', hora: '10:00 - 12:00', materia: 'Álgebra' }
                ]
            },
            {
                id: '2',
                nombre: 'Laura',
                apellido: 'Martínez',
                email: 'laura.martinez@escuela.edu',
                telefono: '8765-4321',
                dni: '12345678',
                fechaIngreso: '2023-03-01',
                foto: null,
                estado: 'activo',
                materias: ['Lengua', 'Literatura'],
                horario: [
                    { dia: 'Martes', hora: '08:00 - 10:00', materia: 'Lengua' },
                    { dia: 'Jueves', hora: '10:00 - 12:00', materia: 'Literatura' }
                ]
            }
        ];
        guardarProfesores();
    }
    actualizarStatsProfesores();
    cargarTablaProfesores();
}

function guardarProfesores() {
    localStorage.setItem('profesores', JSON.stringify(listaProfesores));
}

function actualizarStatsProfesores() {
    const total = listaProfesores.length;
    const totalMaterias = listaProfesores.reduce((sum, p) => sum + (p.materias?.length || 0), 0);
    const totalHoras = listaProfesores.reduce((sum, p) => sum + (p.horario?.length || 0), 0);
    
    const statsTotal = document.getElementById('totalProfesoresStats');
    const statsMaterias = document.getElementById('totalMateriasStats');
    const statsHoras = document.getElementById('totalHorasStats');
    
    if (statsTotal) statsTotal.textContent = total;
    if (statsMaterias) statsMaterias.textContent = totalMaterias;
    if (statsHoras) statsHoras.textContent = totalHoras;
}

function cargarTablaProfesores() {
    const tbody = document.getElementById('profesoresTableBody');
    if (!tbody) return;
    
    const filtro = document.querySelector('#profesoresFiltros .filter-tab.active')?.dataset.filter || 'todos';
    const searchTerm = document.getElementById('searchProfesores')?.value.toLowerCase() || '';
    
    let profesoresFiltrados = [...listaProfesores];
    
    if (filtro !== 'todos') {
        profesoresFiltrados = profesoresFiltrados.filter(p => p.estado === filtro);
    }
    if (searchTerm) {
        profesoresFiltrados = profesoresFiltrados.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm) || 
            p.apellido.toLowerCase().includes(searchTerm) ||
            (p.email && p.email.toLowerCase().includes(searchTerm))
        );
    }
    
    if (profesoresFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay profesores registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = profesoresFiltrados.map(profesor => `
        <tr class="clickable-row" data-id="${profesor.id}">
            <td>${profesor.foto ? `<img src="${profesor.foto}" class="user-thumb">` : '<i class="fas fa-user-circle" style="font-size: 35px; color: #bdc3c7;"></i>'}</td>
            <td>${profesor.id}</td>
            <td>${profesor.nombre}</td>
            <td>${profesor.apellido}</td>
            <td>${profesor.email || '-'}</td>
            <td>${profesor.telefono || '-'}</td>
            <td>${profesor.materias?.length || 0} materias</td>
            <td><span class="status ${profesor.estado === 'activo' ? 'active' : 'inactive'}">${profesor.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <button class="btn-icon ver-perfil-profesor" data-id="${profesor.id}"><i class="fas fa-id-card"></i></button>
                <button class="btn-icon editar-profesor" data-id="${profesor.id}"><i class="fas fa-edit"></i></button>
                <button class="btn-icon eliminar-profesor" data-id="${profesor.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.ver-perfil-profesor').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); verPerfilProfesor(btn.getAttribute('data-id')); });
    });
    document.querySelectorAll('.editar-profesor').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); editarProfesor(btn.getAttribute('data-id')); });
    });
    document.querySelectorAll('.eliminar-profesor').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); eliminarProfesor(btn.getAttribute('data-id')); });
    });
}

function abrirModalNuevoProfesor() {
    profesorEditando = null;
    materiasTemp = [];
    horarioTemp = [];
    
    const titleEl = document.getElementById('profesorModalTitle');
    if (titleEl) titleEl.textContent = 'Nuevo Profesor';
    
    document.getElementById('profesorId').value = '';
    document.getElementById('profesorNombre').value = '';
    document.getElementById('profesorApellido').value = '';
    document.getElementById('profesorEmail').value = '';
    document.getElementById('profesorTelefono').value = '';
    document.getElementById('profesorDni').value = '';
    document.getElementById('profesorFechaIngreso').value = new Date().toISOString().split('T')[0];
    document.getElementById('profesorEstado').value = 'activo';
    document.getElementById('profesorPreviewImage').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    
    renderizarMateriasTemp();
    renderizarHorarioTemp();
    
    mostrarModal('profesorModal');
}

function editarProfesor(id) {
    const profesor = listaProfesores.find(p => p.id === id);
    if (!profesor) return;
    
    profesorEditando = profesor;
    materiasTemp = [...(profesor.materias || [])];
    horarioTemp = [...(profesor.horario || [])];
    
    const titleEl = document.getElementById('profesorModalTitle');
    if (titleEl) titleEl.textContent = 'Editar Profesor';
    
    document.getElementById('profesorId').value = profesor.id;
    document.getElementById('profesorNombre').value = profesor.nombre;
    document.getElementById('profesorApellido').value = profesor.apellido;
    document.getElementById('profesorEmail').value = profesor.email || '';
    document.getElementById('profesorTelefono').value = profesor.telefono || '';
    document.getElementById('profesorDni').value = profesor.dni || '';
    document.getElementById('profesorFechaIngreso').value = profesor.fechaIngreso || '';
    document.getElementById('profesorEstado').value = profesor.estado || 'activo';
    document.getElementById('profesorPreviewImage').src = profesor.foto || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    
    renderizarMateriasTemp();
    renderizarHorarioTemp();
    
    mostrarModal('profesorModal');
}

function renderizarMateriasTemp() {
    const container = document.getElementById('materiasContainer');
    if (!container) return;
    
    if (materiasTemp.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 0.5rem; color: #6c757d;">No hay materias agregadas</div>';
        return;
    }
    
    container.innerHTML = materiasTemp.map((materia, index) => `
        <div class="materia-item">
            <span class="materia-nombre">${materia}</span>
            <button type="button" class="materia-eliminar" data-index="${index}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.materia-eliminar').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'));
            materiasTemp.splice(index, 1);
            renderizarMateriasTemp();
        });
    });
}

function renderizarHorarioTemp() {
    const container = document.getElementById('horarioContainer');
    if (!container) return;
    
    if (horarioTemp.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 0.5rem; color: #6c757d;">No hay horarios agregados</div>';
        return;
    }
    
    container.innerHTML = horarioTemp.map((item, index) => `
        <div class="horario-row">
            <select class="horario-dia" data-index="${index}" data-field="dia">
                ${diasSemana.map(dia => `<option value="${dia}" ${item.dia === dia ? 'selected' : ''}>${dia}</option>`).join('')}
            </select>
            <input type="text" class="horario-hora" value="${item.hora}" placeholder="Ej: 08:00 - 10:00" data-index="${index}" data-field="hora">
            <input type="text" class="horario-materia" value="${item.materia}" placeholder="Materia" data-index="${index}" data-field="materia" style="flex:1; padding:0.3rem; border:1px solid var(--border-color); border-radius:6px;">
            <button type="button" class="btn-eliminar-horario" data-index="${index}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.horario-dia, .horario-hora, .horario-materia').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const field = this.getAttribute('data-field');
            if (horarioTemp[index]) {
                horarioTemp[index][field] = this.value;
            }
        });
    });
    
    document.querySelectorAll('.btn-eliminar-horario').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'));
            horarioTemp.splice(index, 1);
            renderizarHorarioTemp();
        });
    });
}

function agregarMateria() {
    const nuevaMateria = prompt('Ingrese el nombre de la materia:');
    if (nuevaMateria && nuevaMateria.trim()) {
        materiasTemp.push(nuevaMateria.trim());
        renderizarMateriasTemp();
    }
}

function agregarHorario() {
    horarioTemp.push({ dia: 'Lunes', hora: '08:00 - 10:00', materia: '' });
    renderizarHorarioTemp();
}

async function guardarProfesor(e) {
    e.preventDefault();
    
    const id = document.getElementById('profesorId').value;
    const nombre = document.getElementById('profesorNombre').value;
    const apellido = document.getElementById('profesorApellido').value;
    const email = document.getElementById('profesorEmail').value;
    const telefono = document.getElementById('profesorTelefono').value;
    const dni = document.getElementById('profesorDni').value;
    const fechaIngreso = document.getElementById('profesorFechaIngreso').value;
    const estado = document.getElementById('profesorEstado').value;
    
    if (!nombre || !apellido) {
        mostrarNotificacion('Complete nombre y apellido', 'warning');
        return;
    }
    
    let foto = null;
    const fotoInput = document.getElementById('profesorFoto');
    if (fotoInput.files && fotoInput.files[0]) {
        mostrarCarga('Procesando imagen...');
        try {
            foto = await convertirImagenABase64(fotoInput.files[0]);
            ocultarCarga();
        } catch (error) {
            ocultarCarga();
            mostrarNotificacion('Error al procesar la imagen', 'error');
        }
    } else if (profesorEditando && profesorEditando.foto) {
        foto = profesorEditando.foto;
    }
    
    const profesorData = {
        id: id || Date.now().toString(),
        nombre,
        apellido,
        email,
        telefono,
        dni,
        fechaIngreso,
        estado,
        foto,
        materias: materiasTemp,
        horario: horarioTemp
    };
    
    if (id) {
        const index = listaProfesores.findIndex(p => p.id === id);
        if (index !== -1) listaProfesores[index] = profesorData;
    } else {
        listaProfesores.push(profesorData);
    }
    
    guardarProfesores();
    actualizarStatsProfesores();
    cargarTablaProfesores();
    cerrarModal('profesorModal');
    mostrarNotificacion('Profesor guardado correctamente', 'success');
}

function eliminarProfesor(id) {
    mostrarConfirmacion('¿Eliminar este profesor?', () => {
        listaProfesores = listaProfesores.filter(p => p.id !== id);
        guardarProfesores();
        actualizarStatsProfesores();
        cargarTablaProfesores();
        mostrarNotificacion('Profesor eliminado', 'success');
    });
}

function verPerfilProfesor(id) {
    const profesor = listaProfesores.find(p => p.id === id);
    if (!profesor) return;
    
    document.getElementById('perfilProfesorNombre').textContent = `${profesor.nombre} ${profesor.apellido}`;
    document.getElementById('perfilProfesorEmail').textContent = profesor.email || '-';
    document.getElementById('perfilProfesorTelefono').textContent = profesor.telefono || '-';
    document.getElementById('perfilProfesorDni').textContent = profesor.dni || '-';
    document.getElementById('perfilProfesorFechaIngreso').textContent = profesor.fechaIngreso ? new Date(profesor.fechaIngreso).toLocaleDateString() : '-';
    document.getElementById('perfilProfesorEstado').textContent = profesor.estado === 'activo' ? 'Activo' : 'Inactivo';
    document.getElementById('perfilProfesorEstado').className = `status ${profesor.estado === 'activo' ? 'active' : 'inactive'}`;
    document.getElementById('perfilProfesorFoto').src = profesor.foto || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    
    const materiasContainer = document.getElementById('perfilMateriasList');
    if (profesor.materias && profesor.materias.length > 0) {
        materiasContainer.innerHTML = profesor.materias.map(m => `<span class="materia-badge">${m}</span>`).join('');
    } else {
        materiasContainer.innerHTML = '<span class="materia-badge">Sin materias asignadas</span>';
    }
    
    const horarioContainer = document.getElementById('perfilHorarioTable');
    if (profesor.horario && profesor.horario.length > 0) {
        horarioContainer.innerHTML = `
            <table class="horario-table">
                <thead><tr><th>Día</th><th>Horario</th><th>Materia</th></tr></thead>
                <tbody>
                    ${profesor.horario.map(h => `<tr><td>${h.dia}</td><td>${h.hora}</td><td>${h.materia || '-'}</td></tr>`).join('')}
                </tbody>
            </table>
        `;
    } else {
        horarioContainer.innerHTML = '<p>No hay horario registrado</p>';
    }
    
    const btnEditar = document.getElementById('btnEditarPerfilProfesor');
    const btnEliminar = document.getElementById('btnEliminarPerfilProfesor');
    const btnAsistencia = document.getElementById('btnAsistenciaProfesor');
    
    if (btnEditar) btnEditar.onclick = () => {
        cerrarModal('perfilProfesorModal');
        editarProfesor(id);
    };
    if (btnEliminar) btnEliminar.onclick = () => {
        cerrarModal('perfilProfesorModal');
        eliminarProfesor(id);
    };
    if (btnAsistencia) btnAsistencia.onclick = () => {
        cerrarModal('perfilProfesorModal');
        const asistenciaLink = document.querySelector('.nav-link[data-section="asistencias"]');
        if (asistenciaLink) asistenciaLink.click();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = `${profesor.nombre} ${profesor.apellido}`;
            searchInput.dispatchEvent(new Event('input'));
        }
    };
    
    mostrarModal('perfilProfesorModal');
}

function exportarProfesoresExcel() {
    const datos = listaProfesores.map(p => ({
        'ID': p.id,
        'Nombre': p.nombre,
        'Apellido': p.apellido,
        'Email': p.email || '-',
        'Teléfono': p.telefono || '-',
        'DNI': p.dni || '-',
        'Materias': (p.materias || []).join(', '),
        'Horas/Semana': p.horario?.length || 0,
        'Estado': p.estado === 'activo' ? 'Activo' : 'Inactivo'
    }));
    
    if (datos.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'warning');
        return;
    }
    
    const cabeceras = Object.keys(datos[0]);
    let csv = cabeceras.join(',') + '\n';
    datos.forEach(fila => {
        const valores = cabeceras.map(cab => {
            let valor = fila[cab] || '';
            if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
                valor = `"${valor.replace(/"/g, '""')}"`;
            }
            return valor;
        });
        csv += valores.join(',') + '\n';
    });
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(blob);
    enlace.href = url;
    enlace.setAttribute('download', `profesores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Lista de profesores exportada', 'success');
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

    cargarDatosProfesores();
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
        
        if (usuarioActual.rol === 'directivo') {
            cargarTablaUsuariosGestion();
            cargarEstadisticasDetalladas();
            cargarTablaPersonasSimplificada();
            cargarTablaCursos();
            cargarTablaPersonasPrincipal();
            cargarTablaProfesores();
            actualizarEstadisticasRapidas();
            actualizarStatsProfesores();
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
        
        const sidebarMenuContainer = document.getElementById('sidebarMenuContainer');
        if (sidebarMenuContainer) {
            sidebarMenuContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.5);">Inicie sesión para continuar</div>';
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

// ==================== EDITAR PERSONA ====================

function abrirModalEditarPersona(personaId) {
    const persona = listaPersonas.find(p => p.tarjeta_id === personaId || p.id === personaId);
    if (!persona) return;
    
    personaEditando = persona;
    nuevaFotoEdit = null;
    
    document.getElementById('editPersonaId').value = persona.tarjeta_id || persona.id;
    document.getElementById('editNombre').value = persona.nombre;
    document.getElementById('editApellido').value = persona.apellido;
    document.getElementById('editDni').value = persona.dni || '';
    document.getElementById('editTarjetaId').value = persona.tarjeta_id || '';
    document.getElementById('editRol').value = persona.rol;
    
    const preview = document.getElementById('editPreviewImage');
    preview.src = persona.foto || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    
    configurarCampoDinamicoEdicion(persona.rol, persona.detalle);
    
    mostrarModal('editarPersonaModal');
}

function configurarCampoDinamicoEdicion(rol, valorActual) {
    const container = document.getElementById('editInputContainer');
    const label = document.getElementById('editLabelDinamico');
    
    if (!container) return;
    container.innerHTML = '';
    
    switch(rol) {
        case 'alumno':
            label.innerHTML = '<i class="fas fa-graduation-cap"></i> Curso';
            const selectCurso = document.createElement('select');
            selectCurso.id = 'editInputDinamico';
            selectCurso.className = 'edit-field';
            selectCurso.innerHTML = '<option value="">Seleccionar curso</option>';
            listaCursos.forEach(curso => {
                const option = document.createElement('option');
                option.value = `${curso.anio}° ${curso.division}`;
                option.textContent = `${curso.anio}° ${curso.division}ra División`;
                if (option.value === valorActual) option.selected = true;
                selectCurso.appendChild(option);
            });
            container.appendChild(selectCurso);
            break;
        case 'profesor':
            label.innerHTML = '<i class="fas fa-book"></i> Materia';
            const inputMateria = document.createElement('input');
            inputMateria.type = 'text';
            inputMateria.id = 'editInputDinamico';
            inputMateria.className = 'edit-field';
            inputMateria.value = valorActual || '';
            inputMateria.placeholder = 'Ej: Matemáticas';
            container.appendChild(inputMateria);
            break;
        case 'preceptor':
            label.innerHTML = '<i class="fas fa-briefcase"></i> Área';
            const inputArea = document.createElement('input');
            inputArea.type = 'text';
            inputArea.id = 'editInputDinamico';
            inputArea.className = 'edit-field';
            inputArea.value = valorActual || '';
            inputArea.placeholder = 'Ej: Secretaría';
            container.appendChild(inputArea);
            break;
        case 'directivo':
            label.innerHTML = '<i class="fas fa-user-tie"></i> Cargo';
            const inputCargo = document.createElement('input');
            inputCargo.type = 'text';
            inputCargo.id = 'editInputDinamico';
            inputCargo.className = 'edit-field';
            inputCargo.value = valorActual || '';
            inputCargo.placeholder = 'Ej: Director';
            container.appendChild(inputCargo);
            break;
        default:
            document.getElementById('editCampoDinamico').style.display = 'none';
            return;
    }
    document.getElementById('editCampoDinamico').style.display = 'block';
}

async function guardarEdicionPersona(e) {
    e.preventDefault();
    
    if (!personaEditando) return;
    
    const nuevoDetalle = document.getElementById('editInputDinamico')?.value || '';
    const nuevoRol = document.getElementById('editRol').value;
    
    if (nuevoRol === 'alumno' && !nuevoDetalle) {
        mostrarNotificacion('Debe seleccionar un curso', 'warning');
        return;
    }
    
    personaEditando.nombre = document.getElementById('editNombre').value;
    personaEditando.apellido = document.getElementById('editApellido').value;
    personaEditando.dni = document.getElementById('editDni').value;
    personaEditando.rol = nuevoRol;
    personaEditando.detalle = nuevoDetalle;
    
    if (nuevaFotoEdit) {
        personaEditando.foto = nuevaFotoEdit;
    }
    
    guardarPersonas();
    
    cargarTablaPersonasPrincipal();
    cargarTablaPersonasSimplificada();
    actualizarEstadisticasRapidas();
    if (usuarioActual?.rol === 'directivo') cargarEstadisticasDetalladas();
    
    cerrarModal('editarPersonaModal');
    mostrarNotificacion('Persona actualizada correctamente', 'success');
}

async function manejarFotoEdit(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        mostrarNotificacion('La imagen es demasiado grande. Máximo 2MB', 'warning');
        return;
    }
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif'];
    if (!tiposPermitidos.includes(file.type)) {
        mostrarNotificacion('Formato no soportado', 'warning');
        return;
    }
    
    mostrarCarga('Procesando imagen...');
    try {
        const base64 = await convertirImagenABase64(file);
        nuevaFotoEdit = base64;
        document.getElementById('editPreviewImage').src = base64;
        ocultarCarga();
    } catch (error) {
        ocultarCarga();
        mostrarNotificacion('Error al procesar la imagen', 'error');
    }
}

// ==================== EXPORTAR FUNCIONES ====================

function exportarPersonasExcel() {
    const filtro = document.querySelector('#personas .filter-tab.active')?.dataset.filter || 'todos';
    const searchTerm = document.getElementById('searchPersonas')?.value.toLowerCase() || '';
    
    let personasFiltradas = listaPersonas;
    if (filtro !== 'todos') {
        personasFiltradas = listaPersonas.filter(p => p.rol === filtro);
    }
    if (searchTerm) {
        personasFiltradas = personasFiltradas.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm) || 
            p.apellido.toLowerCase().includes(searchTerm)
        );
    }
    
    const datos = personasFiltradas.map(p => ({
        'ID': p.tarjeta_id || p.id || '-',
        'Nombre': p.nombre,
        'Apellido': p.apellido,
        'DNI': p.dni || '-',
        'Rol': p.rol,
        'Detalle': p.detalle || '-',
        'Estado': p.estado || 'Presente',
        'Fecha Registro': new Date(p.fecha_registro).toLocaleDateString()
    }));
    
    if (datos.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'warning');
        return;
    }
    
    const cabeceras = Object.keys(datos[0]);
    let csv = cabeceras.join(',') + '\n';
    datos.forEach(fila => {
        const valores = cabeceras.map(cab => {
            let valor = fila[cab] || '';
            if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
                valor = `"${valor.replace(/"/g, '""')}"`;
            }
            return valor;
        });
        csv += valores.join(',') + '\n';
    });
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(blob);
    enlace.href = url;
    enlace.setAttribute('download', `personas_${filtro}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Lista de personas exportada', 'success');
}

function exportarCursosExcel() {
    const datos = listaCursos.map(curso => {
        const cantidadAlumnos = listaPersonas.filter(p => p.rol === 'alumno' && p.detalle === `${curso.anio}° ${curso.division}`).length;
        return {
            'Año': `${curso.anio}° Año`,
            'División': `${curso.division}ra División`,
            'Cantidad Alumnos': cantidadAlumnos,
            'Fecha Creación': new Date(curso.fechaCreacion).toLocaleDateString()
        };
    });
    
    if (datos.length === 0) {
        mostrarNotificacion('No hay cursos para exportar', 'warning');
        return;
    }
    
    const cabeceras = Object.keys(datos[0]);
    let csv = cabeceras.join(',') + '\n';
    datos.forEach(fila => {
        const valores = cabeceras.map(cab => fila[cab] || '');
        csv += valores.join(',') + '\n';
    });
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(blob);
    enlace.href = url;
    enlace.setAttribute('download', `cursos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Lista de cursos exportada', 'success');
}

function exportarAsistenciaExcel() {
    const fechaSeleccionada = document.getElementById('fechaAsistencia')?.value || new Date().toISOString().split('T')[0];
    const filtro = filtroActual || 'todos';
    
    let personasFiltradas = listaPersonas;
    if (filtro !== 'todos') {
        personasFiltradas = listaPersonas.filter(p => p.rol === filtro);
    }
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    if (searchTerm) {
        personasFiltradas = personasFiltradas.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm) || 
            p.apellido.toLowerCase().includes(searchTerm) ||
            (p.tarjeta_id && p.tarjeta_id.toLowerCase().includes(searchTerm))
        );
    }
    
    const asistenciasFecha = JSON.parse(localStorage.getItem('asistencias_historico') || '{}');
    
    const datos = personasFiltradas.map(p => ({
        'ID Tarjeta': p.tarjeta_id || '-',
        'Nombre': p.nombre,
        'Apellido': p.apellido,
        'DNI': p.dni || '-',
        'Rol': p.rol,
        'Detalle': p.detalle || '-',
        'Estado': asistenciasFecha[`${p.tarjeta_id}_${fechaSeleccionada}`] || p.estado || 'Presente',
        'Fecha': fechaSeleccionada
    }));
    
    if (datos.length === 0) {
        mostrarNotificacion('No hay datos para exportar', 'warning');
        return;
    }
    
    const cabeceras = Object.keys(datos[0]);
    let csv = cabeceras.join(',') + '\n';
    
    datos.forEach(fila => {
        const valores = cabeceras.map(cab => {
            let valor = fila[cab] || '';
            if (typeof valor === 'string' && (valor.includes(',') || valor.includes('"'))) {
                valor = `"${valor.replace(/"/g, '""')}"`;
            }
            return valor;
        });
        csv += valores.join(',') + '\n';
    });
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(blob);
    enlace.href = url;
    enlace.setAttribute('download', `asistencia_${fechaSeleccionada}_${filtro}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('Exportado a Excel correctamente', 'success');
}

// ==================== HISTORIAL DE ASISTENCIA POR FECHA ====================

function cargarAsistenciasPorFecha(fecha) {
    const asistenciasHistorico = JSON.parse(localStorage.getItem('asistencias_historico') || '{}');
    const fechaStr = fecha || fechaActualAsistencia;
    
    listaPersonas.forEach(persona => {
        const key = `${persona.tarjeta_id}_${fechaStr}`;
        if (asistenciasHistorico[key]) {
            persona.estado_original = persona.estado;
            persona.estado = asistenciasHistorico[key];
        } else if (fechaStr !== new Date().toISOString().split('T')[0]) {
            persona.estado_original = persona.estado;
            persona.estado = 'Sin registro';
        }
    });
    
    cargarTablaPersonasPrincipal();
    
    let fechaLabel = document.querySelector('.asistencia-fecha-actual');
    if (!fechaLabel) {
        fechaLabel = document.createElement('div');
        fechaLabel.className = 'asistencia-fecha-actual';
        const statsBar = document.querySelector('.stats-bar');
        if (statsBar) statsBar.insertAdjacentElement('afterend', fechaLabel);
    }
    fechaLabel.innerHTML = `<i class="fas fa-clock"></i> Mostrando asistencia del: ${new Date(fechaStr).toLocaleDateString()}`;
    
    if (!document.getElementById('btnRestaurarHoy')) {
        const btnRestaurar = document.createElement('button');
        btnRestaurar.id = 'btnRestaurarHoy';
        btnRestaurar.className = 'btn btn-sm btn-secondary';
        btnRestaurar.innerHTML = '<i class="fas fa-undo"></i> Restaurar estado actual';
        btnRestaurar.style.marginLeft = '1rem';
        btnRestaurar.onclick = () => cargarAsistenciasPorFecha(new Date().toISOString().split('T')[0]);
        fechaLabel.appendChild(btnRestaurar);
    }
}

function guardarAsistenciaPorFecha(personaId, estado, fecha) {
    const asistenciasHistorico = JSON.parse(localStorage.getItem('asistencias_historico') || '{}');
    const key = `${personaId}_${fecha}`;
    asistenciasHistorico[key] = estado;
    localStorage.setItem('asistencias_historico', JSON.stringify(asistenciasHistorico));
}

function cambiarEstadoConFecha(personaId, nuevoEstado, fecha) {
    const persona = listaPersonas.find(p => p.tarjeta_id === personaId);
    if (persona) {
        if (fecha === new Date().toISOString().split('T')[0]) {
            persona.estado = nuevoEstado;
            guardarPersonas();
        } else {
            guardarAsistenciaPorFecha(personaId, nuevoEstado, fecha);
        }
        cargarAsistenciasPorFecha(fecha);
        mostrarNotificacion(`Estado cambiado a ${nuevoEstado} para la fecha ${fecha}`, 'success');
    }
}

// ==================== INICIALIZACIÓN DE EVENTOS ====================

function inicializarEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');
    
    menuToggle?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    const cerrarSidebarFn = () => {
        document.getElementById('sidebar').classList.remove('active');
        overlay?.classList.remove('active');
        document.body.style.overflow = 'auto';
    };
    closeSidebarBtn?.addEventListener('click', cerrarSidebarFn);
    overlay?.addEventListener('click', cerrarSidebarFn);
    
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
    document.getElementById('formEditarPersona')?.addEventListener('submit', guardarEdicionPersona);
    document.getElementById('editFotoPerfil')?.addEventListener('change', (e) => { if (e.target.files?.[0]) manejarFotoEdit(e.target.files[0]); });
    document.getElementById('btnEliminarFotoEdit')?.addEventListener('click', () => {
        nuevaFotoEdit = null;
        document.getElementById('editPreviewImage').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        mostrarNotificacion('Foto eliminada', 'info');
    });
    document.getElementById('editRol')?.addEventListener('change', function() { configurarCampoDinamicoEdicion(this.value, ''); });
    
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
    
    document.getElementById('btnCargarAsistenciaFecha')?.addEventListener('click', () => {
        const fecha = document.getElementById('fechaAsistencia').value;
        if (fecha) {
            fechaActualAsistencia = fecha;
            cargarAsistenciasPorFecha(fecha);
        }
    });
    
    document.getElementById('btnHoy')?.addEventListener('click', () => {
        const hoy = new Date().toISOString().split('T')[0];
        document.getElementById('fechaAsistencia').value = hoy;
        fechaActualAsistencia = hoy;
        listaPersonas.forEach(p => {
            if (p.estado_original) {
                p.estado = p.estado_original;
                delete p.estado_original;
            }
        });
        guardarPersonas();
        cargarAsistenciasPorFecha(hoy);
    });
    
    document.getElementById('btnExportarAsistenciaExcel')?.addEventListener('click', exportarAsistenciaExcel);
    
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
    
    const personasActionGroup = document.querySelector('#personas .action-group');
    if (personasActionGroup && !document.getElementById('exportarPersonasBtn')) {
        const btnExportarPersonas = document.createElement('button');
        btnExportarPersonas.id = 'exportarPersonasBtn';
        btnExportarPersonas.innerHTML = '<i class="fas fa-file-excel"></i> Exportar Excel';
        btnExportarPersonas.className = 'btn btn-excel btn-sm';
        btnExportarPersonas.onclick = exportarPersonasExcel;
        personasActionGroup.appendChild(btnExportarPersonas);
    }
    
    const cursosActionGroup = document.querySelector('#cursos .action-group');
    if (cursosActionGroup && !document.getElementById('exportarCursosBtn')) {
        const btnExportarCursos = document.createElement('button');
        btnExportarCursos.id = 'exportarCursosBtn';
        btnExportarCursos.innerHTML = '<i class="fas fa-file-excel"></i> Exportar Excel';
        btnExportarCursos.className = 'btn btn-excel btn-sm';
        btnExportarCursos.onclick = exportarCursosExcel;
        cursosActionGroup.appendChild(btnExportarCursos);
    }

    // Profesores
    const btnNuevoProfesor = document.getElementById('btnNuevoProfesor');
    if (btnNuevoProfesor) btnNuevoProfesor.addEventListener('click', abrirModalNuevoProfesor);
    
    const btnAgregarMateria = document.getElementById('btnAgregarMateria');
    if (btnAgregarMateria) btnAgregarMateria.addEventListener('click', agregarMateria);
    
    const btnAgregarHorario = document.getElementById('btnAgregarHorario');
    if (btnAgregarHorario) btnAgregarHorario.addEventListener('click', agregarHorario);
    
    const formProfesor = document.getElementById('formProfesor');
    if (formProfesor) formProfesor.addEventListener('submit', guardarProfesor);
    
    const btnExportarProfesores = document.getElementById('btnExportarProfesores');
    if (btnExportarProfesores) btnExportarProfesores.addEventListener('click', exportarProfesoresExcel);
    
    const profesorFoto = document.getElementById('profesorFoto');
    if (profesorFoto) {
        profesorFoto.addEventListener('change', (e) => {
            if (e.target.files?.[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const preview = document.getElementById('profesorPreviewImage');
                    if (preview) preview.src = ev.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }
    
    const btnEliminarFotoProfesor = document.getElementById('btnEliminarFotoProfesor');
    if (btnEliminarFotoProfesor) {
        btnEliminarFotoProfesor.addEventListener('click', () => {
            const preview = document.getElementById('profesorPreviewImage');
            if (preview) preview.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
            const input = document.getElementById('profesorFoto');
            if (input) input.value = '';
        });
    }

    const profesorFiltros = document.querySelectorAll('#profesoresFiltros .filter-tab');
    profesorFiltros.forEach(tab => {
        tab.addEventListener('click', function() {
            profesorFiltros.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            cargarTablaProfesores();
        });
    });

    const searchProfesores = document.getElementById('searchProfesores');
    if (searchProfesores) searchProfesores.addEventListener('input', () => cargarTablaProfesores());
}

// ==================== REINICIALIZAR EVENT LISTENERS GLOBALES ====================

function reinicializarEventListenersGlobales() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.removeEventListener('click', btn._closeModalHandler);
        btn._closeModalHandler = function() {
            const modal = this.closest('.modal');
            if (modal) cerrarModal(modal.id);
        };
        btn.addEventListener('click', btn._closeModalHandler);
    });

    document.querySelectorAll('.modal .btn-cancel').forEach(btn => {
        btn.removeEventListener('click', btn._cancelHandler);
        btn._cancelHandler = function() {
            const modal = this.closest('.modal');
            if (modal) cerrarModal(modal.id);
        };
        btn.addEventListener('click', btn._cancelHandler);
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.removeEventListener('click', modal._overlayHandler);
        modal._overlayHandler = function(e) {
            if (e.target === modal) {
                cerrarModal(modal.id);
            }
        };
        modal.addEventListener('click', modal._overlayHandler);
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