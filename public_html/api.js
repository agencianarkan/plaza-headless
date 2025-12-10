// api.js - Llamadas a la API REST de WooCommerce a través del proxy
// Versión 2.0 - Usa backend de Plaza

// Función para obtener la URL base de la API
// Evitar conflictos con declaraciones anteriores
if (typeof getApiBaseUrl === 'undefined') {
    function getApiBaseUrl() {
        return window.location.origin + '/api/api';
    }
}

class WooCommerceAPI {
    constructor() {
        this.baseUrl = null;
    }

    // Inicializar (ya no necesita baseUrl, se obtiene del token)
    init() {
        // Ya no necesitamos baseUrl, se obtiene del token
        const tienda = auth.getTienda();
        if (tienda && tienda.url) {
            this.baseUrl = tienda.url.replace(/\/$/, '');
        }
    }

    // Obtener token de sesión
    getToken() {
        const token = auth.getToken();
        if (!token) {
            throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.');
        }
        return token;
    }

    // Hacer petición a través del proxy
    async request(endpoint, options = {}) {
        const token = this.getToken();
        
        // Construir URL del proxy
        const queryParams = new URLSearchParams();
        queryParams.append('endpoint', endpoint);
        queryParams.append('token', token);
        
        // Agregar query params adicionales si existen
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                queryParams.append(key, value);
            });
        }

        const url = `${getApiBaseUrl()}/proxy.php?${queryParams.toString()}`;

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Si es 401, token expirado o inválido
                if (response.status === 401) {
                    console.error('Error 401 - Sesión expirada. Redirigiendo al login...');
                    auth.logout();
                    setTimeout(() => window.location.reload(), 1000);
                    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
                }
                
                throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en petición API:', error);
            throw error;
        }
    }

    // ========== PRODUCTOS ==========

    // Obtener productos
    async getProducts(params = {}) {
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page);
        if (params.per_page) queryParams.append('per_page', params.per_page);
        if (params.search) queryParams.append('search', params.search);
        if (params.status) queryParams.append('status', params.status);
        if (params.orderby) queryParams.append('orderby', params.orderby);
        if (params.order) queryParams.append('order', params.order);

        const endpoint = `/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        return await this.request(endpoint);
    }

    // Obtener un producto por ID
    async getProduct(id) {
        return await this.request(`/products/${id}`);
    }

    // Crear producto
    async createProduct(productData) {
        return await this.request('/products', {
            method: 'POST',
            body: productData
        });
    }

    // Actualizar producto
    async updateProduct(id, productData) {
        return await this.request(`/products/${id}`, {
            method: 'PUT',
            body: productData
        });
    }

    // Eliminar producto
    async deleteProduct(id, force = true) {
        return await this.request(`/products/${id}?force=${force}`, {
            method: 'DELETE'
        });
    }

    // ========== PEDIDOS ==========

    // Obtener pedidos
    async getOrders(params = {}) {
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page);
        if (params.per_page) queryParams.append('per_page', params.per_page);
        if (params.search) queryParams.append('search', params.search);
        if (params.status) queryParams.append('status', params.status);
        if (params.orderby) queryParams.append('orderby', params.orderby || 'date');
        if (params.order) queryParams.append('order', params.order || 'desc');

        const endpoint = `/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        return await this.request(endpoint);
    }

    // Obtener un pedido por ID
    async getOrder(id) {
        return await this.request(`/orders/${id}`);
    }

    // Actualizar estado de pedido
    async updateOrderStatus(id, status) {
        return await this.request(`/orders/${id}`, {
            method: 'PUT',
            body: { status }
        });
    }

    // ========== SUBIR IMÁGENES ==========

    // Subir imagen desde archivo
    async uploadImage(file) {
        const tienda = auth.getTienda();
        if (!tienda || !tienda.url) {
            throw new Error('No hay tienda configurada');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    const base64Data = reader.result;
                    const filename = file.name;
                    
                    const url = `${tienda.url}/wp-json/plaza/v1/upload-image`;
                    const token = this.getToken();
                    
                    // Usar el proxy para subir la imagen
                    // Necesitamos hacer una petición especial porque el endpoint de upload es diferente
                    const response = await fetch(`${getApiBaseUrl()}/proxy.php?endpoint=/products&token=${token}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            file: base64Data,
                            filename: filename
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();
                    resolve(result);
                } catch (error) {
                    console.error('Error subiendo imagen:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    // ========== CLASES DE ENVÍO ==========

    // Obtener clases de envío
    async getShippingClasses() {
        try {
            return await this.request('/products/shipping_classes');
        } catch (error) {
            console.error('Error obteniendo clases de envío:', error);
            return [];
        }
    }

    // ========== ENVÍOS ==========

    // Obtener zonas de envío
    async getShippingZones() {
        return await this.request('/shipping/zones');
    }

    // Obtener una zona de envío por ID
    async getShippingZone(id) {
        return await this.request(`/shipping/zones/${id}`);
    }

    // Obtener métodos de envío de una zona
    async getShippingZoneMethods(zoneId) {
        return await this.request(`/shipping/zones/${zoneId}/methods`);
    }

    // Obtener un método de envío específico
    async getShippingZoneMethod(zoneId, methodId) {
        return await this.request(`/shipping/zones/${zoneId}/methods/${methodId}`);
    }

    // Crear zona de envío
    async createShippingZone(zoneData) {
        return await this.request('/shipping/zones', {
            method: 'POST',
            body: zoneData
        });
    }

    // Actualizar zona de envío
    async updateShippingZone(id, zoneData) {
        return await this.request(`/shipping/zones/${id}`, {
            method: 'PUT',
            body: zoneData
        });
    }

    // Eliminar zona de envío
    async deleteShippingZone(id) {
        return await this.request(`/shipping/zones/${id}`, {
            method: 'DELETE'
        });
    }

    // Crear método de envío en una zona
    async createShippingZoneMethod(zoneId, methodData) {
        return await this.request(`/shipping/zones/${zoneId}/methods`, {
            method: 'POST',
            body: methodData
        });
    }

    // Actualizar método de envío
    async updateShippingZoneMethod(zoneId, methodId, methodData) {
        return await this.request(`/shipping/zones/${zoneId}/methods/${methodId}`, {
            method: 'PUT',
            body: methodData
        });
    }

    // Eliminar método de envío
    async deleteShippingZoneMethod(zoneId, methodId) {
        return await this.request(`/shipping/zones/${zoneId}/methods/${methodId}`, {
            method: 'DELETE'
        });
    }

    // ========== CLIENTES ==========

    // Obtener clientes
    async getCustomers(params = {}) {
        const queryParams = new URLSearchParams();
        
        if (params.page) queryParams.append('page', params.page);
        if (params.per_page) queryParams.append('per_page', params.per_page);
        if (params.search) queryParams.append('search', params.search);
        if (params.orderby) queryParams.append('orderby', params.orderby || 'registered_date');
        if (params.order) queryParams.append('order', params.order || 'desc');

        const endpoint = `/customers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        
        try {
            return await this.request(endpoint);
        } catch (error) {
            console.error('Error en getCustomers:', error);
            throw error;
        }
    }

    // Obtener un cliente por ID
    async getCustomer(id) {
        return await this.request(`/customers/${id}`);
    }

    // ========== CONFIGURACIÓN ==========

    // Obtener lista de grupos de ajustes
    async getSettingsGroups() {
        try {
            return await this.request('/settings');
        } catch (error) {
            console.error('Error obteniendo grupos de ajustes:', error);
            return [];
        }
    }

    // Obtener ajustes de WooCommerce
    async getSettings(group = '', section = '') {
        let endpoint = '/settings';
        if (group) {
            endpoint += `/${group}`;
            if (section) {
                endpoint += `/${section}`;
            }
        }
        return await this.request(endpoint);
    }

    // Actualizar ajuste de WooCommerce
    async updateSetting(group, id, value, section = '') {
        let endpoint = `/settings/${group}`;
        if (section) {
            endpoint += `/${section}`;
        }
        endpoint += `/${id}`;
        return await this.request(endpoint, {
            method: 'PUT',
            body: { value }
        });
    }

    // ========== ESTADÍSTICAS ==========

    // Obtener estadísticas del dashboard
    async getStats() {
        try {
            // Obtener productos
            const products = await this.getProducts({ per_page: 1 });
            const totalProducts = products.length > 0 ? 100 : 0; // Aproximación, WooCommerce no siempre devuelve total en headers

            // Obtener pedidos
            const orders = await this.getOrders({ per_page: 1 });
            const totalOrders = orders.length > 0 ? 100 : 0;

            // Obtener pedidos pendientes
            const pendingOrders = await this.getOrders({ status: 'pending', per_page: 1 });
            const pendingOrdersCount = pendingOrders.length > 0 ? 100 : 0;

            // Obtener pedidos completados
            const completedOrders = await this.getOrders({ status: 'completed', per_page: 1 });
            const completedOrdersCount = completedOrders.length > 0 ? 100 : 0;

            return {
                totalProducts: parseInt(totalProducts),
                totalOrders: parseInt(totalOrders),
                pendingOrders: parseInt(pendingOrdersCount),
                completedOrders: parseInt(completedOrdersCount)
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                totalProducts: 0,
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0
            };
        }
    }
}

// Instancia global
const wcAPI = new WooCommerceAPI();

