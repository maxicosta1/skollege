/**
 * ============================================================================
 * SISTEMA DE GESTIÓN ESCOLAR CON RFID - VERSIÓN COMPLETA
 * ============================================================================
 * 
 * Características:
 * - Foto de perfil en sidebar y header
 * - Carga de imágenes al registrar personas
 * - Ficha de alumno accesible desde cursos y personas
 * - Modales de notificación personalizados
 * - Control de permisos por rol
 * 
 * @version 3.0
 * @author Sistema Expotec 2026
 * ============================================================================
 */

// ==================== VARIABLES GLOBALES ====================

let puertoSerial = null;
let lectorSerial = null;
let listaPersonas = [];
let listaUsuarios = [];
let listaCursos = [];
let usuarioActual = null;
let filtroActual = 'todos';
let confirmCallback = null;
let fotoSeleccionada = null;
let personaActualFicha = null;

let configuracionSistema = {
    tema: 'default',
    autoSave: true
};

// ==================== FUNCIONES DE MODALES DE NOTIFICACIÓN ====================

function mostrarNotificacion(mensaje, tipo = 'info', titulo = null) {
    const modal = document.getElementById('notificationModal');
    const header = document.getElementById('notificationHeader');
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
        case 'info':
        default:
            icono = 'fa-info-circle';
            claseTipo = 'notification-info';
            tituloPorDefecto = 'Información';
            break;
    }
    
    icon.className = `fas ${icono}`;
    modal.classList.add(claseTipo);
    titleEl.textContent = titulo || tituloPorDefecto;
    messageEl.textContent = mensaje;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    const closeBtn = document.getElementById('notificationCloseBtn');
    const closeModalBtn = modal.querySelector('.close-modal');
    
    const cerrarNotificacion = () => {
        modal.classList.remove('active');
        modal.classList.remove(claseTipo);
        document.body.style.overflow = 'auto';
        closeBtn.removeEventListener('click', cerrarNotificacion);
        if (closeModalBtn) closeModalBtn.removeEventListener('click', cerrarNotificacion);
    };
    
    closeBtn.addEventListener('click', cerrarNotificacion);
    if (closeModalBtn) closeModalBtn.addEventListener('click', cerrarNotificacion);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarNotificacion();
        }
    });
}

