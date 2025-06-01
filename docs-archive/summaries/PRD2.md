# Documento de Requisitos del Producto (PRD): Plataforma de Turismo Médico AI-First (MVP)

**Versión:** 1.2
**Fecha:** 2025-05-14
**Autor:** Asistente AI (basado en la solicitud del usuario)

## 1. Introducción y Visión del Producto

Este documento describe los requisitos para la Versión Mínima Viable (MVP) de una plataforma de turismo médico "AI-first". La plataforma tiene como objetivo revolucionar la forma en que los pacientes acceden y agendan servicios médicos, y cómo las organizaciones médicas gestionan sus operaciones. Utilizando interfaces de lenguaje natural ( chatbot) y un potente backend, la plataforma facilitará la consulta de servicios y el agendamiento de citas de manera intuitiva y eficiente. El MVP se centrará en validar el flujo principal de agendamiento de citas a través de lenguaje natural y en establecer una presencia online inicial mediante una landing page, sentando las bases para futuras expansiones.

## 2. Objetivos del MVP

* **O1:** Permitir a los pacientes consultar servicios médicos y agendar citas utilizando lenguaje natural a través de un chatbot web.
* **O2:** Implementar una arquitectura multitenant donde cada organización médica (tenant) pueda gestionar su propia información (servicios, doctores, sedes, disponibilidad).
* **O3:** Proveer roles de usuario diferenciados (Superadmin, Admin de Tenant, Staff, Doctor, Paciente) con dashboards y funcionalidades específicas.
* **O4:** Validar la viabilidad de la integración de IA (Vercel AI SDK) para la interpretación de lenguaje natural y la optimización del proceso de agendamiento.
* **O5:** Construir una interfaz de usuario amigable, intuitiva y completamente responsive para todos los roles.
* **O6:** Establecer la infraestructura base utilizando el stack tecnológico definido (Next.js, Supabase, Tailwind CSS).
* **O7:** Desarrollar una landing page moderna y atractiva que presente la plataforma, sus beneficios y un llamado a la acción para organizaciones y pacientes.

## 3. Usuarios y Roles (Personas)

* **3.1. Superadmin:**
    * **Necesidades:** Gestionar globalmente las organizaciones (tenants) en la plataforma, configurar herramientas de IA generales, administrar funcionalidades globales y roles.
    * **Acciones MVP:** Crear/editar/eliminar tenants. Ver estadísticas generales de uso. Agendar citas en cualquier tenant.
* **3.2. Administrador de Tenant (Admin):**
    * **Necesidades:** Gestionar la información específica de su organización médica.
    * **Acciones MVP:** Configurar servicios médicos, registrar sedes, gestionar canales de comunicación (configuración inicial para Chatbot), invitar/gestionar usuarios Staff y Doctores dentro de su tenant. Agendar citas para pacientes de su tenant. Ver dashboard con métricas del tenant.
* **3.3. Personal de Staff (Staff):**
    * **Necesidades:** Apoyar en la gestión operativa, especialmente la disponibilidad de doctores y la gestión de pacientes.
    * **Acciones MVP:** Gestionar la disponibilidad de agenda de los doctores asignados. Registrar nuevos pacientes. Agendar citas para pacientes de su tenant. Ver dashboard con citas y tareas.
* **3.4. Doctor:**
    * **Necesidades:** Gestionar su propia disponibilidad y tener visibilidad de sus citas.
    * **Acciones MVP:** Establecer/modificar su disponibilidad horaria. Ver su agenda de citas. Ver dashboard con próximas citas.
* **3.5. Paciente:**
    * **Necesidades:** Encontrar servicios médicos, obtener información y agendar citas de forma fácil y rápida.
    * **Acciones MVP:** Consultar servicios disponibles. Agendar nuevas citas usando lenguaje natural (Chatbot) o interfaz tradicional. Reagendar citas. Cancelar citas. Ver sus próximas citas y su historial.
