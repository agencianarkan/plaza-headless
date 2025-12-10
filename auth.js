// auth.js - Manejo de autenticación con WordPress

class Auth {
    constructor() {
        this.baseUrl = null;
        this.token = null; // Token JWT
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
                    console.log('Token cargado desde localStorage');
                } else {
                    console.warn('Credenciales incompletas en localStorage, limpiando...');
                    localStorage.removeItem('plaza_auth');
                    this.isAuthenticated = false;
                }
            } else {
                console.log('No hay credenciales guardadas en localStorage');
                this.isAuthenticated = false;
            }
        } catch (error) {
            console.error('Error cargando credenciales desde localStorage:', error);
            localStorage.removeItem('plaza_auth');
            this.isAuthenticated = false;
        }
    }

    // Guardar credenciales (token JWT) en localStorage
    saveCredentials(baseUrl, token, userId = null, userRole = null, isAdmin = false) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remover trailing slash
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

    // Login con token (MÁS SIMPLE - sin contraseña)
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
                const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (!data.success || !data.token) {
                throw new Error(data.message || 'Error en la autenticación');
            }

            // Guardar credenciales (token)
            this.saveCredentials(
                data.baseUrl || cleanUrl,
                data.token,
                data.userId || null,
                null,
                false
            );

            this.isAuthenticated = true;

            // Verificar rol de usuario usando el token
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
                    let roles = userData.roles;
                    
                    if (!roles && userData.id) {
                        try {
                            const userByIdUrl = `${cleanUrl}/wp-json/wp/v2/users/${userData.id}?context=edit`;
                            const userByIdResponse = await fetch(userByIdUrl, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${data.token}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            if (userByIdResponse.ok) {
                                const userByIdData = await userByIdResponse.json();
                                roles = userByIdData.roles;
                            }
                        } catch (e) {
                            console.warn('No se pudieron obtener roles detallados');
                        }
                    }
                    
                    const userRole = roles && roles.length > 0 ? roles[0] : null;
                    const isAdmin = roles && roles.includes('administrator');
                    
                    // Actualizar credenciales con rol
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
            console.error('Error en login con token:', error);
            throw error;
        }
    }

    // Login directo con usuario/contraseña (alternativa)
    async directLogin(baseUrl, username, password) {
        try {
            const cleanUrl = baseUrl.replace(/\/$/, '');
            
            // Usar nuestro endpoint personalizado que genera tokens
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
                const errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (!data.success || !data.token) {
                throw new Error(data.message || 'Error en la autenticación');
            }

            // Guardar credenciales (token)
            this.saveCredentials(
                data.baseUrl || cleanUrl,
                data.token,
                data.userId || null,
                null, // userRole se obtendrá después
                false // isAdmin se verificará después
            );

            this.isAuthenticated = true;

            // Verificar rol de usuario usando el token
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
                    let roles = userData.roles;
                    
                    if (!roles && userData.id) {
                        try {
                            const userByIdUrl = `${cleanUrl}/wp-json/wp/v2/users/${userData.id}?context=edit`;
                            const userByIdResponse = await fetch(userByIdUrl, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${data.token}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            if (userByIdResponse.ok) {
                                const userByIdData = await userByIdResponse.json();
                                roles = userByIdData.roles;
                            }
                        } catch (e) {
                            console.warn('No se pudieron obtener roles detallados');
                        }
                    }
                    
                    const userRole = roles && roles.length > 0 ? roles[0] : null;
                    const isAdmin = roles && roles.includes('administrator');
                    
                    // Actualizar credenciales con rol
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
            console.error('Error de autenticación:', error);
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('No se pudo conectar al servidor. Verifica que la URL sea correcta.');
            }
            
            throw error;
        }
    }

    // Autenticar con WordPress (método antiguo - mantener por compatibilidad)
    // NOTA: Este método ya no se usa, se mantiene solo por compatibilidad
    async authenticate(baseUrl, username, password) {
        // Redirigir al método directLogin
        return await this.directLogin(baseUrl, username, password);
    }

    // Obtener headers de autenticación para las peticiones (Bearer Token)
    getAuthHeaders() {
        if (!this.baseUrl || !this.token) {
            console.error('Credenciales faltantes:', {
                baseUrl: this.baseUrl,
                token: this.token ? 'presente' : 'faltante'
            });
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

    // ========== NEXTEND SOCIAL LOGIN ==========

    /**
     * Obtener token desde sesión de WordPress (cuando se usa Nextend Social Login)
     * El usuario debe estar logueado primero en WordPress usando Nextend
     * @param {string} baseUrl - URL base de WordPress
     */
    async getTokenFromNextendSession(baseUrl) {
        try {
            const cleanUrl = baseUrl.replace(/\/$/, '');
            const response = await fetch(`${cleanUrl}/wp-json/plaza/v1/get-token`, {
                method: 'GET',
                credentials: 'include', // Incluir cookies para sesión de WordPress
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error obteniendo token desde sesión');
            }

            const data = await response.json();
            
            if (!data.success || !data.token) {
                throw new Error('No se pudo obtener el token');
            }

            // Guardar credenciales
            this.saveCredentials(
                data.baseUrl || cleanUrl,
                data.token,
                data.userId,
                null,
                false
            );

            return data.token;
        } catch (error) {
            console.error('Error obteniendo token desde Nextend:', error);
            throw error;
        }
    }

}

// Instancia global
const auth = new Auth();