function mostrarConfirmacion(mensaje, callbackOk, callbackCancel = null) {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    const closeModalBtn = modal.querySelector('.close-modal');
    
    messageEl.textContent = mensaje;
    confirmCallback = { ok: callbackOk, cancel: callbackCancel };
    
    const cerrarConfirmacion = () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        if (closeModalBtn) closeModalBtn.removeEventListener('click', handleCancel);
    };
    
    const handleOk = () => {
        if (confirmCallback && confirmCallback.ok) confirmCallback.ok();
        cerrarConfirmacion();
    };
    
    const handleCancel = () => {
        if (confirmCallback && confirmCallback.cancel) confirmCallback.cancel();
        cerrarConfirmacion();
    };
    
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    if (closeModalBtn) closeModalBtn.addEventListener('click', handleCancel);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            handleCancel();
        }
    });
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function mostrarCarga(mensaje = 'Procesando...') {
    const modal = document.getElementById('loadingModal');
    const messageEl = document.getElementById('loadingMessage');
    messageEl.textContent = mensaje;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function ocultarCarga() {
    const modal = document.getElementById('loadingModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ==================== FUNCIONES DE FOTO DE PERFIL ====================

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

// ==================== FUNCIONES DE FICHA DEL ALUMNO ====================

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
    
    const fotoImg = document.getElementById('fichaFoto');
    if (persona.foto) {
        fotoImg.src = persona.foto;
    } else {
        fotoImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    }
    
    mostrarModal('fichaAlumnoModal');
}

function cambiarEstadoFicha() {
    if (!personaActualFicha) return;
    
    const nuevoEstado = personaActualFicha.estado === 'Presente' ? 'Ausente' : 'Presente';
    mostrarConfirmacion(`¿Cambiar estado de ${personaActualFicha.nombre} ${personaActualFicha.apellido} a "${nuevoEstado}"?`, () => {
        personaActualFicha.estado = nuevoEstado;
        guardarPersonas();
        cargarTablaPersonasPrincipal();
        cargarTablaPersonasSimplificada();
        actualizarEstadisticasRapidas();
        if (usuarioActual && usuarioActual.cargo === 'directivo') {
            cargarEstadisticasDetalladas();
        }
        mostrarFichaAlumno(personaActualFicha.tarjeta_id);
        mostrarNotificacion(`Estado cambiado a ${nuevoEstado}`, 'success');
    });
}

function editarFicha() {
    if (!personaActualFicha) return;
    cerrarModal('fichaAlumnoModal');
    // Aquí se podría abrir un modal de edición
    mostrarNotificacion('Funcionalidad de edición en desarrollo', 'info');
}

function eliminarFicha() {
    if (!personaActualFicha) return;
    mostrarConfirmacion(`¿Eliminar permanentemente a ${personaActualFicha.nombre} ${personaActualFicha.apellido}?`, () => {
        listaPersonas = listaPersonas.filter(p => p.tarjeta_id !== personaActualFicha.tarjeta_id);
        guardarPersonas();
        cargarTablaPersonasPrincipal();
        cargarTablaPersonasSimplificada();
        actualizarEstadisticasRapidas();
        if (usuarioActual && usuarioActual.cargo === 'directivo') {
            cargarEstadisticasDetalladas();
        }
        cerrarModal('fichaAlumnoModal');
        mostrarNotificacion('Persona eliminada correctamente', 'success');
    });
}

// ==================== FUNCIONES DE INICIALIZACIÓN ====================

function cargarDatosIniciales() {
    const personasGuardadas = localStorage.getItem('personas');
    if (personasGuardadas) {
        listaPersonas = JSON.parse(personasGuardadas);
    } else {
        listaPersonas = [
            { 
                tarjeta_id: 'A1B2C3D4', 
                nombre: 'Ana', 
                apellido: 'García', 
                dni: '12345678',
                rol: 'alumno', 
                detalle: '4° A',
                estado: 'Presente',
                fecha_registro: new Date().toISOString(),
                foto: null
            },
            { 
                tarjeta_id: 'E5F6G7H8', 
                nombre: 'Carlos', 
                apellido: 'López', 
                dni: '87654321',
                rol: 'profesor', 
                detalle: 'Matemáticas',
                estado: 'Presente',
                fecha_registro: new Date().toISOString(),
                foto: null
            },
            { 
                tarjeta_id: 'I9J0K1L2', 
                nombre: 'María', 
                apellido: 'Rodríguez', 
                dni: '11223344',
                rol: 'alumno', 
                detalle: '3° C',
                estado: 'Ausente',
                fecha_registro: new Date().toISOString(),
                foto: null
            },
            { 
                tarjeta_id: 'M3N4O5P6', 
                nombre: 'Juan', 
                apellido: 'Pérez', 
                dni: '44332211',
                rol: 'directivo', 
                detalle: 'Director',
                estado: 'Presente',
                fecha_registro: new Date().toISOString(),
                foto: null
            }
        ];
        guardarPersonas();
    }

    const usuariosGuardados = localStorage.getItem('usuarios');
    if (usuariosGuardados) {
        listaUsuarios = JSON.parse(usuariosGuardados);
    } else {
        listaUsuarios = [
            {
                usuario: 'admin',
                contrasena: '1234',
                cargo: 'directivo',
                activo: true,
                nombre: 'Administrador',
                foto: null,
                fechaCreacion: new Date().toISOString()
            },
            {
                usuario: 'profesor1',
                contrasena: '1234',
                cargo: 'profesor',
                activo: true,
                nombre: 'Profesor Demo',
                foto: null,
                fechaCreacion: new Date().toISOString()
            }
        ];
        localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
    }

    const cursosGuardados = localStorage.getItem('cursos');
    if (cursosGuardados) {
        listaCursos = JSON.parse(cursosGuardados);
    } else {
        listaCursos = [];
    }

    const configGuardada = localStorage.getItem('configuracion');
    if (configGuardada) {
        configuracionSistema = JSON.parse(configGuardada);
    }

    const usuarioActualGuardado = localStorage.getItem('usuarioActual');
    if (usuarioActualGuardado) {
        usuarioActual = JSON.parse(usuarioActualGuardado);
        actualizarVisibilidadPorRol();
    }
}

function guardarPersonas() {
    localStorage.setItem('personas', JSON.stringify(listaPersonas));
}

function guardarCursos() {
    localStorage.setItem('cursos', JSON.stringify(listaCursos));
}

function guardarConfiguracionSistema() {
    localStorage.setItem('configuracion', JSON.stringify(configuracionSistema));
}

function aplicarConfiguracion() {
    document.body.classList.remove('tema-default', 'tema-dark', 'tema-light');
    document.body.classList.add(`tema-${configuracionSistema.tema}`);

    if (configuracionSistema.autoSave) {
        window.addEventListener('beforeunload', guardarDatosAutomaticamente);
    } else {
        window.removeEventListener('beforeunload', guardarDatosAutomaticamente);
    }
}

function guardarDatosAutomaticamente() {
    if (configuracionSistema.autoSave) {
        localStorage.setItem('personas', JSON.stringify(listaPersonas));
        localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
        localStorage.setItem('cursos', JSON.stringify(listaCursos));
        localStorage.setItem('configuracion', JSON.stringify(configuracionSistema));
    }
}

// ==================== CONTROL DE VISIBILIDAD POR ROL ====================

function actualizarVisibilidadPorRol() {
    const navEstadisticas = document.getElementById('navEstadisticas');
    const userInfo = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    const userRoleSpan = document.getElementById('userRole');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const sidebarUserCourse = document.getElementById('sidebarUserCourse');
    const userAvatarSidebar = document.getElementById('userAvatarSidebar');
    const headerAvatar = document.getElementById('headerAvatar');
    
    if (usuarioActual) {
        const usuarioData = listaUsuarios.find(u => u.usuario === usuarioActual.usuario);
        
        if (userInfo) userInfo.style.display = 'flex';
        if (userNameSpan) userNameSpan.textContent = usuarioActual.usuario;
        if (userRoleSpan) userRoleSpan.textContent = usuarioActual.cargo === 'directivo' ? 'Directivo' : (usuarioActual.cargo === 'profesor' ? 'Profesor' : 'Preceptor');
        if (sidebarUserName) sidebarUserName.textContent = usuarioData?.nombre || usuarioActual.usuario;
        if (sidebarUserRole) sidebarUserRole.textContent = usuarioActual.cargo === 'directivo' ? 'Directivo' : (usuarioActual.cargo === 'profesor' ? 'Profesor' : 'Preceptor');
        if (sidebarUserCourse) sidebarUserCourse.textContent = usuarioData?.detalle || '';
        
        if (userAvatarSidebar) {
            userAvatarSidebar.innerHTML = usuarioData?.foto ? 
                `<img src="${usuarioData.foto}" alt="Foto">` : 
                `<i class="fas fa-user-circle"></i>`;
        }
        
        if (headerAvatar) {
            headerAvatar.innerHTML = usuarioData?.foto ? 
                `<img src="${usuarioData.foto}" alt="Foto">` : 
                `<i class="fas fa-user-circle"></i>`;
        }
        
        if (navEstadisticas) {
            if (usuarioActual.cargo === 'directivo') {
                navEstadisticas.style.display = 'block';
                navEstadisticas.classList.remove('nav-item-oculto');
            } else {
                navEstadisticas.style.display = 'none';
                navEstadisticas.classList.add('nav-item-oculto');
                
                const seccionEstadisticas = document.getElementById('estadisticas');
                if (seccionEstadisticas && seccionEstadisticas.classList.contains('active')) {
                    document.querySelector('.nav-link[data-section="home"]').click();
                }
            }
        }
        
        const btnGestionUsuarios = document.getElementById('btnGestionUsuarios');
        const btnConfiguracion = document.getElementById('btnConfiguracion');
        
        if (usuarioActual.cargo !== 'directivo') {
            if (btnGestionUsuarios) btnGestionUsuarios.style.display = 'none';
            if (btnConfiguracion) btnConfiguracion.style.display = 'none';
        } else {
            if (btnGestionUsuarios) btnGestionUsuarios.style.display = 'inline-flex';
            if (btnConfiguracion) btnConfiguracion.style.display = 'inline-flex';
        }
    } else {
        if (userInfo) userInfo.style.display = 'none';
        if (navEstadisticas) navEstadisticas.style.display = 'none';
        if (sidebarUserName) sidebarUserName.textContent = 'Invitado';
        if (sidebarUserRole) sidebarUserRole.textContent = '';
        if (sidebarUserCourse) sidebarUserCourse.textContent = '';
        if (userAvatarSidebar) userAvatarSidebar.innerHTML = '<i class="fas fa-user-circle"></i>';
    }
}

// ==================== FUNCIONES DE ESTADÍSTICAS DETALLADAS ====================

function cargarEstadisticasDetalladas() {
    if (!usuarioActual || usuarioActual.cargo !== 'directivo') return;
    
    const total = listaPersonas.length;
    const alumnos = listaPersonas.filter(p => p.rol === 'alumno').length;
    const profesores = listaPersonas.filter(p => p.rol === 'profesor').length;
    const preceptores = listaPersonas.filter(p => p.rol === 'preceptor').length;
    const directivos = listaPersonas.filter(p => p.rol === 'directivo').length;
    const presentes = listaPersonas.filter(p => p.estado === 'Presente').length;
    const ausentes = listaPersonas.filter(p => p.estado === 'Ausente').length;
    const tarjetasAsignadas = listaPersonas.filter(p => p.tarjeta_id && p.tarjeta_id !== '').length;
    
    document.getElementById('statAlumnosDetallado').textContent = alumnos;
    document.getElementById('statProfesoresDetallado').textContent = profesores;
    document.getElementById('statPreceptoresDetallado').textContent = preceptores;
    document.getElementById('statDirectivosDetallado').textContent = directivos;
    
    actualizarCirculoEstadistico('.circle-alumnos', (alumnos / total) * 100);
    actualizarCirculoEstadistico('.circle-profesores', (profesores / total) * 100);
    actualizarCirculoEstadistico('.circle-preceptores', (preceptores / total) * 100);
    actualizarCirculoEstadistico('.circle-directivos', (directivos / total) * 100);
    
    document.getElementById('totalPersonasDetallado').textContent = total;
    document.getElementById('totalPresentesDetallado').textContent = presentes;
    document.getElementById('totalAusentesDetallado').textContent = ausentes;
    document.getElementById('totalTarjetasAsignadas').textContent = tarjetasAsignadas;
    document.getElementById('totalCursosActivos').textContent = listaCursos.length;
    
    let totalAlumnosEnCursos = 0;
    listaCursos.forEach(curso => {
        const alumnosEnCurso = listaPersonas.filter(p => 
            p.rol === 'alumno' && 
            p.detalle === `${curso.anio}° ${curso.division}`
        ).length;
        totalAlumnosEnCursos += alumnosEnCurso;
    });
    const promedio = listaCursos.length > 0 ? (totalAlumnosEnCursos / listaCursos.length).toFixed(1) : 0;
    document.getElementById('promedioAlumnosPorCurso').textContent = promedio;
    
    cargarAsistenciaPorCurso();
}

function cargarAsistenciaPorCurso() {
    const tbody = document.getElementById('asistenciaPorCursoBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    listaCursos.forEach(curso => {
        const alumnosDelCurso = listaPersonas.filter(p => 
            p.rol === 'alumno' && 
            p.detalle === `${curso.anio}° ${curso.division}`
        );
        
        const totalAlumnos = alumnosDelCurso.length;
        const presentes = alumnosDelCurso.filter(p => p.estado === 'Presente').length;
        const ausentes = totalAlumnos - presentes;
        const porcentaje = totalAlumnos > 0 ? ((presentes / totalAlumnos) * 100).toFixed(1) : 0;
        
        let porcentajeClase = '';
        if (porcentaje >= 75) porcentajeClase = 'high';
        else if (porcentaje >= 50) porcentajeClase = 'medium';
        else porcentajeClase = 'low';
        
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><strong>${curso.anio}° ${curso.division}ra</strong></td>
            <td>${totalAlumnos}</td>
            <td>${presentes}</td>
            <td>${ausentes}</td>
            <td>
                <span class="percentage-badge ${porcentajeClase}">${porcentaje}%</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${porcentaje}%"></div>
                </div>
            </td>
        `;
        tbody.appendChild(fila);
    });
    
    if (listaCursos.length === 0) {
        const fila = document.createElement('tr');
        fila.innerHTML = '<td colspan="5" class="text-center">No hay cursos registrados</td>';
        tbody.appendChild(fila);
    }
}

function actualizarCirculoEstadistico(selector, porcentaje) {
    const circulo = document.querySelector(selector);
    if (!circulo) return;
    
    const texto = circulo.parentElement.querySelector('.percentage');
    const circunferencia = 2 * Math.PI * 15.9155;
    const dashArray = `${(porcentaje / 100) * circunferencia}, ${circunferencia}`;
    
    circulo.style.strokeDasharray = dashArray;
    if (texto) texto.textContent = `${Math.round(porcentaje)}%`;
}

function exportarEstadisticasAExcel() {
    if (!usuarioActual || usuarioActual.cargo !== 'directivo') return;
    
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
        ['Tarjetas RFID Asignadas', listaPersonas.filter(p => p.tarjeta_id).length],
        ['Cursos Activos', listaCursos.length],
        [],
        ['ASISTENCIA POR CURSO'],
        ['Curso', 'Total Alumnos', 'Presentes', 'Ausentes', 'Porcentaje']
    ];
    
    listaCursos.forEach(curso => {
        const alumnosDelCurso = listaPersonas.filter(p => 
            p.rol === 'alumno' && 
            p.detalle === `${curso.anio}° ${curso.division}`
        );
        const total = alumnosDelCurso.length;
        const presentes = alumnosDelCurso.filter(p => p.estado === 'Presente').length;
        const porcentaje = total > 0 ? ((presentes / total) * 100).toFixed(1) : 0;
        resumen.push([`${curso.anio}° ${curso.division}ra`, total, presentes, total - presentes, `${porcentaje}%`]);
    });
    
    let csv = '';
    resumen.forEach(fila => {
        csv += fila.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    enlace.setAttribute('href', url);
    enlace.setAttribute('download', `estadisticas_expotec_${new Date().toISOString().split('T')[0]}.csv`);
    enlace.style.visibility = 'hidden';
    
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    
    mostrarNotificacion('Estadísticas exportadas exitosamente', 'success');
}

function imprimirEstadisticas() {
    if (!usuarioActual || usuarioActual.cargo !== 'directivo') return;
    
    const seccionEstadisticas = document.getElementById('estadisticas');
    if (!seccionEstadisticas) return;
    
    const ventana = window.open('', '_blank');
    ventana.document.write(`
        <html>
            <head>
                <title>Reporte de Estadísticas - Expotec 2026</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #2c3e50; text-align: center; }
                    h2 { color: #3498db; margin-top: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Expotec 2026 - Reporte de Estadísticas</h1>
                    <p>Fecha de generación: ${new Date().toLocaleString()}</p>
                    <p>Generado por: ${usuarioActual.usuario} (${usuarioActual.cargo})</p>
                </div>
                ${seccionEstadisticas.innerHTML}
                <div class="footer">
                    <p>Este reporte es confidencial y solo para uso administrativo.</p>
                </div>
            </body>
        </html>
    `);
    ventana.document.close();
    ventana.print();
}

// ==================== FUNCIONES PARA MODALES ====================

function inicializarModales() {
    document.querySelectorAll('.close-modal').forEach(boton => {
        boton.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal && modal.id !== 'notificationModal' && modal.id !== 'confirmModal' && modal.id !== 'loadingModal') {
                cerrarModal(modal.id);
            }
        });
    });

    document.querySelectorAll('.btn-cancel').forEach(boton => {
        boton.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal && modal.id !== 'notificationModal' && modal.id !== 'confirmModal') {
                cerrarModal(modal.id);
            }
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                if (modal.id !== 'notificationModal' && modal.id !== 'confirmModal' && modal.id !== 'loadingModal') {
                    cerrarModal(modal.id);
                }
            }
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                if (modal.id !== 'notificationModal' && modal.id !== 'confirmModal' && modal.id !== 'loadingModal') {
                    cerrarModal(modal.id);
                }
            });
        }
    });
    
    const btnCambiarEstado = document.getElementById('btnCambiarEstado');
    const btnEditarFicha = document.getElementById('btnEditarFicha');
    const btnEliminarFicha = document.getElementById('btnEliminarFicha');
    
    if (btnCambiarEstado) btnCambiarEstado.addEventListener('click', cambiarEstadoFicha);
    if (btnEditarFicha) btnEditarFicha.addEventListener('click', editarFicha);
    if (btnEliminarFicha) btnEliminarFicha.addEventListener('click', eliminarFicha);
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    const formulario = modal.querySelector('form');
    if (formulario) formulario.reset();
    
    if (modalId === 'nuevoAlumnoModal') {
        const campoDinamico = document.getElementById('campoDinamico');
        if (campoDinamico) campoDinamico.classList.add('hidden');
        resetearRFID();
        fotoSeleccionada = null;
        const previewImg = document.getElementById('previewImage');
        if (previewImg) {
            previewImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        }
        document.getElementById('btnEliminarFoto').style.display = 'none';
    }
}

function mostrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// ==================== FUNCIONES PARA GESTIÓN DE CURSOS ====================

function crearCurso(anio, division) {
    const nuevoCurso = {
        id: Date.now().toString(),
        anio: parseInt(anio),
        division: parseInt(division),
        fechaCreacion: new Date().toISOString()
    };
    listaCursos.push(nuevoCurso);
    guardarCursos();
    return nuevoCurso;
}

function eliminarCurso(id) {
    mostrarConfirmacion('¿Está seguro de que desea eliminar este curso?', () => {
        listaCursos = listaCursos.filter(curso => curso.id !== id);
        guardarCursos();
        cargarTablaCursos();
        if (usuarioActual && usuarioActual.cargo === 'directivo') {
            cargarEstadisticasDetalladas();
        }
        mostrarNotificacion('Curso eliminado correctamente', 'success');
    });
}

function cargarTablaCursos(filtro = 'todos') {
    const tbody = document.getElementById('cursosTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    let cursosFiltrados = listaCursos;
    if (filtro !== 'todos') {
        cursosFiltrados = listaCursos.filter(curso => curso.anio.toString() === filtro);
    }

    cursosFiltrados.forEach(curso => {
        const cantidadAlumnos = listaPersonas.filter(persona => 
            persona.rol === 'alumno' && 
            persona.detalle === `${curso.anio}° ${curso.division}`
        ).length;

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${curso.anio}° Año</td>
            <td>${curso.division}ra División</td>
            <td>${cantidadAlumnos} alumno${cantidadAlumnos !== 1 ? 's' : ''}</td>
            <td>
                <button class="btn-icon" onclick="eliminarCurso('${curso.id}')">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon" onclick="verAlumnosDelCurso('${curso.id}')">
                    <i class="fas fa-users"></i>
                </button>
            </td>
        `;
        
        fila.addEventListener('click', function(e) {
            if (!e.target.closest('button')) {
                verAlumnosDelCurso(curso.id);
            }
        });
        fila.style.cursor = 'pointer';
        tbody.appendChild(fila);
    });
}

function verAlumnosDelCurso(cursoId) {
    const curso = listaCursos.find(c => c.id === cursoId);
    if (!curso) return;

    const titulo = document.getElementById('cursoTitulo');
    if (titulo) {
        titulo.textContent = `${curso.anio}° Año ${curso.division}ra División`;
    }

    const alumnosDelCurso = listaPersonas.filter(persona => 
        persona.rol === 'alumno' && 
        persona.detalle === `${curso.anio}° ${curso.division}`
    );

    const tbody = document.getElementById('alumnosCursoTableBody');
    if (tbody) {
        tbody.innerHTML = '';
        
        if (alumnosDelCurso.length === 0) {
            const fila = document.createElement('tr');
            fila.innerHTML = '<td colspan="5" class="text-center">No hay alumnos asignados a este curso</td>';
            tbody.appendChild(fila);
        } else {
            alumnosDelCurso.forEach(alumno => {
                const fila = document.createElement('tr');
                fila.className = 'clickable-row';
                fila.innerHTML = `
                    <td>
                        ${alumno.foto ? 
                            `<img src="${alumno.foto}" class="alumno-thumb" alt="Foto" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">` : 
                            `<i class="fas fa-user-circle" style="font-size: 35px; color: #bdc3c7;"></i>`
                        }
                    </td>
                    <td>${alumno.nombre || ''}</td>
                    <td>${alumno.apellido || ''}</td>
                    <td>${alumno.dni || '-'}</td>
                    <td>
                        <button class="btn-icon ver-ficha" data-id="${alumno.tarjeta_id}">
                            <i class="fas fa-id-card"></i> Ver Ficha
                        </button>
                    </td>
                `;
                fila.addEventListener('click', (e) => {
                    if (!e.target.closest('.ver-ficha')) {
                        mostrarFichaAlumno(alumno.tarjeta_id);
                    }
                });
                tbody.appendChild(fila);
            });
            
            document.querySelectorAll('.ver-ficha').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mostrarFichaAlumno(btn.getAttribute('data-id'));
                });
            });
        }
    }

    mostrarModal('alumnosCursoModal');
}

// ==================== FUNCIONES PARA GESTIÓN DE PERSONAS ====================

function cargarTablaPersonasSimplificada(filtro = 'todos') {
    const tbody = document.getElementById('personasTableBody_personas');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    let personasFiltradas = listaPersonas;
    if (filtro !== 'todos') {
        personasFiltradas = listaPersonas.filter(persona => persona.rol === filtro);
    }

    personasFiltradas.forEach(persona => {
        const fila = document.createElement('tr');
        fila.className = 'clickable-row';
        fila.innerHTML = `
            <td>
                ${persona.foto ? 
                    `<img src="${persona.foto}" class="user-thumb" alt="Foto" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">` : 
                    `<i class="fas fa-user-circle" style="font-size: 35px; color: #bdc3c7;"></i>`
                }
            </td>
            <td>${persona.tarjeta_id || persona.id || '-'}</td>
            <td>${persona.nombre}</td>
            <td>${persona.apellido}</td>
            <td><span class="rol-badge ${persona.rol}">${persona.rol}</span></td>
            <td>${persona.detalle || '-'}</td>
            <td>
                <button class="btn-icon ver-ficha-persona" data-id="${persona.tarjeta_id || persona.id}">
                    <i class="fas fa-id-card"></i> Ver Ficha
                </button>
                <button class="btn-icon" onclick="editarPersona('${persona.tarjeta_id || persona.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="eliminarPersonaPorId('${persona.tarjeta_id || persona.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        fila.addEventListener('click', (e) => {
            if (!e.target.closest('.ver-ficha-persona') && !e.target.closest('.btn-icon')) {
                mostrarFichaAlumno(persona.tarjeta_id || persona.id);
            }
        });
        tbody.appendChild(fila);
    });
    
    document.querySelectorAll('.ver-ficha-persona').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarFichaAlumno(btn.getAttribute('data-id'));
        });
    });
}