* **3.6. Visitante de la Landing Page (Prospecto):**
    * **Necesidades (Organización):** Entender qué ofrece la plataforma, cómo puede beneficiar a su clínica/hospital, y cómo registrarse o solicitar más información.
    * **Necesidades (Paciente):** Entender cómo la plataforma puede ayudarle a encontrar y agendar servicios médicos, y cómo acceder a ella.

## 4. Flujo Principal del MVP: Agendamiento de Citas con Lenguaje Natural

1.  **Interacción Inicial (Paciente):** El paciente interactúa con el chatbot  usualmente después de acceder a través de la landing page o un enlace directo.
    * Ej: "Quiero agendar una consulta de cardiología para la próxima semana".
    * Ej: "¿Tienen dermatólogos disponibles el lunes por la tarde en la sede del centro?"
2.  **Procesamiento AI:**
    * La entrada de lenguaje natural es procesada por el sistema de IA (utilizando Vercel AI SDK).
    * Se identifican: **intención** (agendar, consultar), **entidades** (servicio: "cardiología", "dermatólogo"; fecha/hora: "próxima semana", "lunes por la tarde"; sede: "sede del centro", etc.).
3.  **Consulta de Disponibilidad:**
    * El sistema consulta la base de datos (Supabase) filtrando por el tenant correspondiente al canal de comunicación o al tenant del paciente autenticado.
    * Se busca la disponibilidad de:
        * Servicio solicitado.
        * Doctor(es) que ofrecen el servicio (si el paciente lo especifica o si es relevante).
        * Sede(s) donde se ofrece el servicio (si el paciente lo especifica o si es relevante).
        * Fechas y horarios disponibles que coincidan con los criterios.
4.  **Presentación de Opciones (Paciente):**
    * El chatbot presenta las opciones disponibles al paciente.
    * Ej: "Tenemos cita con el Dr. Ejemplo para cardiología el martes a las 10:00 AM o el miércoles a las 3:00 PM en la sede principal. ¿Cuál prefieres?"
    * Si hay múltiples opciones o falta información, el chatbot puede solicitar aclaraciones.
5.  **Confirmación (Paciente):** El paciente selecciona una opción.
6.  **Creación de Cita:**
    * Se registra la cita en la base de datos, asociada al paciente, doctor, servicio, sede y tenant.
    * Se envía una confirmación al paciente (y notificación al doctor/staff según configuración).
7.  **Flujo Alternativo (Agendamiento Manual sin NL o para otros roles):**
    * **Para Pacientes (a través de su dashboard):** Podrán usar formularios tradicionales para completar el flujo: Servicio -> Doctor (opcional) -> Sede (opcional) -> Fecha y Horario -> Cita.
    * **Para Staff y Admin de Tenant (a través de sus dashboards):** También podrán usar formularios tradicionales para completar el flujo: Servicio -> Doctor (opcional) -> Sede (opcional) -> **Paciente (seleccionar existente o registrar nuevo dentro de su tenant)** -> Fecha y Horario -> Cita.
    * **Para Superadmin (a través de su dashboard):** Podrá agendar citas en cualquier tenant mediante un formulario tradicional: **Tenant (seleccionar organización)** -> Servicio -> Doctor (opcional) -> Sede (opcional) -> **Paciente (seleccionar existente o registrar nuevo dentro del tenant seleccionado)** -> Fecha y Horario -> Cita.

## 5. Características Detalladas del MVP

* **5.1. Módulo de IA y Lenguaje Natural:**
    * Integración con Vercel AI SDK.
    * Capacidad para interpretar intenciones básicas de agendamiento y consulta de servicios.
    * Extracción de entidades clave: servicio, especialidad, doctor (nombre/especialidad), sede (nombre/ubicación general), fecha y hora.
    * Gestión de contexto básico en la conversación del chatbot para agendamientos.
* **5.2. Gestión Multitenant:**
    * **Superadmin:**
        * Dashboard con lista de tenants.
        * CRUD para tenants (nombre de organización, datos de contacto del admin del tenant).
        * (Futuro: gestión de suscripciones, configuración de herramientas AI globales).
    * **Tenant (Organización):**
        * Aislamiento de datos por tenant (servicios, doctores, pacientes, citas, sedes).
        * Identificación del tenant basada en el subdominio, URL de API o canal de comunicación.
