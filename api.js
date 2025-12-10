// api.js - Llamadas a la API REST de WooCommerce

class WooCommerceAPI {
    constructor() {
        this.baseUrl = null;
    }

    // Inicializar con la URL base
    init(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    // Obtener headers de autenticación
    getHeaders() {
        try {
            return auth.getAuthHeaders();
        } catch (error) {
            console.error('Error obteniendo headers de autenticación:', error);
            // Si no hay credenciales, redirigir al login
            if (error.message.includes('No hay credenciales')) {
                auth.logout();
                window.location.reload();
            }
            throw error;
        }
    }

    // Hacer petición a la API (usando proxy para evitar CORS)
    async request(endpoint, options = {}) {
        if (!this.baseUrl) {
            this.baseUrl = auth.getBaseUrl();
        }

        // Usar proxy en lugar de petición directa (elimina CORS)
        // El proxy está en /wp-json/plaza/v1/proxy/wc/v3/...
        const proxyPath = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const url = `${this.baseUrl}/wp-json/plaza/v1/proxy/${proxyPath}`;
        const headers = this.getHeaders();

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Si es 401, puede ser que las credenciales expiraron o son inválidas
                if (response.status === 401) {
                    console.error('Error 401 - No autorizado. Verificando credenciales...');
                    // Verificar si las credenciales están disponibles
                    if (!auth.checkAuth()) {
                        console.error('Credenciales no disponibles, redirigiendo al login...');
                        auth.logout();
                        setTimeout(() => window.location.reload(), 1000);
                    }
                }
                
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
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

        const queryString = queryParams.toString();
        const endpoint = `/products${queryString ? '?' + queryString : ''}`;
        
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
            body: JSON.stringify(productData)
        });
    }

    // Actualizar producto
    async updateProduct(id, productData) {
        return await this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
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

        const queryString = queryParams.toString();
        const endpoint = `/orders${queryString ? '?' + queryString : ''}`;
        
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
            body: JSON.stringify({ status })
        });
    }

    // ========== SUBIR IMÁGENES ==========

    // Subir imagen desde archivo
    async uploadImage(file) {
        if (!this.baseUrl) {
            this.baseUrl = auth.getBaseUrl();
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    const base64Data = reader.result;
                    const filename = file.name;
                    
                    const url = `${this.baseUrl}/wp-json/plaza/v1/upload-image`;
                    const headers = this.getHeaders();
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            ...headers,
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
            if (!this.baseUrl) {
                this.baseUrl = auth.getBaseUrl();
            }

            const url = `${this.baseUrl}/wp-json/wc/v3/products/shipping_classes`;
            const headers = this.getHeaders();

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                return []; // Si falla, retornar array vacío
            }

            return await response.json();
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
            body: JSON.stringify(zoneData)
        });
    }

    // Actualizar zona de envío
    async updateShippingZone(id, zoneData) {
        return await this.request(`/shipping/zones/${id}`, {
            method: 'PUT',
            body: JSON.stringify(zoneData)
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
            body: JSON.stringify(methodData)
        });
    }

    // Actualizar método de envío
    async updateShippingZoneMethod(zoneId, methodId, methodData) {
        return await this.request(`/shipping/zones/${zoneId}/methods/${methodId}`, {
            method: 'PUT',
            body: JSON.stringify(methodData)
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

        const queryString = queryParams.toString();
        const endpoint = `/customers${queryString ? '?' + queryString : ''}`;
        
        try {
            return await this.request(endpoint);
        } catch (error) {
            console.error('Error en getCustomers:', error);
            // Si el error es 403 o 401, puede ser un problema de permisos
            if (error.message.includes('403') || error.message.includes('401')) {
                throw new Error('No tienes permisos para ver clientes. Asegúrate de que el usuario tenga rol de Shop Manager o Administrator.');
            }
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
            body: JSON.stringify({ value })
        });
    }

    // ========== ESTADÍSTICAS ==========

    // Obtener estadísticas del dashboard
    async getStats() {
        try {
            // Obtener productos
            const productsResponse = await this.getProducts({ per_page: 1 });
            const totalProducts = productsResponse.headers?.['x-wp-total'] || 0;

            // Obtener pedidos
            const ordersResponse = await this.getOrders({ per_page: 1 });
            const totalOrders = ordersResponse.headers?.['x-wp-total'] || 0;

            // Obtener pedidos pendientes
            const pendingOrdersResponse = await this.getOrders({ status: 'pending', per_page: 1 });
            const pendingOrders = pendingOrdersResponse.headers?.['x-wp-total'] || 0;

            // Obtener pedidos completados
            const completedOrdersResponse = await this.getOrders({ status: 'completed', per_page: 1 });
            const completedOrders = completedOrdersResponse.headers?.['x-wp-total'] || 0;

            return {
                totalProducts: parseInt(totalProducts),
                totalOrders: parseInt(totalOrders),
                pendingOrders: parseInt(pendingOrders),
                completedOrders: parseInt(completedOrders)
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