function cargarTablaPersonasPrincipal() {
    const tbody = document.getElementById('personasTableBody_asistencias');
    if (!tbody) return;
    
    const datosFiltrados = filtrarPersonas();
    
    tbody.innerHTML = '';
    
    datosFiltrados.forEach(persona => {
        const fila = document.createElement('tr');
        fila.className = 'clickable-row';
        fila.innerHTML = `
            <td>
                ${persona.foto ? 
                    `<img src="${persona.foto}" class="user-thumb" alt="Foto" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">` : 
                    `<i class="fas fa-user-circle" style="font-size: 35px; color: #bdc3c7;"></i>`
                }
            </td>
            <td><strong>${persona.tarjeta_id || 'No asignado'}</strong></td>
            <td>${persona.nombre}</td>
            <td>${persona.apellido}</td>
            <td><span class="rol-badge ${persona.rol}">${persona.rol}</span></td>
            <td>${persona.detalle || '-'}</td>
            <td><span class="status ${persona.estado === 'Presente' ? 'active' : 'inactive'}">${persona.estado}</span></td>
            <td>${new Date(persona.fecha_registro).toLocaleDateString()}</td>
            <td>
                <button class="btn-icon ver-ficha-asistencia" data-id="${persona.tarjeta_id}">
                    <i class="fas fa-id-card"></i>
                </button>
                <button class="btn-icon editar-persona" data-id="${persona.tarjeta_id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon eliminar-persona" data-id="${persona.tarjeta_id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        fila.addEventListener('click', (e) => {
            if (!e.target.closest('.ver-ficha-asistencia') && !e.target.closest('.editar-persona') && !e.target.closest('.eliminar-persona')) {
                mostrarFichaAlumno(persona.tarjeta_id);
            }
        });
        tbody.appendChild(fila);
    });
    
    const personasCountEl = document.getElementById('personasCount');
    const totalCountEl = document.getElementById('totalCount');
    
    if (personasCountEl) personasCountEl.textContent = datosFiltrados.length;
    if (totalCountEl) totalCountEl.textContent = listaPersonas.length;
    
    document.querySelectorAll('.ver-ficha-asistencia').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            mostrarFichaAlumno(btn.getAttribute('data-id'));
        });
    });
    
    agregarEventListenersAcciones();
}

