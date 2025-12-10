// auth.js - Manejo de autenticación con backend de Plaza
// Versión 2.0 - Usa backend de Plaza

// Función para obtener la URL base de la API
// Evitar conflictos con declaraciones anteriores
if (typeof getApiBaseUrl === 'undefined') {
    function getApiBaseUrl() {
        return window.location.origin + '/api/api';
    }
}

class Auth {
    constructor() {
        this.token = null;
        this.usuario = null;
        this.tienda = null;
        this.isAuthenticated = false;
    }

    // Inicializar desde localStorage
    init() {
        try {
            const saved = localStorage.getItem('plaza_auth');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.token && data.usuario && data.tienda) {
                    this.token = data.token;
                    this.usuario = data.usuario;
                    this.tienda = data.tienda;
                    this.isAuthenticated = true;
                    console.log('Sesión cargada desde localStorage');
                } else {
                    console.warn('Sesión incompleta en localStorage, limpiando...');
                    localStorage.removeItem('plaza_auth');
                    this.isAuthenticated = false;
                }
            } else {
                console.log('No hay sesión guardada en localStorage');
                this.isAuthenticated = false;
            }
        } catch (error) {
            console.error('Error cargando sesión desde localStorage:', error);
            localStorage.removeItem('plaza_auth');
            this.isAuthenticated = false;
        }
    }

    // Guardar sesión en localStorage
    saveSession(token, usuario, tienda) {
        this.token = token;
        this.usuario = usuario;
        this.tienda = tienda;
        this.isAuthenticated = true;
        localStorage.setItem('plaza_auth', JSON.stringify({
            token: this.token,
            usuario: this.usuario,
            tienda: this.tienda
        }));
    }

    // Autenticar con backend de Plaza
    async authenticate(email, password) {
        try {
            const response = await fetch(`${getApiBaseUrl()}/auth.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                // Incluir mensaje de debug si está disponible
                const errorMessage = data.error || 'Error de autenticación';
                const debugMessage = data.debug ? ` (${data.debug})` : '';
                throw new Error(errorMessage + debugMessage);
            }

            // Guardar sesión
            this.saveSession(data.token, data.usuario, data.tienda);
            
            return {
                token: data.token,
                usuario: data.usuario,
                tienda: data.tienda
            };
        } catch (error) {
            console.error('Error de autenticación:', error);
            
            // Si es un error de red
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('No se pudo conectar al servidor. Verifica tu conexión.');
            }
            
            throw error;
        }
    }

    // Obtener token de sesión
    getToken() {
        if (!this.token) {
            const saved = localStorage.getItem('plaza_auth');
            if (saved) {
                const data = JSON.parse(saved);
                this.token = data.token;
            }
        }
        return this.token;
    }

    // Obtener datos del usuario
    getUsuario() {
        if (!this.usuario) {
            const saved = localStorage.getItem('plaza_auth');
            if (saved) {
                const data = JSON.parse(saved);
                this.usuario = data.usuario;
            }
        }
        return this.usuario;
    }

    // Obtener datos de la tienda
    getTienda() {
        if (!this.tienda) {
            const saved = localStorage.getItem('plaza_auth');
            if (saved) {
                const data = JSON.parse(saved);
                this.tienda = data.tienda;
            }
        }
        return this.tienda;
    }

    // Cerrar sesión
    logout() {
        this.token = null;
        this.usuario = null;
        this.tienda = null;
        this.isAuthenticated = false;
        localStorage.removeItem('plaza_auth');
    }

    // Verificar si está autenticado
    checkAuth() {
        return this.isAuthenticated && this.token && this.usuario && this.tienda;
    }
}

// Instancia global
const auth = new Auth();