* **5.3. Gestión de Roles y Permisos (Supabase Auth + RLS):**
    * **Autenticación:** Registro y login para todos los roles.
    * **Autorización:**
        * **Superadmin:** Acceso total.
        * **Admin Tenant:** Gestión completa de su tenant (servicios, sedes, staff, doctores, configuración de canales).
        * **Staff:** Gestión de agenda de doctores asignados, gestión de pacientes de su tenant, agendamiento de citas.
        * **Doctor:** Gestión de su disponibilidad, visualización de sus citas.
        * **Paciente:** Creación/reagendamiento/cancelación de sus propias citas, visualización de su historial.
* **5.4. Módulo de Gestión para Administrador de Tenant:**
    * Dashboard: Resumen de citas, doctores activos, pacientes registrados.
    * Gestión de Servicios: CRUD para servicios (nombre, descripción, duración estimada, precio opcional).
    * Gestión de Sedes: CRUD para sedes (nombre, dirección).
    * Gestión de Doctores: Invitar/asignar rol Doctor, asociar a servicios y sedes.
    * Gestión de Staff: Invitar/asignar rol Staff.
    * Configuración de Canales: Configuración básica para vincular chatbot con el tenant.
* **5.5. Módulo de Gestión para Staff:**
    * Dashboard: Citas del día/semana, tareas pendientes.
    * Gestión de Disponibilidad de Doctores: Visualizar y modificar horarios/bloqueos de los doctores del tenant.
    * Gestión de Pacientes: CRUD para pacientes del tenant (datos básicos, historial de citas).
    * Agendamiento de Citas (manual): Formulario según flujo definido en la sección 4.7.
* **5.6. Módulo para Doctor:**
    * Dashboard: Próximas citas, resumen de disponibilidad.
    * Gestión de Disponibilidad: Interfaz para definir sus horarios de trabajo, vacaciones, bloqueos.
    * Visualización de Agenda: Calendario con sus citas programadas.
* **5.7. Módulo para Paciente:**
    * Dashboard: Próximas citas, acceso rápido a reagendar/cancelar.
    * Agendamiento de Citas (vía NL o UI):
        * NL: A través de chatbot web .
        * UI: Selector de servicio -> doctor (opcional) -> sede (opcional) -> calendario/selector de horario.
    * Mis Citas: Listado de citas futuras y pasadas, con opción de reagendar/cancelar futuras.
* **5.8. Dashboards:**
    * Cada rol tendrá un dashboard personalizado con información y accesos directos relevantes a sus funciones.
* **5.9. Canales de Comunicación (MVP):**
    * **Chatbot Web:** Integrado en la plataforma.
    * **5.10. Notificaciones (Básico):**
    * Confirmación de cita para paciente (email).
    * Notificación de nueva cita para doctor/staff (email/dashboard).
* **5.11. Landing Page Pública:**
    * Diseño moderno, atractivo y profesional, utilizando Tailwind CSS.
    * Presentación clara de la propuesta de valor de la plataforma para el turismo médico.
        * Sección "Hero" con titular impactante y breve descripción.
    * Descripción concisa de "Cómo Funciona", destacando la IA y facilidad para el usuario.
    * Sección de "Beneficios" para organizaciones médicas (tenants) y para pacientes.
    * Llamados a la acción (CTA) claros y visibles:
        * Para organizaciones: "Solicitar Demo", "Únete como Proveedor" (podría enlazar a un formulario de contacto/interés o a la ruta de registro de tenant si está habilitada).
        * Para pacientes: "Buscar Servicios Ahora", "Acceder al Portal" (enlaza a la página de login/registro o directamente al área de búsqueda/chatbot si es público).
    * (Opcional MVP) Sección breve "Sobre Nosotros" o "Nuestra Misión".
    * (Opcional MVP) Testimonios simples (pueden ser placeholders).
    * Footer con enlaces básicos (ej. Términos, Privacidad, Contacto).
    * Totalmente responsive.