function filtrarPersonas() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return listaPersonas;
    
    const terminoBusqueda = searchInput.value.toLowerCase();
    let filtradas = listaPersonas;
    
    if (filtroActual !== 'todos') {
        filtradas = filtradas.filter(p => p.rol === filtroActual);
    }
    
    if (terminoBusqueda) {
        filtradas = filtradas.filter(p => 
            p.nombre.toLowerCase().includes(terminoBusqueda) ||
            p.apellido.toLowerCase().includes(terminoBusqueda) ||
            (p.tarjeta_id && p.tarjeta_id.toLowerCase().includes(terminoBusqueda)) ||
            (p.detalle && p.detalle.toLowerCase().includes(terminoBusqueda)) ||
            (p.dni && p.dni.toLowerCase().includes(terminoBusqueda))
        );
    }
    
    return filtradas;
}

function agregarEventListenersAcciones() {
    document.querySelectorAll('.editar-persona').forEach(boton => {
        boton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!verificarPermiso('editar_personas')) return;
            const tarjetaId = this.getAttribute('data-id');
            editarPersona(tarjetaId);
        });
    });
    
    document.querySelectorAll('.eliminar-persona').forEach(boton => {
        boton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!verificarPermiso('eliminar_personas')) return;
            const tarjetaId = this.getAttribute('data-id');
            eliminarPersonaPorId(tarjetaId);
        });
    });
}

