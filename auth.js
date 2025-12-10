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
    async authenticate(baseUrl, username, password) {

            // Si falla WooCommerce, intentar con WordPress REST API
            const wpUrl = `${cleanUrl}/wp-json/wp/v2/users/me`;
            const wpResponse = await fetch(wpUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                }
            });

            if (wpResponse.ok) {
                // Autenticación exitosa con WordPress
                const userData = await wpResponse.json();
                let roles = userData.roles;
                
                // Si no hay roles, intentar obtener con contexto edit
                if (!roles) {
                    try {
                        const editUrl = `${cleanUrl}/wp-json/wp/v2/users/me?context=edit`;
                        const editResponse = await fetch(editUrl, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Basic ${credentials}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        if (editResponse.ok) {
                            const editData = await editResponse.json();
                            roles = editData.roles;
                        }
                    } catch (e) {
                        // Si falla, usar heurística: admin con ID 1 o nombre 'admin'
                        if (userData.id === 1 || userData.name === 'admin' || userData.slug === 'admin') {
                            roles = ['administrator'];
                        }
                    }
                }
                
                const userRole = roles && roles.length > 0 ? roles[0] : null;
                const isAdmin = roles && roles.includes('administrator') 
                    || (userData.id === 1 && userData.name === 'admin')
                    || (userData.slug === 'admin');
                
                this.saveCredentials(baseUrl, username, password, userRole, isAdmin);
                this.isAuthenticated = true;
                return true;
            }

            // Si ambos fallan, dar mensaje de error específico
            if (wpResponse.status === 401 || wcResponse.status === 401) {
                throw new Error('Credenciales inválidas. Verifica tu usuario y contraseña. Si usas Application Passwords, asegúrate de usar la contraseña de aplicación, no tu contraseña normal.');
            } else if (wpResponse.status === 403 || wcResponse.status === 403) {
                throw new Error('Acceso denegado. El usuario debe tener rol de Shop Manager o Administrator.');
            } else if (wpResponse.status === 404 || wcResponse.status === 404) {
                throw new Error('URL no encontrada. Verifica que la URL sea correcta y que WooCommerce esté instalado.');
            } else {
                throw new Error(`Error de conexión (${wpResponse.status || wcResponse.status}). Verifica que Basic Auth esté habilitado en tu WordPress.`);
            }
        } catch (error) {
            console.error('Error de autenticación:', error);
            
            // Si es un error de red
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('No se pudo conectar al servidor. Verifica que la URL sea correcta y que el sitio esté accesible.');
            }
            
            // Re-lanzar el error con el mensaje personalizado
            throw error;
        }
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