## 6. Especificaciones Técnicas

* **Frontend:**
    * Framework: Next.js
    * Lenguaje: TypeScript
    * Estilos: Tailwind CSS
    * Estado: React Context API
    * Renderizado: Server-Side Rendering (SSR) y Client-Side Rendering (CSR) según sea apropiado. Landing page idealmente SSR o SSG para SEO y performance.
* **Backend:**
    * Base de Datos: PostgreSQL (a través de Supabase)
    * Autenticación: Supabase Auth (con RLS para seguridad a nivel de fila)
    * Almacenamiento: Supabase Storage (para avatares, documentos futuros, imágenes de landing)
    * API: RESTful API (implementada con Next.js API Routes)
    * Serverless Functions: Funciones SQL de Supabase, Vercel AI SDK para la lógica de IA.
* **AI:**
    * Vercel AI SDK para la integración y orquestación de LLMs.
    * (Se elegirá un modelo de LLM compatible con el SDK y adecuado para español, ej: OpenAI GPT-3.5/4, Gemini, etc.).
* **Infraestructura:**
    * Hosting: Vercel
    * Base de Datos y Backend Services: Supabase

## 7. Diseño y UX

* **Diseño:** Limpio, moderno, profesional y confiable, acorde al sector salud. Consistente entre la landing page y la plataforma.
* **UX:**
    * Intuitivo y fácil de usar para todos los roles y visitantes, minimizando la curva de aprendizaje.
    * Flujos de trabajo eficientes, especialmente para el agendamiento.
    * Full Responsive: Adaptable a escritorio, tablets y móviles.
    * Accesibilidad (a11y): Considerar las pautas básicas de WCAG.

## 8. Métricas de Éxito del MVP

* Número de tenants registrados (objetivo: 3-5 organizaciones para la prueba inicial).
* Número de citas agendadas exitosamente a través de lenguaje natural.
* Tiempo promedio para agendar una cita usando NL.
* Tasa de finalización de tareas clave (agendar cita, gestionar disponibilidad) por rol.
* Feedback cualitativo de los usuarios (encuestas de satisfacción breves).
* Tasa de conversión de la landing page (ej. solicitudes de demo, registros de interés).
* Tráfico a la landing page y fuentes.

## 9. Consideraciones Futuras (Post-MVP)

* Integración con teleconferencia.
* Agente de voz.
* Pagos online de consultas/servicios.
* Historiales médicos electrónicos (HME) simplificados.
* Sistema de recordatorios y notificaciones avanzado (SMS, WhatsApp,telegram).
* Módulo de analítica avanzada para tenants y Superadmin.
* Integración con calendarios externos (Google Calendar, Outlook Calendar).
* Programas de fidelización y gestión de membresías.
* Blog o sección de contenidos en la landing page para SEO.
* Onboarding detallado para tenants desde la landing page.

## 10. Global Rules (Mejores Prácticas de Desarrollo Moderno)

* **10.1. Gestión de Código Fuente:**
    * Git como sistema de control de versiones (ej. GitHub, GitLab).
    * Flujo de trabajo Git Flow o GitHub Flow simplificado (main/develop, feature branches).
    * Pull Requests (PRs) para revisión de código antes de fusionar a ramas principales.
    * Mensajes de commit claros y descriptivos.