function editarPersona(tarjetaId) {
    const persona = listaPersonas.find(p => p.tarjeta_id === tarjetaId);
    if (persona) {
        mostrarNotificacion(`Editar persona: ${persona.nombre} ${persona.apellido}\n\nEsta funcionalidad está en desarrollo.`, 'info', 'En desarrollo');
    }
}

function eliminarPersonaPorId(tarjetaId) {
    const persona = listaPersonas.find(p => p.tarjeta_id === tarjetaId);
    if (persona) {
        mostrarConfirmacion(`¿Estás seguro de eliminar a ${persona.nombre} ${persona.apellido}?`, () => {
            listaPersonas = listaPersonas.filter(p => p.tarjeta_id !== tarjetaId);
            guardarPersonas();
            cargarTablaPersonasPrincipal();
            cargarTablaPersonasSimplificada();
            actualizarEstadisticasRapidas();
            if (usuarioActual && usuarioActual.cargo === 'directivo') {
                cargarEstadisticasDetalladas();
            }
            mostrarNotificacion('Persona eliminada correctamente', 'success');
        });
    }
}

function actualizarEstadisticasRapidas() {
    const total = listaPersonas.length;
    const alumnos = listaPersonas.filter(p => p.rol === 'alumno').length;
    const profesores = listaPersonas.filter(p => p.rol === 'profesor').length;
    const presentes = listaPersonas.filter(p => p.estado === 'Presente').length;
    
    const totalPersonasEl = document.getElementById('totalPersonas');
    const totalAlumnosEl = document.getElementById('totalAlumnos');
    const totalProfesoresEl = document.getElementById('totalProfesores');
    const totalActivosEl = document.getElementById('totalActivos');
    
    if (totalPersonasEl) totalPersonasEl.textContent = total;
    if (totalAlumnosEl) totalAlumnosEl.textContent = alumnos;
    if (totalProfesoresEl) totalProfesoresEl.textContent = profesores;
    if (totalActivosEl) totalActivosEl.textContent = presentes;
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
    
    const personaExistente = listaPersonas.find(p => p.tarjeta_id === codigo);
    if (personaExistente && rfidMessage) {
        setTimeout(() => {
            rfidMessage.querySelector('span').textContent = 'Tarjeta ya registrada';
        }, 1000);
    }
}

