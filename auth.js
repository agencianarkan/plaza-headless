// auth.js - Manejo de autenticación con WordPress

class Auth {
    constructor() {
        this.baseUrl = null;
        this.token = null;
        this.isAuthenticated = false;
        this.userRole = null;
        this.isAdmin = false;
        this.userId = null;
    }

    // Inicializar desde localStorage
    init() {
        try {
            const saved = localStorage.getItem('plaza_auth');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.baseUrl && data.token) {
                    this.baseUrl = data.baseUrl;
                    this.token = data.token;
                    this.isAuthenticated = true;
                    this.userRole = data.userRole || null;
                    this.isAdmin = data.isAdmin || false;
                    this.userId = data.userId || null;
                } else {
                    localStorage.removeItem('plaza_auth');
                    this.isAuthenticated = false;
                }
            }
        } catch (error) {
            console.error('Error cargando credenciales:', error);
            localStorage.removeItem('plaza_auth');
            this.isAuthenticated = false;
        }
    }

    // Guardar credenciales
    saveCredentials(baseUrl, token, userId = null, userRole = null, isAdmin = false) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.token = token;
        this.userId = userId;
        this.userRole = userRole;
        this.isAdmin = isAdmin;
        localStorage.setItem('plaza_auth', JSON.stringify({
            baseUrl: this.baseUrl,
            token: this.token,
            userId: this.userId,
            userRole: this.userRole,
            isAdmin: this.isAdmin
        }));
    }

    // Login con token personalizado (MÉTODO PRINCIPAL)
    async loginWithToken(baseUrl, token) {
        try {
            const cleanUrl = baseUrl.replace(/\/$/, '');
            
            const response = await fetch(`${cleanUrl}/wp-json/plaza/v1/login-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: token
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.token) {
                throw new Error(data.message || 'Error en la autenticación');
            }

            // Guardar credenciales
            this.saveCredentials(
                data.baseUrl || cleanUrl,
                data.token,
                data.userId || null,
                null,
                false
            );

            this.isAuthenticated = true;

            // Obtener información del usuario
            try {
                const wpUrl = `${cleanUrl}/wp-json/wp/v2/users/me?context=edit`;
                const wpResponse = await fetch(wpUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${data.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (wpResponse.ok) {
                    const userData = await wpResponse.json();
                    const roles = userData.roles || [];
                    const userRole = roles.length > 0 ? roles[0] : null;
                    const isAdmin = roles.includes('administrator');
                    
                    this.saveCredentials(
                        data.baseUrl || cleanUrl,
                        data.token,
                        data.userId,
                        userRole,
                        isAdmin
                    );
                }
            } catch (e) {
                console.warn('No se pudo obtener información del usuario:', e);
            }
            
            return true;
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    // Login con usuario/contraseña (alternativa)
    async directLogin(baseUrl, username, password) {
        try {
            const cleanUrl = baseUrl.replace(/\/$/, '');
            
            const response = await fetch(`${cleanUrl}/wp-json/plaza/v1/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.token) {
                throw new Error(data.message || 'Error en la autenticación');
            }

            this.saveCredentials(
                data.baseUrl || cleanUrl,
                data.token,
                data.userId || null,
                null,
                false
            );

            this.isAuthenticated = true;
            return true;
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    // Obtener headers de autenticación
    getAuthHeaders() {
        if (!this.baseUrl || !this.token) {
            throw new Error('No hay token guardado. Por favor, inicia sesión nuevamente.');
        }

        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Obtener URL base
    getBaseUrl() {
        if (!this.baseUrl) {
            throw new Error('No hay URL base configurada');
        }
        return this.baseUrl;
    }

    // Cerrar sesión
    logout() {
        this.baseUrl = null;
        this.token = null;
        this.isAuthenticated = false;
        this.userRole = null;
        this.isAdmin = false;
        this.userId = null;
        localStorage.removeItem('plaza_auth');
    }

    // Verificar si está autenticado
    checkAuth() {
        return this.isAuthenticated && this.baseUrl && this.token;
    }
}

// Instancia global
const auth = new Auth();
