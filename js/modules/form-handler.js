// Función para inicializar el formulario de nueva persona
function inicializarFormularioPersona() {
    const rolSelect = document.getElementById('rolPersona');
    const formNuevaPersona = document.getElementById('formNuevaPersona');
    const rfidSection = document.querySelector('.rfid-section');
    const campoDinamico = document.getElementById('campoDinamico');
    // Aceptar ambos IDs posibles para ser tolerante con diferentes modales (connectRFID o connectBtn)
    const connectRFID = document.getElementById('connectRFID') || document.getElementById('connectBtn');
    const rfidMessage = document.getElementById('rfidMessage');

    console.log('Inicializando formulario de nueva persona');
    console.log('Elementos encontrados:', {
        rolSelect: !!rolSelect,
        formNuevaPersona: !!formNuevaPersona,
        rfidSection: !!rfidSection,
        campoDinamico: !!campoDinamico,
        connectRFID: !!connectRFID,
        rfidMessage: !!rfidMessage
    });

    // Event listener para cambio de rol
    rolSelect?.addEventListener('change', function() {
        const rol = this.value;
        console.log('Rol seleccionado:', rol);
        
        // Mostrar/ocultar sección RFID
        if (rfidSection) {
            rfidSection.style.display = rol === 'alumno' ? 'block' : 'none';
        }
        
        // Gestionar campo dinámico
        if (!campoDinamico) return;
        
        if (rol === '') {
            campoDinamico.classList.add('hidden');
            return;
        }
        
        campoDinamico.classList.remove('hidden');
        campoDinamico.innerHTML = ''; // Limpiar contenido anterior
        
        const label = document.createElement('label');
        label.id = 'labelDinamico';
        
        switch(rol) {
            case 'alumno':
                label.innerHTML = '<i class="fas fa-graduation-cap"></i> Curso';
                const dropdownDiv = document.createElement('div');
                dropdownDiv.className = 'custom-dropdown';
                
                const select = document.createElement('select');
                select.id = 'cursoDinamico';
                select.name = 'campo_adicional';
                select.required = true;
                
                select.innerHTML = '<option value="">Seleccionar curso</option>';
                cursos.forEach(curso => {
                    const option = document.createElement('option');
                    // Usar el id del curso como value para mantener una referencia consistente
                    option.value = curso.id;
                    option.textContent = `${curso.anio}° ${curso.division}`;
                    select.appendChild(option);
                });
                
                dropdownDiv.appendChild(select);
                dropdownDiv.appendChild(document.createElement('i')).className = 'fas fa-chevron-down dropdown-arrow';
                
                campoDinamico.appendChild(label);
                campoDinamico.appendChild(dropdownDiv);
                break;
                
            case 'profesor':
                label.innerHTML = '<i class="fas fa-book"></i> Materia';
                const materiaInput = document.createElement('input');
                materiaInput.type = 'text';
                materiaInput.id = 'materiaDinamico';
                materiaInput.name = 'campo_adicional';
                materiaInput.required = true;
                materiaInput.placeholder = 'Ej: Matemáticas';
                
                campoDinamico.appendChild(label);
                campoDinamico.appendChild(materiaInput);
                break;
                
            case 'preceptor':
                label.innerHTML = '<i class="fas fa-briefcase"></i> Área';
                const areaInput = document.createElement('input');
                areaInput.type = 'text';
                areaInput.id = 'areaDinamico';
                areaInput.name = 'campo_adicional';
                areaInput.required = true;
                areaInput.placeholder = 'Ej: Turno Mañana';
                
                campoDinamico.appendChild(label);
                campoDinamico.appendChild(areaInput);
                break;
                
            case 'directivo':
                label.innerHTML = '<i class="fas fa-user-tie"></i> Cargo';
                const cargoInput = document.createElement('input');
                cargoInput.type = 'text';
                cargoInput.id = 'cargoDinamico';
                cargoInput.name = 'campo_adicional';
                cargoInput.required = true;
                cargoInput.placeholder = 'Ej: Director';
                
                campoDinamico.appendChild(label);
                campoDinamico.appendChild(cargoInput);
                break;
        }
    });

    // Event listener para el formulario
    formNuevaPersona?.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Formulario enviado');
        
        const formData = new FormData(this);
        const personaData = {
            id: Date.now().toString(),
            nombre: formData.get('nombre'),
            apellido: formData.get('apellido'),
            dni: formData.get('dni'),
            rol: formData.get('rol'),
            campo_adicional: formData.get('campo_adicional'),
            fechaCreacion: new Date().toISOString()
        };
        
        console.log('Datos del formulario:', personaData);
        
        // Validar campos adicionales según el rol
            if (personaData.rol === 'alumno') {
            if (!rfidMessage || !rfidMessage.textContent.includes('Tarjeta:')) {
                alert('Debe escanear una tarjeta RFID para registrar un alumno');
                return;
            }
            
            if (!personaData.campo_adicional) {
                alert('Debe seleccionar un curso para el alumno');
                return;
            }
                // Guardar el id del curso seleccionado de forma consistente
                personaData.cursoId = formData.get('campo_adicional');
                personaData.rfid = rfidMessage.textContent.split('Tarjeta: ')[1];
        } else if (!personaData.campo_adicional) {
            const campos = {
                profesor: 'una materia',
                preceptor: 'un área',
                directivo: 'un cargo'
            };
            alert(`Debe especificar ${campos[personaData.rol]}`);
            return;
        }
        
        try {
            personas.push(personaData);
            localStorage.setItem('personas', JSON.stringify(personas));
            
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
                this.reset();
                if (rfidMessage) {
                    rfidMessage.innerHTML = '<i class="fas fa-rss"></i><span>Escanear Tarjeta...</span>';
                    rfidMessage.classList.remove('scanning', 'scanned');
                }
                if (rfidSection) {
                    rfidSection.style.display = 'none';
                }
                if (campoDinamico) {
                    campoDinamico.classList.add('hidden');
                }
            }
            
            alert('Persona registrada exitosamente');
            cargarTablaPersonas(); // Actualizar la tabla
            
        } catch (error) {
            console.error('Error al guardar persona:', error);
            alert('Error al registrar la persona');
        }
    });
}