async function conectarRFID() {
    try {
        if (!puertoSerial) {
            if (!('serial' in navigator)) {
                mostrarNotificacion('Tu navegador no soporta la API Serial. Usa Chrome o Edge.', 'error', 'Navegador no compatible');
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
            
            mostrarNotificacion('Lector RFID conectado correctamente', 'success');
            escucharPuertoSerial();
        } else {
            desconectarRFID();
        }
    } catch (err) {
        ocultarCarga();
        console.error("Error al conectar con el puerto serial:", err);
        mostrarNotificacion('Error al conectar con el lector RFID: ' + err.message, 'error');
        resetearRFID();
    }
}

async function desconectarRFID() {
    if (lectorSerial) {
        await lectorSerial.cancel();
        lectorSerial = null;
    }
    if (puertoSerial) {
        await puertoSerial.close();
        puertoSerial = null;
    }
    
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
            mostrarNotificacion('Error en la lectura del puerto serial: ' + error.message, 'error');
        }
    }
}

// ==================== FUNCIONES PARA EL FORMULARIO DE NUEVA PERSONA ====================

function configurarCampoDinamico() {
    const rolSelect = document.getElementById('rol');
    const campoDinamico = document.getElementById('campoDinamico');
    const labelDinamico = document.getElementById('labelDinamico');
    const inputContainer = document.getElementById('inputDinamicoContainer');
    
    if (!rolSelect || !campoDinamico || !inputContainer) return;
    
    const rol = rolSelect.value;
    
    if (rol === '') {
        campoDinamico.classList.add('hidden');
        return;
    }
    
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
            inputMateria.placeholder = 'Ej: Matemáticas, Ciencias, etc.';
            inputMateria.required = true;
            inputContainer.appendChild(inputMateria);
            break;
            
        case 'preceptor':
            labelDinamico.innerHTML = '<i class="fas fa-briefcase"></i> Área';
            const inputArea = document.createElement('input');
            inputArea.type = 'text';
            inputArea.id = 'inputDinamico';
            inputArea.name = 'campo_adicional';
            inputArea.placeholder = 'Ej: Limpieza, Secretaría, etc.';
            inputArea.required = true;
            inputContainer.appendChild(inputArea);
            break;
            
        case 'directivo':
            labelDinamico.innerHTML = '<i class="fas fa-user-tie"></i> Cargo';
            const inputCargo = document.createElement('input');
            inputCargo.type = 'text';
            inputCargo.id = 'inputDinamico';
            inputCargo.name = 'campo_adicional';
            inputCargo.placeholder = 'Ej: Director, Subdirector, etc.';
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
    
    if (tarjetaIdManual && tarjetaIdManual.value.trim()) {
        codigoRFID = tarjetaIdManual.value.trim().toUpperCase();
    } else if (tarjetaIdInput && tarjetaIdInput.value) {
        codigoRFID = tarjetaIdInput.value;
    }
    
    const rol = document.getElementById('rol').value;
    if (rol === 'alumno' && !codigoRFID) {
        mostrarNotificacion('Debe escanear o ingresar manualmente el código de la tarjeta RFID para registrar un alumno', 'warning');
        return;
    }
    
    if (codigoRFID) {
        const tarjetaExistente = listaPersonas.find(p => p.tarjeta_id === codigoRFID);
        if (tarjetaExistente) {
            mostrarNotificacion(`Esta tarjeta ya está registrada para: ${tarjetaExistente.nombre} ${tarjetaExistente.apellido}`, 'error');
            return;
        }
    }
    
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const dni = document.getElementById('dni').value;
    const campoAdicional = document.getElementById('inputDinamico') ? document.getElementById('inputDinamico').value : '';
    
    if (!campoAdicional) {
        const camposRequeridos = {
            alumno: 'un curso',
            profesor: 'una materia',
            preceptor: 'un área',
            directivo: 'un cargo'
        };
        mostrarNotificacion(`Debe especificar ${camposRequeridos[rol]}`, 'warning');
        return;
    }
    
    const nuevaPersona = {
        id: Date.now().toString(),
        tarjeta_id: codigoRFID || `MANUAL_${Date.now()}`,
        nombre: nombre,
        apellido: apellido,
        dni: dni || null,
        rol: rol,
        detalle: campoAdicional,
        estado: 'Presente',
        fecha_registro: new Date().toISOString(),
        foto: fotoSeleccionada || null
    };
    
    listaPersonas.push(nuevaPersona);
    guardarPersonas();
    
    cargarTablaPersonasPrincipal();
    cargarTablaPersonasSimplificada();
    actualizarEstadisticasRapidas();
    if (usuarioActual && usuarioActual.cargo === 'directivo') {
        cargarEstadisticasDetalladas();
    }
    
    mostrarNotificacion('Persona registrada exitosamente', 'success');
    cerrarModal('nuevoAlumnoModal');
}

// ==================== FUNCIONES DE ADMINISTRACIÓN ====================

function exportarAExcel() {
    if (!verificarPermiso('exportar_datos')) return;
    
    const datos = listaPersonas.map(persona => ({
        'ID Tarjeta': persona.tarjeta_id || 'No asignado',
        'Nombre': persona.nombre,
        'Apellido': persona.apellido,
        'DNI': persona.dni || '-',
        'Rol': persona.rol,
        'Detalle': persona.detalle || '',
        'Estado': persona.estado,
        'Fecha Registro': new Date(persona.fecha_registro).toLocaleDateString()
    }));
    
    const csv = convertirACSV(datos);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    enlace.setAttribute('href', url);
    enlace.setAttribute('download', `asistencia_expotec_${new Date().toISOString().split('T')[0]}.csv`);
    enlace.style.visibility = 'hidden';
    
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    
    mostrarNotificacion('Datos exportados exitosamente', 'success');
}

