// auth.js - Manejo de autenticación con WordPress usando Basic Auth + Application Passwords

class Auth {
    constructor() {
        this.baseUrl = null;
        this.username = null;
        this.appPassword = null;
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
                if (data.baseUrl && data.username && data.appPassword) {
                    this.baseUrl = data.baseUrl;
                    this.username = data.username;
                    this.appPassword = data.appPassword;
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

    // Guardar Application Password por URL+usuario (para no pedirlo más)
    saveAppPassword(baseUrl, username, appPassword) {
        try {
            const key = `plaza_app_passwords`;
            let saved = localStorage.getItem(key);
            let passwords = saved ? JSON.parse(saved) : {};
            
            const urlKey = baseUrl.replace(/\/$/, '') + '|' + username;
            passwords[urlKey] = appPassword;
            
            localStorage.setItem(key, JSON.stringify(passwords));
        } catch (error) {
            console.error('Error guardando Application Password:', error);
        }
    }

    // Obtener Application Password guardado
    getSavedAppPassword(baseUrl, username) {
        try {
            const key = `plaza_app_passwords`;
            const saved = localStorage.getItem(key);
            if (!saved) return null;
            
            const passwords = JSON.parse(saved);
            const urlKey = baseUrl.replace(/\/$/, '') + '|' + username;
            
            return passwords[urlKey] || null;
        } catch (error) {
            console.error('Error obteniendo Application Password:', error);
            return null;
        }
    }

    // Guardar credenciales
    saveCredentials(baseUrl, username, appPassword, userId = null, userRole = null, isAdmin = false) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.username = username;
        this.appPassword = appPassword;
        this.userId = userId;
        this.userRole = userRole;
        this.isAdmin = isAdmin;
        
        // Guardar también en el objeto de Application Passwords
        this.saveAppPassword(baseUrl, username, appPassword);
        
        localStorage.setItem('plaza_auth', JSON.stringify({
            baseUrl: this.baseUrl,
            username: this.username,
            appPassword: this.appPassword,
            userId: this.userId,
            userRole: this.userRole,
            isAdmin: this.isAdmin
        }));
    }

    // Login con usuario y Application Password (MÉTODO PRINCIPAL)
    async loginWithCredentials(baseUrl, username, appPassword) {
        try {
            const cleanUrl = baseUrl.replace(/\/$/, '');
            
            // Crear Basic Auth header: usuario:application-password en base64
            const credentials = btoa(`${username}:${appPassword}`);
            
            // Probar la autenticación haciendo una petición a la API de WordPress
            const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me?context=edit`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Usuario o Application Password incorrectos');
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const userData = await response.json();

            // Verificar permisos
            if (!userData.capabilities || (!userData.capabilities.administrator && !userData.capabilities.manage_woocommerce)) {
                throw new Error('Se requiere rol de Administrator o Shop Manager');
            }

            // Guardar credenciales
            this.saveCredentials(
                cleanUrl,
                username,
                appPassword,
                userData.id,
                userData.roles && userData.roles[0] ? userData.roles[0] : null,
                userData.capabilities && userData.capabilities.administrator
            );

            this.isAuthenticated = true;
            return { success: true };
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    // Obtener headers de autenticación (Basic Auth)
    getAuthHeaders() {
        if (!this.isAuthenticated || !this.username || !this.appPassword) {
            throw new Error('No autenticado');
        }
        
        const credentials = btoa(`${this.username}:${this.appPassword}`);
        
        return {
            'Authorization': `Basic ${credentials}`,
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
        this.username = null;
        this.appPassword = null;
        this.isAuthenticated = false;
        this.userRole = null;
        this.isAdmin = false;
        this.userId = null;
        localStorage.removeItem('plaza_auth');
    }

    // Verificar si está autenticado
    checkAuth() {
        return this.isAuthenticated && this.baseUrl && this.username && this.appPassword;
    }
}

// Instancia global
const auth = new Auth();