* **10.2. Calidad de Código:**
    * **TypeScript Estricto:** Habilitar `strict: true` en `tsconfig.json`.
    * **Linting y Formateo:** ESLint y Prettier configurados para consistencia de código. Ejecución automática pre-commit (Husky + lint-staged).
    * **Código DRY (Don't Repeat Yourself):** Promover la reutilización a través de componentes, funciones y hooks.
    * **Principio de Responsabilidad Única (SRP):** Componentes y funciones deben tener una única responsabilidad bien definida.
    * **Nomenclatura Clara y Consistente:** Para variables, funciones, componentes, archivos, etc. (ej. `camelCase` para variables/funciones, `PascalCase` para componentes/tipos).
* **10.3. Componentes (Next.js/React):**
    * **Diseño Atómico (o similar):** Organizar componentes en átomos, moléculas, organismos para mejorar la modularidad y reutilización. Aplicable tanto a la app como a la landing page.
    * **Props Explícitas y Tipadas:** Definir interfaces/tipos para las props de cada componente.
    * **Estado Colocado Estratégicamente:** Usar estado local (`useState`) donde sea suficiente, elevar estado o usar Context API cuando sea necesario para estados compartidos.
    * **Manejo de Efectos Secundarios (`useEffect`):** Limpiar efectos para evitar fugas de memoria. Dependencias claras.
* **10.4. Estado (React Context API):**
    * Usar Context para estado global o compartido entre múltiples componentes no directamente relacionados.
    * Dividir contextos por dominio para evitar contextos monolíticos y re-renders innecesarios.
    * Considerar `useReducer` junto con Context para lógica de estado más compleja.
* **10.5. API (Next.js API Routes):**
    * **Principios RESTful:** Uso adecuado de métodos HTTP (GET, POST, PUT, DELETE), códigos de estado y estructura de URLs.
    * **Validación de Entrada:** Validar todos los datos provenientes del cliente (ej. Zod, Yup).
    * **Manejo de Errores Consistente:** Formato de respuesta de error estandarizado.
    * **Seguridad:** Asegurar endpoints, especialmente los que realizan mutaciones de datos, usando Supabase Auth.
* **10.6. Base de Datos (Supabase/PostgreSQL):**
    * **Esquema Bien Definido:** Diseñar tablas, relaciones y tipos de datos cuidadosamente.
    * **Migraciones:** Usar el sistema de migraciones de Supabase para cambios de esquema controlados.
    * **Seguridad a Nivel de Fila (RLS):** Implementar RLS de Supabase de forma exhaustiva para asegurar el acceso a datos multitenant y por rol.
    * **Optimización de Consultas:** Usar índices donde sea necesario. Evitar N+1 queries.
* **10.7. Serverless Functions (Supabase SQL Functions / Vercel AI SDK):**
    * **Idempotencia:** Siempre que sea posible, diseñar funciones para que múltiples ejecuciones idénticas tengan el mismo efecto que una sola.
    * **Manejo de Errores y Logging:** Implementar logging adecuado para depuración.
* **10.8. Testing (Mínimo para MVP, pero planificado):**
    * **Pruebas Unitarias:** Para funciones críticas de lógica de negocio y componentes UI aislados (Jest, React Testing Library).
    * **Pruebas de Integración:** Para flujos clave (ej. agendamiento).
* **10.9. Seguridad:**
    * **Variables de Entorno:** NO hardcodear claves API, secretos, etc. Usar variables de entorno (`.env.local`, configuración de Vercel/Supabase).
    * **Protección CSRF/XSS:** Next.js y Supabase ofrecen protecciones, pero ser consciente de las mejores prácticas.
    * **Actualizaciones de Dependencias:** Mantener las dependencias actualizadas para mitigar vulnerabilidades.
* **10.10. UI/UX y Rendimiento:**
    * **Mobile-First (para Tailwind CSS):** Diseñar pensando primero en móvil y luego escalar a pantallas más grandes.
    * **Optimización de Imágenes:** Usar `<Image>` de Next.js.
    * **Code Splitting:** Next.js lo hace por defecto a nivel de página, considerar `next/dynamic` para componentes grandes.
    * **Carga Perezosa (Lazy Loading):** Para imágenes y componentes no críticos en el viewport inicial.
    * **SEO Básico para Landing Page:** Uso de etiquetas semánticas HTML5, meta tags (title, description), sitemap.xml (futuro).
* **10.11. Documentación:**
    * Comentarios en código para lógica compleja.
    * Un `README.md` claro para el proyecto.
    * (Idealmente) Documentación de API si es consumida por terceros.