function convertirACSV(datos) {
    if (datos.length === 0) return '';
    
    const cabeceras = Object.keys(datos[0]);
    const filasCSV = [cabeceras.join(',')];
    
    for (const fila of datos) {
        const valores = cabeceras.map(cabecera => {
            const escapado = ('' + fila[cabecera]).replace(/"/g, '""');
            return `"${escapado}"`;
        });
        filasCSV.push(valores.join(','));
    }
    
    return filasCSV.join('\n');
}

function mostrarConfiguracion() {
    if (!verificarPermiso('configurar_sistema')) return;
    
    const temaSelect = document.getElementById('configTema');
    const autoSaveCheck = document.getElementById('configAutoSave');
    
    if (temaSelect) temaSelect.value = configuracionSistema.tema;
    if (autoSaveCheck) autoSaveCheck.checked = configuracionSistema.autoSave;
    
    mostrarModal('configuracionModal');
}

function guardarConfiguracion(e) {
    e.preventDefault();
    
    const tema = document.getElementById('configTema').value;
    const autoSave = document.getElementById('configAutoSave').checked;
    
    configuracionSistema = { tema, autoSave };
    guardarConfiguracionSistema();
    aplicarConfiguracion();
    
    cerrarModal('configuracionModal');
    mostrarNotificacion('Configuración guardada exitosamente', 'success');
}

function mostrarGestionUsuarios() {
    if (!verificarPermiso('gestionar_usuarios')) return;
    
    cargarTablaUsuarios();
    mostrarModal('gestionUsuariosModal');
}

function cargarTablaUsuarios() {
    const tbody = document.getElementById('usuariosTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    listaUsuarios.forEach(usuario => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${usuario.usuario}</td>
            <td><span class="rol-badge ${usuario.cargo}">${usuario.cargo}</span></td>
            <td><span class="status ${usuario.activo ? 'active' : 'inactive'}">${usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <button class="btn-icon eliminar-usuario" data-usuario="${usuario.usuario}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
    
    document.querySelectorAll('.eliminar-usuario').forEach(boton => {
        boton.addEventListener('click', function() {
            const usuario = this.getAttribute('data-usuario');
            eliminarUsuario(usuario);
        });
    });
}

function mostrarNuevoUsuario() {
    mostrarModal('nuevoUsuarioModal');
}

function manejarNuevoUsuario(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;
    const cargo = document.getElementById('cargoUsuario').value;
    
    if (listaUsuarios.find(u => u.usuario === usuario)) {
        mostrarNotificacion('El usuario ya existe', 'error');
        return;
    }
    
    const nuevoUsuario = {
        usuario,
        contrasena,
        cargo,
        activo: true,
        nombre: usuario,
        foto: null,
        fechaCreacion: new Date().toISOString()
    };
    
    listaUsuarios.push(nuevoUsuario);
    localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
    
    cerrarModal('nuevoUsuarioModal');
    cargarTablaUsuarios();
    mostrarNotificacion('Usuario creado exitosamente', 'success');
}

function eliminarUsuario(usuario) {
    mostrarConfirmacion(`¿Estás seguro de eliminar al usuario ${usuario}?`, () => {
        listaUsuarios = listaUsuarios.filter(u => u.usuario !== usuario);
        localStorage.setItem('usuarios', JSON.stringify(listaUsuarios));
        cargarTablaUsuarios();
        mostrarNotificacion('Usuario eliminado correctamente', 'success');
    });
}

// ==================== SISTEMA DE LOGIN Y PERMISOS ====================

function verificarPermiso(permiso) {
    if (!usuarioActual) {
        mostrarLoginAdmin();
        return false;
    }
    
    const permisosPorCargo = {
        'directivo': ['ver_estadisticas', 'exportar_datos', 'configurar_sistema', 'gestionar_usuarios', 'editar_personas', 'eliminar_personas', 'crear_personas'],
        'profesor': ['ver_estadisticas'],
        'preceptor': ['ver_estadisticas']
    };
    
    if (permisosPorCargo[usuarioActual.cargo]?.includes(permiso)) {
        return true;
    }
    
    mostrarNotificacion('No tienes permisos para realizar esta acción', 'warning');
    return false;
}

function mostrarLoginAdmin() {
    mostrarModal('loginAdminModal');
}

function manejarLoginAdmin(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('adminUsuario').value;
    const contrasena = document.getElementById('adminContrasena').value;
    
    const usuarioEncontrado = listaUsuarios.find(u => 
        u.usuario === usuario && u.contrasena === contrasena && u.activo
    );
    
    if (usuarioEncontrado) {
        usuarioActual = {
            usuario: usuarioEncontrado.usuario,
            cargo: usuarioEncontrado.cargo
        };
        localStorage.setItem('usuarioActual', JSON.stringify(usuarioActual));
        cerrarModal('loginAdminModal');
        actualizarVisibilidadPorRol();
        
        if (usuarioActual.cargo === 'directivo') {
            cargarEstadisticasDetalladas();
        }
        
        mostrarNotificacion(`Bienvenido ${usuarioEncontrado.cargo}`, 'success');
    } else {
        mostrarNotificacion('Usuario o contraseña incorrectos', 'error');
    }
}

function cerrarSesion() {
    mostrarConfirmacion('¿Estás seguro de que deseas cerrar sesión?', () => {
        usuarioActual = null;
        localStorage.removeItem('usuarioActual');
        actualizarVisibilidadPorRol();
        document.querySelector('.nav-link[data-section="home"]').click();
        mostrarNotificacion('Sesión cerrada correctamente', 'info');
    });
}

// ==================== INICIALIZACIÓN Y EVENT LISTENERS ====================

function inicializarEventListeners() {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    const cerrarSidebarFunc = function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    };
    
    if (closeSidebar) closeSidebar.addEventListener('click', cerrarSidebarFunc);
    if (overlay) overlay.addEventListener('click', cerrarSidebarFunc);
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(section => section.classList.remove('active'));
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            if (sectionId === 'estadisticas' && usuarioActual && usuarioActual.cargo === 'directivo') {
                cargarEstadisticasDetalladas();
            }
            
            if (window.innerWidth < 992) {
                cerrarSidebarFunc();
            }
        });
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') cerrarSidebarFunc();
    });
    
    // Filtros
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
            filtroActual = this.getAttribute('data-filter');
            cargarTablaPersonasPrincipal();
            actualizarEstadisticasRapidas();
        });
    });
    
    // Búsquedas
    const searchPersonas = document.getElementById('searchPersonas');
    if (searchPersonas) {
        searchPersonas.addEventListener('input', function(e) {
            const termino = e.target.value.toLowerCase();
            const filas = document.querySelectorAll('#personasTableBody_personas tr');
            filas.forEach(fila => {
                const texto = fila.textContent.toLowerCase();
                fila.style.display = texto.includes(termino) ? '' : 'none';
            });
        });
    }
    
    const searchCursos = document.getElementById('searchCursos');
    if (searchCursos) {
        searchCursos.addEventListener('input', function(e) {
            const termino = e.target.value.toLowerCase();
            const filas = document.querySelectorAll('#cursosTableBody tr');
            filas.forEach(fila => {
                const texto = fila.textContent.toLowerCase();
                fila.style.display = texto.includes(termino) ? '' : 'none';
            });
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            cargarTablaPersonasPrincipal();
        });
    }
    
    // Botones nueva persona
    const btnNuevaPersona = document.getElementById('btnNuevaPersona');
    const nuevaPersonaBtn = document.getElementById('nuevaPersonaBtn');
    
    const abrirModalNuevaPersona = () => {
        if (!verificarPermiso('crear_personas')) return;
        resetearRFID();
        fotoSeleccionada = null;
        const previewImg = document.getElementById('previewImage');
        if (previewImg) {
            previewImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bdc3c7'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        }
        document.getElementById('btnEliminarFoto').style.display = 'none';
        mostrarModal('nuevoAlumnoModal');
    };
    
    if (btnNuevaPersona) btnNuevaPersona.addEventListener('click', abrirModalNuevaPersona);
    if (nuevaPersonaBtn) nuevaPersonaBtn.addEventListener('click', abrirModalNuevaPersona);
    
    // Carga de foto
    const fotoInput = document.getElementById('fotoPerfil');
    const btnEliminarFoto = document.getElementById('btnEliminarFoto');
    
    if (fotoInput) {
        fotoInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                manejarSeleccionFoto(e.target.files[0]);
            }
        });
    }
    
    if (btnEliminarFoto) {
        btnEliminarFoto.addEventListener('click', eliminarFotoSeleccionada);
    }
    
    // Rol change
    const rolSelect = document.getElementById('rol');
    if (rolSelect) {
        rolSelect.addEventListener('change', configurarCampoDinamico);
    }
    
    // RFID connect
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', conectarRFID);
    }
    
    // Manual RFID input
    const tarjetaIdManual = document.getElementById('tarjetaIdManual');
    if (tarjetaIdManual) {
        tarjetaIdManual.addEventListener('input', function() {
            const tarjetaIdInput = document.getElementById('tarjetaId');
            if (tarjetaIdInput) {
                tarjetaIdInput.value = this.value.toUpperCase();
            }
        });
    }
    
    // Form nueva persona
    const formNuevoAlumno = document.getElementById('formNuevoAlumno');
    if (formNuevoAlumno) {
        formNuevoAlumno.addEventListener('submit', manejarEnvioNuevaPersona);
    }
    
    // Botón nuevo curso
    const btnNuevoCurso = document.getElementById('btnNuevoCurso');
    if (btnNuevoCurso) {
        btnNuevoCurso.addEventListener('click', () => mostrarModal('nuevoCursoModal'));
    }
    
    // Form nuevo curso
    const formNuevoCurso = document.getElementById('formNuevoCurso');
    if (formNuevoCurso) {
        formNuevoCurso.addEventListener('submit', function(e) {
            e.preventDefault();
            const anio = document.getElementById('anio').value;
            const division = document.getElementById('division').value;
            
            if (anio && division) {
                crearCurso(anio, division);
                cargarTablaCursos();
                cerrarModal('nuevoCursoModal');
                formNuevoCurso.reset();
                mostrarNotificacion('Curso creado exitosamente', 'success');
            }
        });
    }
    
    // Botones administración
    const btnExportar = document.getElementById('btnExportar');
    const btnConfiguracion = document.getElementById('btnConfiguracion');
    const btnGestionUsuarios = document.getElementById('btnGestionUsuarios');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
    const btnLogoutHeader = document.getElementById('btnLogoutHeader');
    
    if (btnExportar) btnExportar.addEventListener('click', exportarAExcel);
    if (btnConfiguracion) btnConfiguracion.addEventListener('click', mostrarConfiguracion);
    if (btnGestionUsuarios) btnGestionUsuarios.addEventListener('click', mostrarGestionUsuarios);
    if (btnCerrarSesion) btnCerrarSesion.addEventListener('click', cerrarSesion);
    if (btnLogoutHeader) btnLogoutHeader.addEventListener('click', cerrarSesion);
    if (btnNuevoUsuario) btnNuevoUsuario.addEventListener('click', mostrarNuevoUsuario);
    
    // Botones estadísticas
    const btnExportarEstadisticas = document.getElementById('btnExportarEstadisticas');
    const btnImprimirEstadisticas = document.getElementById('btnImprimirEstadisticas');
    
    if (btnExportarEstadisticas) {
        btnExportarEstadisticas.addEventListener('click', exportarEstadisticasAExcel);
    }
    if (btnImprimirEstadisticas) {
        btnImprimirEstadisticas.addEventListener('click', imprimirEstadisticas);
    }
    
    // Formularios
    const formConfiguracion = document.getElementById('formConfiguracion');
    if (formConfiguracion) {
        formConfiguracion.addEventListener('submit', guardarConfiguracion);
    }
    
    const formNuevoUsuario = document.getElementById('formNuevoUsuario');
    if (formNuevoUsuario) {
        formNuevoUsuario.addEventListener('submit', manejarNuevoUsuario);
    }
    
    const formLoginAdmin = document.getElementById('formLoginAdmin');
    if (formLoginAdmin) {
        formLoginAdmin.addEventListener('submit', manejarLoginAdmin);
    }
    
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 992) {
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
}

// ==================== PUNTO DE ENTRADA PRINCIPAL ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistema iniciado - Versión completa con fotos y fichas de alumnos');
    
    cargarDatosIniciales();
    inicializarModales();
    aplicarConfiguracion();
    inicializarEventListeners();
    
    cargarTablaPersonasSimplificada();
    cargarTablaCursos();
    cargarTablaPersonasPrincipal();
    actualizarEstadisticasRapidas();
});