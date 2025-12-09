// app.js - Lógica principal de la aplicación

// Estado global
const state = {
    currentPage: 'dashboard',
    currentProductPage: 1,
    currentOrderPage: 1,
    currentCustomerPage: 1,
    totalProductPages: 1,
    totalOrderPages: 1,
    totalCustomerPages: 1,
    editingProductId: null,
    editingOrderId: null,
    productImages: [] // Array de URLs de imágenes
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Verificar si es un callback de Google OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (code || error) {
            // Es un callback de Google, manejar primero
            handleGoogleCallback();
            setupEventListeners();
            return;
        }
        
        auth.init();
        
        if (auth.checkAuth()) {
            try {
                wcAPI.init(auth.getBaseUrl());
                showDashboard();
                loadDashboard();
                // Verificar y mostrar menú de envíos si es admin
                checkAndShowShippingMenu();
            } catch (error) {
                console.error('Error inicializando aplicación:', error);
                // Si hay error, puede ser que las credenciales sean inválidas
                auth.logout();
                showLogin();
                showToast('Error de autenticación. Por favor, inicia sesión nuevamente.', 'error');
            }
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Error en inicialización:', error);
        showLogin();
    }

    setupEventListeners();
});

// Función para verificar y mostrar el menú de configuración
async function checkAndShowShippingMenu() {
    const shippingMenuItem = document.getElementById('shipping-menu-item');
    if (!shippingMenuItem) {
        console.error('Elemento shipping-menu-item no encontrado');
        return;
    }
    
    // Si ya tenemos el rol guardado, verificar
    if (auth.isAdmin) {
        shippingMenuItem.style.display = 'block';
        console.log('Usuario es admin, mostrando menú de envíos');
        return;
    }
    
    // Si no tenemos el rol, intentar obtenerlo
    try {
        const baseUrl = auth.getBaseUrl();
        const credentials = btoa(`${auth.username}:${auth.password}`);
        
        // Intentar obtener con contexto edit para incluir roles
        const wpUrl = `${baseUrl}/wp-json/wp/v2/users/me?context=edit`;
        const wpResponse = await fetch(wpUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (wpResponse.ok) {
            const userData = await wpResponse.json();
            console.log('Datos del usuario:', userData);
            console.log('Roles del usuario:', userData.roles);
            
            // Si aún no hay roles, intentar obtener el usuario por ID
            let roles = userData.roles;
            if (!roles && userData.id) {
                try {
                    const userByIdUrl = `${baseUrl}/wp-json/wp/v2/users/${userData.id}?context=edit`;
                    const userByIdResponse = await fetch(userByIdUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Basic ${credentials}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (userByIdResponse.ok) {
                        const userByIdData = await userByIdResponse.json();
                        roles = userByIdData.roles;
                        console.log('Roles obtenidos por ID:', roles);
                    }
                } catch (e) {
                    console.warn('Error obteniendo usuario por ID:', e);
                }
            }
            
            // Si aún no hay roles, verificar por el nombre de usuario o ID
            // Los administradores suelen tener ID 1 o nombre 'admin'
            const isAdmin = roles && roles.includes('administrator') 
                || (userData.id === 1 && userData.name === 'admin')
                || (userData.slug === 'admin');
            
            auth.isAdmin = isAdmin;
            auth.userRole = roles && roles.length > 0 ? roles[0] : null;
            
            console.log('¿Es admin?', isAdmin);
            console.log('Rol detectado:', auth.userRole);
            
            // Guardar en localStorage
            const saved = localStorage.getItem('plaza_auth');
            if (saved) {
                const data = JSON.parse(saved);
                data.isAdmin = isAdmin;
                data.userRole = auth.userRole;
                localStorage.setItem('plaza_auth', JSON.stringify(data));
            }
            
            if (isAdmin) {
                shippingMenuItem.style.display = 'block';
                console.log('✅ Usuario es admin, mostrando menú de envíos');
            } else {
                shippingMenuItem.style.display = 'none';
                console.log('❌ Usuario NO es admin, ocultando menú de configuración');
            }
        }
    } catch (error) {
        console.error('Error verificando rol de usuario:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    // Google OAuth Login (único método de autenticación)
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    // Permitir iniciar sesión con Enter en el campo de URL
    const urlInput = document.getElementById('woocommerce-url');
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleGoogleLogin();
            }
        });
    }
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Clientes
    document.getElementById('customer-search').addEventListener('input', debounce(loadCustomers, 500));
    
    // Reportes
    document.getElementById('update-report-btn').addEventListener('click', loadReports);
    document.getElementById('reset-report-btn').addEventListener('click', resetReportDates);
    
    // Configuración - los event listeners se agregarán dinámicamente

    // Productos
    document.getElementById('new-product-btn').addEventListener('click', async () => await openProductModal());
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    document.getElementById('product-form-cancel').addEventListener('click', closeProductModal);
    document.getElementById('product-modal-close').addEventListener('click', closeProductModal);
    document.getElementById('product-search').addEventListener('input', debounce(loadProducts, 500));
    document.getElementById('product-status-filter').addEventListener('change', loadProducts);
    document.getElementById('add-image-btn').addEventListener('click', addImageFromUrl);
    document.getElementById('product-image-url').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addImageFromUrl();
        }
    });
    document.getElementById('product-image-file').addEventListener('change', handleFileUpload);
    document.getElementById('delete-product-btn').addEventListener('click', handleDeleteProductFromModal);
    
    // Editor de texto enriquecido
    setupRichEditors();

    // Pedidos
    document.getElementById('order-search').addEventListener('input', debounce(loadOrders, 500));
    document.getElementById('order-status-filter').addEventListener('change', loadOrders);
    document.getElementById('order-status-form').addEventListener('submit', handleOrderStatusSubmit);
    document.getElementById('order-status-form-cancel').addEventListener('click', closeOrderStatusModal);
    document.getElementById('order-status-modal-close').addEventListener('click', closeOrderStatusModal);

    // Cerrar modales al hacer click fuera
    document.getElementById('product-modal').addEventListener('click', (e) => {
        if (e.target.id === 'product-modal') closeProductModal();
    });
    document.getElementById('order-status-modal').addEventListener('click', (e) => {
        if (e.target.id === 'order-status-modal') closeOrderStatusModal();
    });
}

// ========== AUTENTICACIÓN ==========
// Nota: Solo se permite autenticación con Google OAuth.
// El método tradicional de usuario/contraseña ha sido deshabilitado.

// ========== GOOGLE OAUTH ==========

async function handleGoogleLogin() {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    // Pedir URL de la tienda
    const baseUrl = document.getElementById('woocommerce-url').value;
    
    if (!baseUrl) {
        errorDiv.textContent = 'Por favor ingresa la URL de tu tienda WooCommerce';
        errorDiv.classList.add('show');
        showToast('URL requerida', 'error');
        return;
    }
    
    try {
        showToast('Iniciando autenticación con Google...', 'success');
        await auth.authWithGoogle(baseUrl);
        // La redirección a Google se hace automáticamente en authWithGoogle
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
        showToast('Error: ' + error.message, 'error');
    }
}

async function handleGoogleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    // Limpiar URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    if (error) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = 'Error de autenticación con Google: ' + error;
        errorDiv.classList.add('show');
        showToast('Error de autenticación con Google', 'error');
        return;
    }
    
    if (!code) {
        return; // No hay código, no es un callback de Google
    }
    
    // Obtener baseUrl guardado temporalmente
    const baseUrl = sessionStorage.getItem('plaza_google_baseurl');
    sessionStorage.removeItem('plaza_google_baseurl');
    
    if (!baseUrl) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = 'Error: No se encontró la URL de la tienda. Por favor, intenta nuevamente.';
        errorDiv.classList.add('show');
        showToast('Error: URL no encontrada', 'error');
        return;
    }
    
    try {
        showToast('Completando autenticación...', 'success');
        await auth.handleGoogleCallback(code, baseUrl);
        wcAPI.init(auth.getBaseUrl());
        
        const userInfo = document.getElementById('user-info');
        userInfo.textContent = `Usuario: ${auth.username}`;
        
        showDashboard();
        loadDashboard();
        
        // Verificar y mostrar menú de envíos después de un breve delay
        setTimeout(() => {
            checkAndShowShippingMenu();
        }, 500);
        
        showToast('¡Bienvenido!', 'success');
    } catch (error) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
        showToast('Error de autenticación: ' + error.message, 'error');
    }
}

function handleLogout() {
    auth.logout();
    showLogin();
    showToast('Sesión cerrada', 'success');
}

// ========== NAVEGACIÓN ==========

function showLogin() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('dashboard-screen').classList.remove('active');
}

function showDashboard() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');
}

function navigateToPage(page) {
    state.currentPage = page;
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Mostrar página correspondiente
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Cargar datos según la página
    if (page === 'dashboard') {
        loadDashboard();
    } else if (page === 'products') {
        loadProducts();
    } else if (page === 'orders') {
        loadOrders();
    } else if (page === 'customers') {
        loadCustomers();
    } else if (page === 'reports') {
        loadReports();
    } else if (page === 'shipping') {
        if (auth.isAdmin) {
            console.log('Navegando a página de envíos, cargando zonas...');
            // Inicializar listeners primero
            attachShippingZoneListeners();
            // Luego cargar zonas
            loadShippingZones();
        } else {
            showToast('No tienes permisos para acceder a esta sección', 'error');
            navigateToPage('dashboard');
        }
    }
}

// ========== DASHBOARD ==========

async function loadDashboard() {
    try {
        const stats = await wcAPI.getStats();
        
        document.getElementById('total-products').textContent = stats.totalProducts;
        document.getElementById('total-orders').textContent = stats.totalOrders;
        document.getElementById('pending-orders').textContent = stats.pendingOrders;
        document.getElementById('completed-orders').textContent = stats.completedOrders;
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showToast('Error cargando estadísticas', 'error');
    }
}

// ========== PRODUCTOS ==========

async function loadProducts(page = 1) {
    state.currentProductPage = page;
    
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando productos...</td></tr>';
    
    try {
        const search = document.getElementById('product-search').value;
        const status = document.getElementById('product-status-filter').value;
        
        const products = await wcAPI.getProducts({
            page: page,
            per_page: 10,
            search: search || undefined,
            status: status || undefined,
            orderby: 'date',
            order: 'desc'
        });

        // Obtener total de páginas desde headers (si están disponibles)
        // Nota: WooCommerce API puede no enviar headers en todas las respuestas
        // Por ahora usamos una aproximación
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No se encontraron productos</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        products.forEach(product => {
            const row = createProductRow(product);
            tbody.appendChild(row);
        });

        // Actualizar paginación (simplificado - en producción deberías obtener el total real)
        updateProductPagination();
    } catch (error) {
        console.error('Error cargando productos:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error cargando productos</td></tr>';
        showToast('Error cargando productos', 'error');
    }
}

function createProductRow(product) {
    const tr = document.createElement('tr');
    
    const image = product.images && product.images.length > 0 
        ? `<img src="${product.images[0].src}" alt="${product.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'%3E%3Crect fill=\'%23ddd\' width=\'50\' height=\'50\'/%3E%3C/svg%3E'">`
        : '<div style="width:50px;height:50px;background:#ddd;border-radius:6px;"></div>';
    
    const price = product.sale_price 
        ? `<span style="text-decoration:line-through;color:#999;">${formatPrice(product.regular_price)}</span> <strong>${formatPrice(product.sale_price)}</strong>`
        : formatPrice(product.regular_price);
    
    const stockStatus = product.stock_status === 'instock' ? 'En stock' : 'Sin stock';
    const stockQuantity = product.manage_stock ? product.stock_quantity : stockStatus;
    
    // Obtener URL del producto
    let productUrl = product.permalink;
    if (!productUrl) {
        try {
            const baseUrl = wcAPI.baseUrl || auth.getBaseUrl();
            if (product.slug) {
                productUrl = `${baseUrl}/product/${product.slug}`;
            } else {
                productUrl = `${baseUrl}/?p=${product.id}`;
            }
        } catch (e) {
            console.error('Error construyendo URL del producto:', e);
            productUrl = '#';
        }
    }
    
    // Guardar la URL en el elemento para acceso fácil
    tr.dataset.productUrl = productUrl;
    tr.dataset.productId = product.id;
    
    tr.innerHTML = `
        <td>${image}</td>
        <td><strong>${escapeHtml(product.name)}</strong></td>
        <td>${product.sku || '-'}</td>
        <td>${price}</td>
        <td>${stockQuantity}</td>
        <td><span class="status-badge status-${product.status}">${product.status}</span></td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">✏️ Editar</button>
                <button class="btn btn-sm btn-secondary" onclick="viewProductFromRow(this)">👁️ Ver</button>
            </div>
        </td>
    `;
    
    return tr;
}

function updateProductPagination() {
    const pagination = document.getElementById('products-pagination');
    // Simplificado - en producción deberías obtener el total real de páginas
    pagination.innerHTML = `
        <button ${state.currentProductPage === 1 ? 'disabled' : ''} onclick="loadProducts(${state.currentProductPage - 1})">← Anterior</button>
        <span class="page-info">Página ${state.currentProductPage}</span>
        <button onclick="loadProducts(${state.currentProductPage + 1})">Siguiente →</button>
    `;
}

async function openProductModal(productId = null) {
    state.editingProductId = productId;
    state.productImages = []; // Resetear imágenes
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');
    const deleteBtn = document.getElementById('delete-product-btn');
    
    // Cargar clases de envío
    await loadShippingClasses();
    
    if (productId) {
        title.textContent = 'Editar Producto';
        deleteBtn.style.display = 'block';
        loadProductData(productId);
    } else {
        title.textContent = 'Nuevo Producto';
        deleteBtn.style.display = 'none';
        form.reset();
        renderProductImages();
    }
    
    modal.classList.add('active');
}

async function loadProductData(id) {
    try {
        const product = await wcAPI.getProduct(id);
        
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.regular_price;
        document.getElementById('product-sale-price').value = product.sale_price || '';
        document.getElementById('product-sku').value = product.sku || '';
        document.getElementById('product-stock').value = product.stock_quantity || '';
        document.getElementById('product-status').value = product.status;
        
        // Cargar datos de envío
        document.getElementById('product-weight').value = product.weight || '';
        document.getElementById('product-length').value = product.dimensions?.length || '';
        document.getElementById('product-width').value = product.dimensions?.width || '';
        document.getElementById('product-height').value = product.dimensions?.height || '';
        document.getElementById('product-shipping-class').value = product.shipping_class_id || '';
        
        // Cargar descripciones
        const shortDesc = product.short_description || '';
        const longDesc = product.description || '';
        
        setEditorContent('short-description', shortDesc);
        setEditorContent('description', longDesc);
        
        // Cargar imágenes
        state.productImages = product.images ? product.images.map(img => img.src) : [];
        renderProductImages();
    } catch (error) {
        console.error('Error cargando producto:', error);
        showToast('Error cargando producto', 'error');
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('product-name').value,
        type: 'simple',
        regular_price: document.getElementById('product-price').value,
        sale_price: document.getElementById('product-sale-price').value || '',
        sku: document.getElementById('product-sku').value || '',
        manage_stock: document.getElementById('product-stock').value !== '',
        stock_quantity: document.getElementById('product-stock').value || null,
        status: document.getElementById('product-status').value,
        description: getEditorContent('description'),
        short_description: getEditorContent('short-description'),
        weight: document.getElementById('product-weight').value || '',
        dimensions: {
            length: document.getElementById('product-length').value || '',
            width: document.getElementById('product-width').value || '',
            height: document.getElementById('product-height').value || ''
        },
        shipping_class_id: document.getElementById('product-shipping-class').value || ''
    };

    // Agregar imágenes
    if (state.productImages.length > 0) {
        productData.images = state.productImages.map(src => ({ src }));
    }

    try {
        if (state.editingProductId) {
            await wcAPI.updateProduct(state.editingProductId, productData);
            showToast('Producto actualizado exitosamente', 'success');
        } else {
            await wcAPI.createProduct(productData);
            showToast('Producto creado exitosamente', 'success');
        }
        
        closeProductModal();
        loadProducts(state.currentProductPage);
    } catch (error) {
        console.error('Error guardando producto:', error);
        showToast('Error guardando producto: ' + error.message, 'error');
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
    document.getElementById('product-form').reset();
    document.getElementById('product-image-url').value = '';
    document.getElementById('delete-product-btn').style.display = 'none';
    
    // Limpiar campos de envío
    document.getElementById('product-weight').value = '';
    document.getElementById('product-length').value = '';
    document.getElementById('product-width').value = '';
    document.getElementById('product-height').value = '';
    document.getElementById('product-shipping-class').value = '';
    
    // Limpiar editores
    setEditorContent('short-description', '');
    setEditorContent('description', '');
    
    state.editingProductId = null;
    state.productImages = [];
    renderProductImages();
}

async function loadShippingClasses() {
    try {
        const shippingClasses = await wcAPI.getShippingClasses();
        const select = document.getElementById('product-shipping-class');
        
        // Limpiar opciones existentes (excepto "Ninguna")
        const currentValue = select.value;
        select.innerHTML = '<option value="">Ninguna clase de envío</option>';
        
        // Agregar clases de envío
        shippingClasses.forEach(shippingClass => {
            const option = document.createElement('option');
            option.value = shippingClass.id;
            option.textContent = shippingClass.name;
            select.appendChild(option);
        });
        
        // Restaurar valor anterior si existe
        if (currentValue) {
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Error cargando clases de envío:', error);
        // No mostrar error al usuario, simplemente dejar sin opciones adicionales
    }
}

function viewProduct(url) {
    if (!url || url === '#') {
        showToast('URL del producto no disponible', 'error');
        return;
    }
    
    try {
        window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
        console.error('Error abriendo producto:', error);
        showToast('Error al abrir el producto', 'error');
    }
}

function viewProductFromRow(button) {
    const row = button.closest('tr');
    const productUrl = row.dataset.productUrl;
    
    if (productUrl) {
        viewProduct(productUrl);
    } else {
        // Fallback: intentar obtener desde el ID
        const productId = row.dataset.productId;
        if (productId) {
            getProductUrlAndOpen(productId);
        } else {
            showToast('No se pudo obtener la URL del producto', 'error');
        }
    }
}

async function getProductUrlAndOpen(productId) {
    try {
        const product = await wcAPI.getProduct(productId);
        const url = product.permalink || `${wcAPI.baseUrl || auth.getBaseUrl()}/product/${product.slug || productId}`;
        viewProduct(url);
    } catch (error) {
        console.error('Error obteniendo URL del producto:', error);
        showToast('Error al obtener la URL del producto', 'error');
    }
}

async function handleDeleteProductFromModal() {
    if (!state.editingProductId) {
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await wcAPI.deleteProduct(state.editingProductId);
        showToast('Producto eliminado exitosamente', 'success');
        closeProductModal();
        loadProducts(state.currentProductPage);
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showToast('Error eliminando producto: ' + error.message, 'error');
    }
}

// ========== GESTIÓN DE IMÁGENES ==========

function addImageFromUrl() {
    const urlInput = document.getElementById('product-image-url');
    const url = urlInput.value.trim();
    
    if (!url) {
        showToast('Por favor ingresa una URL válida', 'error');
        return;
    }
    
    // Validar que sea una URL válida
    try {
        new URL(url);
    } catch (e) {
        showToast('La URL no es válida', 'error');
        return;
    }
    
    // Verificar que no esté duplicada
    if (state.productImages.includes(url)) {
        showToast('Esta imagen ya está agregada', 'error');
        return;
    }
    
    // Agregar imagen
    state.productImages.push(url);
    urlInput.value = '';
    renderProductImages();
    showToast('Imagen agregada', 'success');
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
        showToast('Por favor selecciona un archivo de imagen', 'error');
        e.target.value = '';
        return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('La imagen es muy grande. Máximo 5MB', 'error');
        e.target.value = '';
        return;
    }
    
    try {
        showToast('Subiendo imagen...', 'success');
        
        const result = await wcAPI.uploadImage(file);
        
        if (result.success && result.url) {
            // Verificar que no esté duplicada
            if (state.productImages.includes(result.url)) {
                showToast('Esta imagen ya está agregada', 'error');
            } else {
                state.productImages.push(result.url);
                renderProductImages();
                showToast('Imagen subida exitosamente', 'success');
            }
        } else {
            throw new Error('Error al subir la imagen');
        }
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        showToast('Error al subir la imagen: ' + error.message, 'error');
    } finally {
        // Limpiar el input
        e.target.value = '';
    }
}

function removeImage(index) {
    state.productImages.splice(index, 1);
    renderProductImages();
    showToast('Imagen eliminada', 'success');
}

function renderProductImages() {
    const container = document.getElementById('product-images-container');
    
    if (state.productImages.length === 0) {
        container.innerHTML = '<div class="image-placeholder">No hay imágenes. Agrega una imagen usando la URL.</div>';
        return;
    }
    
    container.innerHTML = state.productImages.map((url, index) => {
        const isPrimary = index === 0;
        return `
            <div class="image-item">
                <img src="${escapeHtml(url)}" alt="Imagen ${index + 1}" onerror="this.parentElement.innerHTML='<div class=\'image-placeholder\'>Error cargando imagen</div>'">
                ${isPrimary ? '<span class="image-primary-badge">Principal</span>' : ''}
                <button type="button" class="image-remove" onclick="removeImage(${index})" title="Eliminar imagen">×</button>
            </div>
        `;
    }).join('');
}

async function editProduct(id) {
    await openProductModal(id);
}

// ========== PEDIDOS ==========

async function loadOrders(page = 1) {
    state.currentOrderPage = page;
    
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Cargando pedidos...</td></tr>';
    
    try {
        const search = document.getElementById('order-search').value;
        const status = document.getElementById('order-status-filter').value;
        
        const orders = await wcAPI.getOrders({
            page: page,
            per_page: 10,
            search: search || undefined,
            status: status || undefined,
            orderby: 'date',
            order: 'desc'
        });

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No se encontraron pedidos</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        orders.forEach(order => {
            const row = createOrderRow(order);
            tbody.appendChild(row);
        });

        updateOrderPagination();
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Error cargando pedidos</td></tr>';
        showToast('Error cargando pedidos', 'error');
    }
}

function createOrderRow(order) {
    const tr = document.createElement('tr');
    
    const date = new Date(order.date_created).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const customerName = order.billing.first_name && order.billing.last_name
        ? `${order.billing.first_name} ${order.billing.last_name}`
        : order.billing.email || 'Cliente';
    
    tr.innerHTML = `
        <td><strong>#${order.id}</strong></td>
        <td>${date}</td>
        <td>${escapeHtml(customerName)}</td>
        <td><strong>${formatPrice(order.total)}</strong></td>
        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        <td>
            <button class="btn btn-sm btn-primary" onclick="changeOrderStatus(${order.id}, '${order.status}')">🔄 Cambiar Estado</button>
        </td>
    `;
    
    return tr;
}

function updateOrderPagination() {
    const pagination = document.getElementById('orders-pagination');
    pagination.innerHTML = `
        <button ${state.currentOrderPage === 1 ? 'disabled' : ''} onclick="loadOrders(${state.currentOrderPage - 1})">← Anterior</button>
        <span class="page-info">Página ${state.currentOrderPage}</span>
        <button onclick="loadOrders(${state.currentOrderPage + 1})">Siguiente →</button>
    `;
}

function changeOrderStatus(orderId, currentStatus) {
    state.editingOrderId = orderId;
    const modal = document.getElementById('order-status-modal');
    const statusSelect = document.getElementById('new-order-status');
    
    statusSelect.value = currentStatus;
    modal.classList.add('active');
}

async function handleOrderStatusSubmit(e) {
    e.preventDefault();
    
    const newStatus = document.getElementById('new-order-status').value;
    
    try {
        await wcAPI.updateOrderStatus(state.editingOrderId, newStatus);
        showToast('Estado del pedido actualizado exitosamente', 'success');
        closeOrderStatusModal();
        loadOrders(state.currentOrderPage);
    } catch (error) {
        console.error('Error actualizando estado:', error);
        showToast('Error actualizando estado: ' + error.message, 'error');
    }
}

function closeOrderStatusModal() {
    document.getElementById('order-status-modal').classList.remove('active');
    state.editingOrderId = null;
}

// ========== CLIENTES ==========

async function loadCustomers(page = 1) {
    state.currentCustomerPage = page;
    
    const tbody = document.getElementById('customers-tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Cargando clientes...</td></tr>';
    
    try {
        const search = document.getElementById('customer-search').value;
        
        // Obtener clientes registrados
        let registeredCustomers = [];
        try {
            registeredCustomers = await wcAPI.getCustomers({
                page: 1,
                per_page: 100, // Obtener más para combinar
                search: search || undefined,
                orderby: 'registered_date',
                order: 'desc'
            });
            if (!Array.isArray(registeredCustomers)) {
                registeredCustomers = [];
            }
        } catch (error) {
            console.warn('No se pudieron obtener clientes registrados:', error);
            registeredCustomers = [];
        }
        
        // Obtener clientes desde pedidos (incluye invitados)
        let ordersCustomers = [];
        try {
            const orders = await wcAPI.getOrders({
                page: 1,
                per_page: 100, // Obtener más pedidos para extraer clientes
                orderby: 'date',
                order: 'desc'
            });
            
            // Extraer información de clientes de los pedidos
            const customersMap = new Map();
            
            orders.forEach(order => {
                if (order.billing && order.billing.email) {
                    const email = order.billing.email.toLowerCase();
                    
                    // Si ya existe, usar el más reciente
                    if (!customersMap.has(email)) {
                        customersMap.set(email, {
                            email: order.billing.email,
                            first_name: order.billing.first_name || '',
                            last_name: order.billing.last_name || '',
                            phone: order.billing.phone || '',
                            billing: {
                                address_1: order.billing.address_1 || '',
                                address_2: order.billing.address_2 || '',
                                city: order.billing.city || '',
                                state: order.billing.state || '',
                                postcode: order.billing.postcode || '',
                                country: order.billing.country || '',
                                phone: order.billing.phone || ''
                            },
                            is_guest: order.customer_id === 0,
                            last_order_date: order.date_created
                        });
                    }
                }
            });
            
            ordersCustomers = Array.from(customersMap.values());
        } catch (error) {
            console.warn('No se pudieron obtener clientes de pedidos:', error);
            ordersCustomers = [];
        }
        
        // Combinar y eliminar duplicados por email
        const allCustomersMap = new Map();
        
        // Primero agregar clientes registrados
        registeredCustomers.forEach(customer => {
            if (customer.email) {
                const email = customer.email.toLowerCase();
                allCustomersMap.set(email, customer);
            }
        });
        
        // Luego agregar clientes de pedidos (solo si no existen)
        ordersCustomers.forEach(customer => {
            if (customer.email) {
                const email = customer.email.toLowerCase();
                if (!allCustomersMap.has(email)) {
                    allCustomersMap.set(email, customer);
                }
            }
        });
        
        let allCustomers = Array.from(allCustomersMap.values());
        
        // Aplicar búsqueda si existe
        if (search) {
            const searchLower = search.toLowerCase();
            allCustomers = allCustomers.filter(customer => {
                const name = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
                const email = (customer.email || '').toLowerCase();
                const phone = (customer.billing?.phone || customer.phone || '').toLowerCase();
                return name.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
            });
        }
        
        // Ordenar por fecha del último pedido o fecha de registro
        allCustomers.sort((a, b) => {
            const dateA = a.last_order_date || a.date_created || a.registered_date || '';
            const dateB = b.last_order_date || b.date_created || b.registered_date || '';
            return dateB.localeCompare(dateA);
        });
        
        // Paginación manual
        const perPage = 10;
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedCustomers = allCustomers.slice(startIndex, endIndex);
        const totalPages = Math.ceil(allCustomers.length / perPage);
        
        if (paginatedCustomers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading">No se encontraron clientes</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        paginatedCustomers.forEach(customer => {
            const row = createCustomerRow(customer);
            tbody.appendChild(row);
        });

        updateCustomerPagination(totalPages, allCustomers.length);
    } catch (error) {
        console.error('Error cargando clientes:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="loading">Error cargando clientes: ${error.message}</td></tr>`;
        showToast('Error cargando clientes: ' + error.message, 'error');
    }
}

function createCustomerRow(customer) {
    const tr = document.createElement('tr');
    
    // Obtener nombre completo
    const firstName = customer.first_name || '';
    const lastName = customer.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || customer.username || 'Sin nombre';
    
    // Agregar indicador si es invitado
    const guestBadge = customer.is_guest ? ' <span class="status-badge" style="background-color: #fef3c7; color: #92400e; font-size: 0.7rem; margin-left: 5px;">Invitado</span>' : '';
    
    // Obtener email
    const email = customer.email || '-';
    
    // Obtener teléfono (puede estar en billing.phone o phone)
    const phone = customer.billing?.phone || customer.phone || '-';
    
    // Obtener dirección completa
    let address = '-';
    const billing = customer.billing || {};
    const addressParts = [];
    
    if (billing.address_1) addressParts.push(billing.address_1);
    if (billing.address_2) addressParts.push(billing.address_2);
    if (billing.city) addressParts.push(billing.city);
    if (billing.state) addressParts.push(billing.state);
    if (billing.postcode) addressParts.push(billing.postcode);
    if (billing.country) addressParts.push(billing.country);
    
    if (addressParts.length > 0) {
        address = addressParts.join(', ');
    }
    
    tr.innerHTML = `
        <td><strong>${escapeHtml(fullName)}</strong>${guestBadge}</td>
        <td>${escapeHtml(email)}</td>
        <td>${escapeHtml(phone)}</td>
        <td>${escapeHtml(address)}</td>
    `;
    
    return tr;
}

function updateCustomerPagination(totalPages = 1, totalCustomers = 0) {
    const pagination = document.getElementById('customers-pagination');
    pagination.innerHTML = `
        <button ${state.currentCustomerPage === 1 ? 'disabled' : ''} onclick="loadCustomers(${state.currentCustomerPage - 1})">← Anterior</button>
        <span class="page-info">Página ${state.currentCustomerPage} de ${totalPages} (${totalCustomers} clientes)</span>
        <button ${state.currentCustomerPage >= totalPages ? 'disabled' : ''} onclick="loadCustomers(${state.currentCustomerPage + 1})">Siguiente →</button>
    `;
}

// ========== UTILIDADES ==========

function formatPrice(price) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== EDITOR DE TEXTO ENRIQUECIDO ==========

function setupRichEditors() {
    // Configurar botones de formato
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;
            const editorName = btn.closest('.editor-toolbar').dataset.editor;
            const visualEditor = document.getElementById(`${editorName}-visual`);
            
            visualEditor.focus();
            
            if (command === 'createLink') {
                const url = prompt('Ingresa la URL del enlace:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
            } else {
                document.execCommand(command, false, null);
            }
        });
    });
    
    // Configurar pestañas Visual/Código
    document.querySelectorAll('.editor-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const editorName = tab.dataset.editor;
            const tabType = tab.dataset.tab;
            switchEditorTab(editorName, tabType);
        });
    });
    
    // Sincronizar contenido entre visual y código
    document.querySelectorAll('.editor-visual').forEach(editor => {
        editor.addEventListener('input', function() {
            const editorName = this.id.replace('-visual', '');
            syncEditorContent(editorName);
        });
    });
    
    document.querySelectorAll('.editor-code').forEach(textarea => {
        textarea.addEventListener('input', function() {
            const editorName = this.id.replace('-code', '');
            syncEditorContentFromCode(editorName);
        });
    });
}

function switchEditorTab(editorName, tabType) {
    const visualEditor = document.getElementById(`${editorName}-visual`);
    const codeEditor = document.getElementById(`${editorName}-code`);
    const tabs = document.querySelectorAll(`.editor-tab[data-editor="${editorName}"]`);
    
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabType) {
            tab.classList.add('active');
        }
    });
    
    if (tabType === 'visual') {
        visualEditor.style.display = 'block';
        codeEditor.style.display = 'none';
        // Sincronizar desde código a visual
        visualEditor.innerHTML = codeEditor.value;
    } else {
        visualEditor.style.display = 'none';
        codeEditor.style.display = 'block';
        // Sincronizar desde visual a código
        codeEditor.value = visualEditor.innerHTML;
    }
}

function syncEditorContent(editorName) {
    const visualEditor = document.getElementById(`${editorName}-visual`);
    const codeEditor = document.getElementById(`${editorName}-code`);
    
    if (codeEditor.style.display !== 'none') {
        codeEditor.value = visualEditor.innerHTML;
    }
}

function syncEditorContentFromCode(editorName) {
    const visualEditor = document.getElementById(`${editorName}-visual`);
    const codeEditor = document.getElementById(`${editorName}-code`);
    
    if (visualEditor.style.display !== 'none') {
        visualEditor.innerHTML = codeEditor.value;
    }
}

function getEditorContent(editorName) {
    const visualEditor = document.getElementById(`${editorName}-visual`);
    const codeEditor = document.getElementById(`${editorName}-code`);
    
    // Si está en modo código, usar el código, sino usar el visual
    if (codeEditor.style.display !== 'none') {
        return codeEditor.value;
    } else {
        return visualEditor.innerHTML;
    }
}

function setEditorContent(editorName, content) {
    const visualEditor = document.getElementById(`${editorName}-visual`);
    const codeEditor = document.getElementById(`${editorName}-code`);
    
    // Limpiar HTML vacío
    if (!content || content.trim() === '') {
        visualEditor.innerHTML = '';
        codeEditor.value = '';
        return;
    }
    
    visualEditor.innerHTML = content;
    codeEditor.value = content;
}

// ========== REPORTES ==========

function resetReportDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    
    document.getElementById('report-date-from').value = formatDateForInput(firstDay);
    document.getElementById('report-date-to').value = formatDateForInput(today);
    
    loadReports();
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

async function loadReports() {
    try {
        let dateFrom = document.getElementById('report-date-from').value;
        let dateTo = document.getElementById('report-date-to').value;
        
        // Si no hay fechas, inicializar con año actual
        if (!dateFrom || !dateTo) {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), 0, 1);
            dateFrom = formatDateForInput(firstDay);
            dateTo = formatDateForInput(today);
            document.getElementById('report-date-from').value = dateFrom;
            document.getElementById('report-date-to').value = dateTo;
        }
        
        // Actualizar período mostrado
        const periodText = `Período: ${formatDateForDisplay(dateFrom)} a ${formatDateForDisplay(dateTo)}`;
        document.getElementById('report-period').textContent = periodText;
        
        // Obtener todos los pedidos del período
        const allOrders = await getAllOrdersInPeriod(dateFrom, dateTo);
        
        // Calcular métricas
        const metrics = calculateMetrics(allOrders);
        
        // Actualizar KPIs
        updateKPIs(metrics);
        
        // Actualizar gráfico de estados
        updateOrderStatusChart(metrics.orderStatusCount, metrics.totalOrders);
        
        // Actualizar productos más vendidos
        updateTopProducts(metrics.topProducts);
        
    } catch (error) {
        console.error('Error cargando reportes:', error);
        showToast('Error cargando reportes: ' + error.message, 'error');
    }
}

async function getAllOrdersInPeriod(dateFrom, dateTo) {
    const allOrders = [];
    let page = 1;
    let hasMore = true;
    
    // Convertir fechas a formato ISO
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    while (hasMore) {
        try {
            const orders = await wcAPI.getOrders({
                page: page,
                per_page: 100,
                orderby: 'date',
                order: 'desc'
            });
            
            if (orders.length === 0) {
                hasMore = false;
                break;
            }
            
            // Filtrar por fecha
            orders.forEach(order => {
                const orderDate = new Date(order.date_created);
                if (orderDate >= fromDate && orderDate <= toDate) {
                    allOrders.push(order);
                } else if (orderDate < fromDate) {
                    // Si la fecha es anterior al rango, no hay más pedidos
                    hasMore = false;
                }
            });
            
            if (orders.length < 100) {
                hasMore = false;
            } else {
                page++;
            }
        } catch (error) {
            console.error('Error obteniendo pedidos:', error);
            hasMore = false;
        }
    }
    
    return allOrders;
}

function calculateMetrics(orders) {
    const metrics = {
        totalSales: 0,
        totalOrders: orders.length,
        uniqueCustomers: new Set(),
        productsSold: 0,
        uniqueProducts: new Set(),
        orderStatusCount: {},
        topProducts: {}
    };
    
    orders.forEach(order => {
        // Ventas totales (solo pedidos completados, procesando, o en espera)
        if (['completed', 'processing', 'on-hold'].includes(order.status)) {
            metrics.totalSales += parseFloat(order.total || 0);
        }
        
        // Clientes únicos
        if (order.billing && order.billing.email) {
            metrics.uniqueCustomers.add(order.billing.email.toLowerCase());
        }
        
        // Estados de pedidos
        metrics.orderStatusCount[order.status] = (metrics.orderStatusCount[order.status] || 0) + 1;
        
        // Productos vendidos
        if (order.line_items) {
            order.line_items.forEach(item => {
                const productId = item.product_id;
                const quantity = parseInt(item.quantity || 0);
                const total = parseFloat(item.total || 0);
                
                metrics.productsSold += quantity;
                metrics.uniqueProducts.add(productId);
                
                // Top productos
                if (!metrics.topProducts[productId]) {
                    metrics.topProducts[productId] = {
                        id: productId,
                        name: item.name,
                        quantity: 0,
                        revenue: 0
                    };
                }
                metrics.topProducts[productId].quantity += quantity;
                metrics.topProducts[productId].revenue += total;
            });
        }
    });
    
    // Convertir Set a número
    metrics.uniqueCustomers = metrics.uniqueCustomers.size;
    metrics.uniqueProducts = metrics.uniqueProducts.size;
    
    // Calcular ticket promedio
    metrics.avgTicket = metrics.totalOrders > 0 
        ? metrics.totalSales / metrics.totalOrders 
        : 0;
    
    // Ordenar productos más vendidos
    metrics.topProducts = Object.values(metrics.topProducts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    
    return metrics;
}

function updateKPIs(metrics) {
    document.getElementById('kpi-total-sales').textContent = formatPrice(metrics.totalSales);
    document.getElementById('kpi-total-orders').textContent = metrics.totalOrders;
    document.getElementById('kpi-avg-ticket').textContent = formatPrice(metrics.avgTicket);
    document.getElementById('kpi-unique-customers').textContent = metrics.uniqueCustomers;
    document.getElementById('kpi-products-sold').textContent = metrics.productsSold;
    document.getElementById('kpi-unique-products').textContent = metrics.uniqueProducts;
}

function updateOrderStatusChart(statusCount, totalOrders) {
    const chartContainer = document.getElementById('order-status-chart');
    
    const statusLabels = {
        'processing': 'Procesando',
        'pending': 'En espera',
        'on-hold': 'En espera',
        'completed': 'Completado',
        'cancelled': 'Cancelado',
        'refunded': 'Reembolsado',
        'failed': 'Fallido'
    };
    
    const statusColors = {
        'processing': 'status-bar-processing',
        'pending': 'status-bar-pending',
        'on-hold': 'status-bar-on-hold',
        'completed': 'status-bar-completed',
        'cancelled': 'status-bar-cancelled',
        'refunded': 'status-bar-refunded',
        'failed': 'status-bar-failed'
    };
    
    // Ordenar por cantidad
    const sortedStatuses = Object.entries(statusCount)
        .sort((a, b) => b[1] - a[1]);
    
    chartContainer.innerHTML = sortedStatuses.map(([status, count]) => {
        const percentage = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(1) : 0;
        const label = statusLabels[status] || status;
        const colorClass = statusColors[status] || 'status-bar-processing';
        
        return `
            <div class="status-bar-item">
                <div class="status-bar-label">${label}</div>
                <div class="status-bar-container">
                    <div class="status-bar-fill ${colorClass}" style="width: ${percentage}%">
                        ${count} (${percentage}%)
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateTopProducts(topProducts) {
    const tbody = document.getElementById('top-products-tbody');
    
    if (topProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No se encontraron productos vendidos en este período</td></tr>';
        return;
    }
    
    tbody.innerHTML = topProducts.map((product, index) => {
        return `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${escapeHtml(product.name)}</td>
                <td><strong>${product.quantity}</strong></td>
                <td><strong>${formatPrice(product.revenue)}</strong></td>
            </tr>
        `;
    }).join('');
}

// Funciones globales para onclick
// ========== CONFIGURACIÓN ==========

async function loadSettings() {
    const loadingEl = document.getElementById('settings-loading');
    const contentEl = document.getElementById('settings-tab-content');
    
    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    
    // Configurar event listeners del menú lateral
    setupSettingsMenuListeners();
    
    // Cargar General por defecto
    await loadSettingsGroup('general');
}

function setupSettingsMenuListeners() {
    // Event listeners para el menú lateral principal
    document.querySelectorAll('.settings-menu-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const groupId = e.currentTarget.dataset.group;
            
            // Actualizar activo en menú lateral
            document.querySelectorAll('.settings-menu-header').forEach(h => h.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Cargar el grupo
            loadSettingsGroup(groupId);
        });
    });
}

async function loadSettingsGroup(group, section = '') {
    const loadingEl = document.getElementById('settings-loading');
    const contentEl = document.getElementById('settings-tab-content');
    const submenuEl = document.getElementById('settings-submenu');
    
    try {
        // Para productos, definir subsecciones manualmente
        if (group === 'products') {
            const productSections = ['general', 'inventory', 'downloadable', 'advanced'];
            buildSubmenu(group, productSections, section || 'general');
            submenuEl.style.display = 'block';
            section = section || 'general';
        } else if (group === 'general') {
            // General no tiene subsecciones por ahora
            submenuEl.style.display = 'none';
        }
        
        // Obtener ajustes de la sección específica
        let sectionSettings;
        try {
            sectionSettings = await wcAPI.getSettings(group, section);
        } catch (e) {
            // Si falla, intentar sin sección
            sectionSettings = await wcAPI.getSettings(group);
        }
        
        console.log(`Ajustes cargados para ${group}${section ? '/' + section : ''}:`, sectionSettings);
        
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
        
        // Renderizar ajustes
        renderSettings(group, sectionSettings, section);
    } catch (error) {
        console.error(`Error cargando ajustes de ${group}${section ? '/' + section : ''}:`, error);
        loadingEl.innerHTML = `<div style="color: var(--danger-color);">Error cargando ajustes: ${error.message}</div>`;
        throw error;
    }
}

function detectSections(settings) {
    const sections = new Set();
    
    if (Array.isArray(settings)) {
        settings.forEach(setting => {
            if (setting.subsection) {
                sections.add(setting.subsection);
            } else if (setting.section) {
                sections.add(setting.section);
            }
        });
    } else if (typeof settings === 'object') {
        // Si es un objeto, puede tener secciones como propiedades
        Object.keys(settings).forEach(key => {
            if (key !== 'id' && key !== 'label' && key !== 'description') {
                sections.add(key);
            }
        });
    }
    
    // Si no hay subsecciones, retornar array vacío (se mostrará todo junto)
    return Array.from(sections).length > 0 ? Array.from(sections) : [''];
}

function buildSubmenu(group, sections, activeSection) {
    const submenuEl = document.getElementById('settings-submenu');
    
    let html = '<div class="settings-submenu-items">';
    
    sections.forEach((section, index) => {
        const sectionLabel = formatSectionLabel(section);
        const isActive = section === activeSection;
        
        html += `<button type="button" class="settings-submenu-item ${isActive ? 'active' : ''}" data-group="${group}" data-section="${section}">${sectionLabel}</button>`;
        
        if (index < sections.length - 1) {
            html += `<span class="settings-submenu-separator">|</span>`;
        }
    });
    
    html += '</div>';
    submenuEl.innerHTML = html;
    
    // Agregar event listeners
    document.querySelectorAll('.settings-submenu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const groupId = e.target.dataset.group;
            const sectionId = e.target.dataset.section;
            
            // Actualizar activo
            document.querySelectorAll('.settings-submenu-item').forEach(i => i.classList.remove('active'));
            e.target.classList.add('active');
            
            // Cargar la sección
            loadSettingsGroup(groupId, sectionId);
        });
    });
}

function formatSectionLabel(section) {
    const labels = {
        'general': 'General',
        'inventory': 'Inventario',
        'downloadable': 'Productos descargables',
        'advanced': 'Avanzado'
    };
    
    if (labels[section]) {
        return labels[section];
    }
    
    if (!section) return 'General';
    return section
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function renderSettings(group, settings, section = '') {
    const contentEl = document.getElementById('settings-tab-content');
    
    if (!settings || (Array.isArray(settings) && settings.length === 0)) {
        contentEl.innerHTML = '<div class="settings-message">No hay ajustes disponibles para este grupo.</div>';
        return;
    }
    
    // Si settings es un objeto con subsecciones, procesarlo diferente
    if (typeof settings === 'object' && !Array.isArray(settings)) {
        // Puede ser un objeto con secciones
        if (settings.sections) {
            let html = '';
            Object.entries(settings.sections).forEach(([sectionName, sectionSettings]) => {
                html += `<div class="settings-section">`;
                html += `<h3 class="settings-section-title">${sectionName}</h3>`;
                
                if (Array.isArray(sectionSettings)) {
                    sectionSettings.forEach(setting => {
                        html += renderSettingField(setting, group, section);
                    });
                }
                
                html += `</div>`;
            });
            contentEl.innerHTML = html;
        } else {
            // Es un objeto plano, tratar como array
            settings = Object.values(settings);
        }
    }
    
    // Si es un array, procesar normalmente
    if (Array.isArray(settings)) {
        // Para productos > general, agrupar por categorías específicas
        if (group === 'products' && section === 'general') {
            contentEl.innerHTML = renderProductsGeneralSettings(settings, group, section);
        } else {
            // Agrupar por subsecciones si tienen 'section' o 'subsection'
            const sections = {};
            settings.forEach(setting => {
                const sectionKey = setting.subsection || setting.section || 'general';
                if (!sections[sectionKey]) {
                    sections[sectionKey] = [];
                }
                sections[sectionKey].push(setting);
            });
            
            let html = '';
            Object.entries(sections).forEach(([sectionName, sectionSettings]) => {
                if (sectionName !== 'general' || Object.keys(sections).length === 1) {
                    html += `<div class="settings-section">`;
                    if (sectionName !== 'general') {
                        html += `<h3 class="settings-section-title">${sectionName.charAt(0).toUpperCase() + sectionName.slice(1).replace(/_/g, ' ')}</h3>`;
                    }
                    
                    sectionSettings.forEach(setting => {
                        html += renderSettingField(setting, group, section);
                    });
                    
                    html += `</div>`;
                }
            });
            
            contentEl.innerHTML = html;
        }
    }
    
    // Agregar event listeners a los campos
    attachSettingsListeners(group, section);
}

function renderProductsGeneralSettings(settings, group, section) {
    // Organizar ajustes por categorías específicas
    const categories = {
        'shop_pages': [],
        'add_to_cart': [],
        'placeholder': [],
        'measurements': [],
        'reviews_enable': [],
        'reviews_other': [],
        'ratings': []
    };
    
    // Mapear ajustes a categorías basado en el ID exacto
    settings.forEach(setting => {
        const id = (setting.id || '').toLowerCase();
        
        if (id === 'woocommerce_shop_page' || id === 'shop_page') {
            categories.shop_pages.push(setting);
        } else if (id === 'woocommerce_cart_redirect_after_add' || id === 'cart_redirect_after_add') {
            categories.add_to_cart.push(setting);
        } else if (id === 'woocommerce_enable_ajax_add_to_cart' || id === 'enable_ajax_add_to_cart') {
            categories.add_to_cart.push(setting);
        } else if (id.includes('placeholder') || id === 'woocommerce_placeholder_image') {
            categories.placeholder.push(setting);
        } else if (id.includes('weight_unit') || id === 'woocommerce_weight_unit') {
            categories.measurements.push(setting);
        } else if (id.includes('dimension_unit') || id === 'woocommerce_dimension_unit') {
            categories.measurements.push(setting);
        } else if (id.includes('enable_reviews') || id === 'woocommerce_enable_reviews') {
            categories.reviews_enable.push(setting);
        } else if (id.includes('review_rating_required') || id === 'woocommerce_review_rating_required') {
            categories.reviews_other.push(setting);
        } else if (id.includes('show_verified') || id.includes('verified_owner')) {
            categories.reviews_other.push(setting);
        } else if (id.includes('review_rating') && !id.includes('required')) {
            categories.ratings.push(setting);
        } else if (id.includes('enable_rating') || id === 'woocommerce_enable_product_review_rating') {
            categories.ratings.push(setting);
        } else {
            // Si no coincide, intentar detectar por nombre
            const label = (setting.label || '').toLowerCase();
            if (label.includes('shop page')) {
                categories.shop_pages.push(setting);
            } else if (label.includes('cart') || label.includes('add to cart')) {
                categories.add_to_cart.push(setting);
            } else if (label.includes('placeholder')) {
                categories.placeholder.push(setting);
            } else if (label.includes('weight') || label.includes('dimension')) {
                categories.measurements.push(setting);
            } else if (label.includes('review') && !label.includes('rating')) {
                if (label.includes('enable')) {
                    categories.reviews_enable.push(setting);
                } else {
                    categories.reviews_other.push(setting);
                }
            } else if (label.includes('rating')) {
                categories.ratings.push(setting);
            }
        }
    });
    
    let html = '';
    
    // Shop pages
    if (categories.shop_pages.length > 0) {
        html += `<div class="settings-section">`;
        html += `<h3 class="settings-section-title">Shop pages</h3>`;
        categories.shop_pages.forEach(setting => {
            html += renderSettingField(setting, group, section);
        });
        html += `</div>`;
    }
    
    // Add to cart behaviour
    if (categories.add_to_cart.length > 0) {
        html += `<div class="settings-section">`;
        html += `<h3 class="settings-section-title">Add to cart behaviour</h3>`;
        categories.add_to_cart.forEach(setting => {
            html += renderSettingField(setting, group, section);
        });
        html += `</div>`;
    }
    
    // Placeholder image
    if (categories.placeholder.length > 0) {
        html += `<div class="settings-section">`;
        html += `<h3 class="settings-section-title">Placeholder image</h3>`;
        categories.placeholder.forEach(setting => {
            html += renderSettingField(setting, group, section);
        });
        html += `</div>`;
    }
    
    // Measurements
    if (categories.measurements.length > 0) {
        html += `<div class="settings-section">`;
        html += `<h3 class="settings-section-title">Measurements</h3>`;
        categories.measurements.forEach(setting => {
            html += renderSettingField(setting, group, section);
        });
        html += `</div>`;
    }
    
    // Reviews
    if (categories.reviews_enable.length > 0 || categories.reviews_other.length > 0) {
        html += `<div class="settings-section">`;
        html += `<h3 class="settings-section-title">Reviews</h3>`;
        
        // Subsección "Enable reviews"
        if (categories.reviews_enable.length > 0) {
            html += `<div class="settings-subsection">`;
            html += `<h4 class="settings-subsection-title">Enable reviews</h4>`;
            categories.reviews_enable.forEach(setting => {
                html += renderSettingField(setting, group, section);
            });
            html += `</div>`;
        }
        
        // Otros ajustes de reviews
        if (categories.reviews_other.length > 0) {
            categories.reviews_other.forEach(setting => {
                html += renderSettingField(setting, group, section);
            });
        }
        
        html += `</div>`;
    }
    
    // Product ratings
    if (categories.ratings.length > 0) {
        html += `<div class="settings-section">`;
        html += `<h3 class="settings-section-title">Product ratings</h3>`;
        categories.ratings.forEach(setting => {
            html += renderSettingField(setting, group, section);
        });
        html += `</div>`;
    }
    
    // Botón de guardar
    html += `<div class="settings-actions">`;
    html += `<button type="button" id="save-settings-btn" class="btn btn-primary">Guardar cambios</button>`;
    html += `</div>`;
    
    return html;
}

function renderSettingField(setting, group, section = '') {
    const settingGroup = setting.group_id || group;
    const fieldId = `setting-${settingGroup}-${setting.id}`;
    let fieldHtml = '';
    
    // Para checkboxes, usar fieldset
    if (setting.type === 'checkbox') {
        const isChecked = setting.value === 'yes' || setting.value === '1' || setting.value === true || setting.value === 1 || (setting.default === 'yes' && !setting.value) || (setting.default === '1' && !setting.value);
        const originalValue = (setting.value === 'yes' || setting.value === '1' || setting.value === true || setting.value === 1) ? '1' : '';
        
        fieldHtml += `<fieldset class="settings-fieldset">`;
        fieldHtml += `<label class="checkbox-label" for="${fieldId}">`;
        fieldHtml += `<input type="checkbox" id="${fieldId}" name="${setting.id}" class="setting-field" data-group="${settingGroup}" data-id="${setting.id}" data-section="${section}" data-original-value="${originalValue}" value="1" ${isChecked ? 'checked' : ''}>`;
        fieldHtml += ` ${setting.label || setting.id}`;
        fieldHtml += `</label>`;
        fieldHtml += `</fieldset>`;
        
        if (setting.description) {
            fieldHtml += `<small style="display: block; color: var(--text-secondary); margin-top: 5px; margin-left: 28px;">${setting.description}</small>`;
        }
    } else {
        fieldHtml += `<div class="form-group">`;
        fieldHtml += `<label for="${fieldId}">${setting.label || setting.id}</label>`;
        
        if (setting.description) {
            fieldHtml += `<small style="display: block; color: var(--text-secondary); margin-bottom: 8px;">${setting.description}</small>`;
        }
        
        const originalValue = setting.value || setting.default || '';
        
        switch (setting.type) {
            case 'select':
                fieldHtml += `<select id="${fieldId}" class="setting-field" data-group="${settingGroup}" data-id="${setting.id}" data-section="${section}" data-original-value="${originalValue}">`;
                if (setting.options) {
                    Object.entries(setting.options).forEach(([value, label]) => {
                        const selected = setting.value === value || (setting.default === value && !setting.value) ? 'selected' : '';
                        fieldHtml += `<option value="${value}" ${selected}>${label}</option>`;
                    });
                }
                fieldHtml += `</select>`;
                break;
                
            case 'number':
                fieldHtml += `<input type="number" id="${fieldId}" class="setting-field" data-group="${settingGroup}" data-id="${setting.id}" data-section="${section}" data-original-value="${originalValue}" value="${originalValue}" step="${setting.step || 1}" min="${setting.min || ''}" max="${setting.max || ''}">`;
                break;
                
            case 'email':
                fieldHtml += `<input type="email" id="${fieldId}" class="setting-field" data-group="${settingGroup}" data-id="${setting.id}" data-section="${section}" data-original-value="${originalValue}" value="${originalValue}">`;
                break;
                
            case 'textarea':
                fieldHtml += `<textarea id="${fieldId}" class="setting-field" data-group="${settingGroup}" data-id="${setting.id}" data-section="${section}" data-original-value="${originalValue}" rows="4">${originalValue}</textarea>`;
                break;
                
            default:
                fieldHtml += `<input type="text" id="${fieldId}" class="setting-field" data-group="${settingGroup}" data-id="${setting.id}" data-section="${section}" data-original-value="${originalValue}" value="${originalValue}">`;
        }
        
        fieldHtml += `</div>`;
    }
    
    return fieldHtml;
}

function attachSettingsListeners(group, section = '') {
    // Listener para guardar todos los cambios
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveAllSettings(group, section);
        });
    }
    
    // Los campos individuales ya no guardan automáticamente, solo cuando se hace clic en "Guardar cambios"
}

async function saveAllSettings(group, section = '') {
    const saveBtn = document.getElementById('save-settings-btn');
    const originalText = saveBtn.textContent;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';
    
    const fields = document.querySelectorAll('.setting-field');
    const updates = [];
    const errors = [];
    
    for (const field of fields) {
        const settingGroup = field.dataset.group;
        const settingId = field.dataset.id;
        const settingSection = field.dataset.section || section;
        let value = field.value;
        
        // Para checkboxes, usar "1" o "" según WooCommerce
        if (field.type === 'checkbox') {
            value = field.checked ? '1' : '';
        }
        
        // Solo actualizar si el valor cambió
        const originalValue = field.dataset.originalValue || (field.type === 'checkbox' ? (field.checked ? '1' : '') : field.value);
        if (value !== originalValue) {
            try {
                await wcAPI.updateSetting(settingGroup, settingId, value, settingSection);
                updates.push(settingId);
                // Guardar nuevo valor como original
                field.dataset.originalValue = value;
            } catch (error) {
                console.error(`Error guardando ${settingId}:`, error);
                errors.push({ id: settingId, error: error.message });
            }
        }
    }
    
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    
    if (errors.length > 0) {
        showToast(`Error guardando algunos ajustes: ${errors.map(e => e.id).join(', ')}`, 'error');
    } else if (updates.length > 0) {
        showToast(`${updates.length} ajuste(s) guardado(s) exitosamente`, 'success');
    } else {
        showToast('No hay cambios para guardar', 'success');
    }
}

// Funciones globales para onclick
window.editProduct = editProduct;
window.viewProduct = viewProduct;
window.viewProductFromRow = viewProductFromRow;
window.changeOrderStatus = changeOrderStatus;
// ========== ENVÍOS ==========

async function loadShippingZones() {
    const loadingEl = document.getElementById('shipping-loading');
    const zonesListEl = document.getElementById('shipping-zones-list');
    
    if (!loadingEl || !zonesListEl) {
        console.error('Elementos de envíos no encontrados en el DOM');
        return;
    }
    
    loadingEl.style.display = 'block';
    zonesListEl.style.display = 'none';
    loadingEl.innerHTML = 'Cargando zonas de envío...';
    
    try {
        console.log('Obteniendo zonas de envío...');
        const zones = await wcAPI.getShippingZones();
        console.log('Zonas de envío recibidas:', zones);
        
        loadingEl.style.display = 'none';
        zonesListEl.style.display = 'block';
        
        if (!zones || zones.length === 0) {
            zonesListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <p>No hay zonas de envío configuradas.</p>
                    <p>Haz clic en "Añadir zona de envío" para crear una.</p>
                </div>
            `;
            return;
        }
        
        // Renderizar zonas
        let html = '<div class="shipping-zones-container">';
        
        for (const zone of zones) {
            // Obtener métodos de envío para esta zona
            let methods = [];
            try {
                methods = await wcAPI.getShippingZoneMethods(zone.id);
                console.log(`Métodos para zona ${zone.id}:`, methods);
            } catch (error) {
                console.error(`Error obteniendo métodos para zona ${zone.id}:`, error);
            }
            
            html += renderShippingZone(zone, methods);
        }
        
        html += '</div>';
        zonesListEl.innerHTML = html;
        
    } catch (error) {
        console.error('Error cargando zonas de envío:', error);
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `<div style="color: var(--danger-color); padding: 20px;">Error cargando zonas de envío: ${error.message}<br><small>Verifica la consola para más detalles.</small></div>`;
        zonesListEl.style.display = 'none';
    }
    
    // Agregar event listeners (siempre, incluso si hay error)
    attachShippingZoneListeners();
}

function renderShippingZone(zone, methods) {
    const zoneName = zone.name || 'Zona sin nombre';
    const zoneLocations = zone.locations || [];
    const locationText = zoneLocations.length > 0 
        ? zoneLocations.map(loc => {
            if (loc.type === 'country') return loc.code;
            if (loc.type === 'state') return `${loc.code}`;
            if (loc.type === 'postcode') return `Código postal: ${loc.code}`;
            return loc.code;
        }).join(', ')
        : 'Todos los países';
    
    let methodsHtml = '';
    if (methods.length > 0) {
        methodsHtml = '<ul class="shipping-methods-list">';
        methods.forEach(method => {
            const methodTitle = method.settings?.title?.value || method.title || method.method_title || 'Método sin título';
            const methodEnabled = method.enabled === true || method.enabled === 'yes';
            methodsHtml += `
                <li class="shipping-method-item ${methodEnabled ? '' : 'disabled'}">
                    <span class="method-title">${methodTitle}</span>
                    <span class="method-actions">
                        <button class="btn-icon" onclick="editShippingMethod(${zone.id}, ${method.instance_id})" title="Editar">✏️</button>
                        <button class="btn-icon" onclick="deleteShippingMethod(${zone.id}, ${method.instance_id})" title="Eliminar">🗑️</button>
                    </span>
                </li>
            `;
        });
        methodsHtml += '</ul>';
    } else {
        methodsHtml = '<p class="no-methods">No hay métodos de envío configurados.</p>';
    }
    
    return `
        <div class="shipping-zone-card" data-zone-id="${zone.id}">
            <div class="shipping-zone-header">
                <div class="zone-info">
                    <h3 class="zone-name">${zoneName}</h3>
                    <p class="zone-locations">📍 ${locationText}</p>
                </div>
                <div class="zone-actions">
                    <button class="btn btn-secondary" onclick="editShippingZone(${zone.id})">Editar zona</button>
                    <button class="btn btn-secondary" onclick="addShippingMethod(${zone.id})">Añadir método</button>
                    <button class="btn btn-danger" onclick="deleteShippingZone(${zone.id})">Eliminar</button>
                </div>
            </div>
            <div class="shipping-zone-methods">
                <h4>Métodos de envío:</h4>
                ${methodsHtml}
            </div>
        </div>
    `;
}

function attachShippingZoneListeners() {
    // Listener para el botón "Añadir zona de envío"
    const addZoneBtn = document.getElementById('add-shipping-zone-btn');
    if (addZoneBtn) {
        addZoneBtn.onclick = () => {
            openShippingZoneModal();
        };
    }
    
    // Listener para el tipo de ubicación
    const locationTypeSelect = document.getElementById('zone-location-type');
    if (locationTypeSelect) {
        locationTypeSelect.addEventListener('change', handleLocationTypeChange);
    }
    
    // Listener para el formulario
    const zoneForm = document.getElementById('shipping-zone-form');
    if (zoneForm) {
        zoneForm.addEventListener('submit', handleShippingZoneSubmit);
    }
    
    // Listener para cerrar modal
    const modalClose = document.getElementById('shipping-zone-modal-close');
    const modalCancel = document.getElementById('shipping-zone-cancel-btn');
    const modal = document.getElementById('shipping-zone-modal');
    
    if (modalClose) {
        modalClose.onclick = () => closeShippingZoneModal();
    }
    if (modalCancel) {
        modalCancel.onclick = () => closeShippingZoneModal();
    }
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeShippingZoneModal();
            }
        };
    }
}

function handleLocationTypeChange() {
    const locationType = document.getElementById('zone-location-type').value;
    const container = document.getElementById('zone-locations-container');
    const label = document.getElementById('zone-locations-label');
    
    if (locationType === 'all') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        if (locationType === 'countries') {
            label.textContent = 'Países (códigos ISO, separados por comas)';
        } else if (locationType === 'states') {
            label.textContent = 'Estados/Provincias (formato: PAÍS:ESTADO, separados por comas)';
        } else if (locationType === 'postcodes') {
            label.textContent = 'Códigos postales (separados por comas)';
        }
    }
}

function openShippingZoneModal(zoneId = null) {
    const modal = document.getElementById('shipping-zone-modal');
    const title = document.getElementById('shipping-zone-modal-title');
    const form = document.getElementById('shipping-zone-form');
    const zoneNameInput = document.getElementById('zone-name');
    const locationTypeSelect = document.getElementById('zone-location-type');
    const locationsInput = document.getElementById('zone-locations');
    
    if (zoneId) {
        // Modo edición
        title.textContent = 'Editar Zona de Envío';
        form.dataset.zoneId = zoneId;
        loadZoneData(zoneId);
    } else {
        // Modo creación
        title.textContent = 'Nueva Zona de Envío';
        form.dataset.zoneId = '';
        zoneNameInput.value = '';
        locationTypeSelect.value = 'all';
        locationsInput.value = '';
        handleLocationTypeChange();
    }
    
    modal.classList.add('active');
}

async function loadZoneData(zoneId) {
    try {
        const zone = await wcAPI.getShippingZone(zoneId);
        const zoneNameInput = document.getElementById('zone-name');
        const locationTypeSelect = document.getElementById('zone-location-type');
        const locationsInput = document.getElementById('zone-locations');
        
        zoneNameInput.value = zone.name || '';
        
        if (!zone.locations || zone.locations.length === 0) {
            locationTypeSelect.value = 'all';
            locationsInput.value = '';
        } else {
            const firstLocation = zone.locations[0];
            if (firstLocation.type === 'country') {
                locationTypeSelect.value = 'countries';
                locationsInput.value = zone.locations.map(loc => loc.code).join(', ');
            } else if (firstLocation.type === 'state') {
                locationTypeSelect.value = 'states';
                locationsInput.value = zone.locations.map(loc => loc.code).join(', ');
            } else if (firstLocation.type === 'postcode') {
                locationTypeSelect.value = 'postcodes';
                locationsInput.value = zone.locations.map(loc => loc.code).join(', ');
            }
        }
        
        handleLocationTypeChange();
    } catch (error) {
        console.error('Error cargando datos de zona:', error);
        showToast('Error cargando datos de la zona', 'error');
    }
}

function closeShippingZoneModal() {
    const modal = document.getElementById('shipping-zone-modal');
    modal.classList.remove('active');
    const form = document.getElementById('shipping-zone-form');
    form.reset();
    form.dataset.zoneId = '';
}

async function handleShippingZoneSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('shipping-zone-form');
    const zoneId = form.dataset.zoneId;
    const zoneName = document.getElementById('zone-name').value.trim();
    const locationType = document.getElementById('zone-location-type').value;
    const locationsInput = document.getElementById('zone-locations').value.trim();
    
    if (!zoneName) {
        showToast('El nombre de la zona es requerido', 'error');
        return;
    }
    
    // Procesar ubicaciones
    let locations = [];
    if (locationType !== 'all' && locationsInput) {
        const locationCodes = locationsInput.split(',').map(code => code.trim()).filter(code => code);
        
        if (locationType === 'countries') {
            locations = locationCodes.map(code => ({
                code: code,
                type: 'country'
            }));
        } else if (locationType === 'states') {
            locations = locationCodes.map(code => ({
                code: code,
                type: 'state'
            }));
        } else if (locationType === 'postcodes') {
            locations = locationCodes.map(code => ({
                code: code,
                type: 'postcode'
            }));
        }
    }
    
    const zoneData = {
        name: zoneName,
        order: 0
    };
    
    if (locations.length > 0) {
        zoneData.locations = locations;
    }
    
    try {
        if (zoneId) {
            // Actualizar zona existente
            await wcAPI.updateShippingZone(zoneId, zoneData);
            showToast('Zona de envío actualizada', 'success');
        } else {
            // Crear nueva zona
            await wcAPI.createShippingZone(zoneData);
            showToast('Zona de envío creada', 'success');
        }
        
        closeShippingZoneModal();
        loadShippingZones();
    } catch (error) {
        console.error('Error guardando zona:', error);
        showToast('Error guardando zona de envío: ' + error.message, 'error');
    }
}

function editShippingZone(zoneId) {
    openShippingZoneModal(zoneId);
}

function addShippingMethod(zoneId) {
    // TODO: Implementar añadir método
    showToast('Función de añadir método próximamente', 'info');
}

function editShippingMethod(zoneId, methodId) {
    // TODO: Implementar edición de método
    showToast('Función de editar método próximamente', 'info');
}

async function deleteShippingZone(zoneId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta zona de envío?')) {
        return;
    }
    
    try {
        await wcAPI.deleteShippingZone(zoneId);
        showToast('Zona de envío eliminada', 'success');
        loadShippingZones();
    } catch (error) {
        console.error('Error eliminando zona:', error);
        showToast('Error eliminando zona de envío', 'error');
    }
}

async function deleteShippingMethod(zoneId, methodId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este método de envío?')) {
        return;
    }
    
    try {
        await wcAPI.deleteShippingZoneMethod(zoneId, methodId);
        showToast('Método de envío eliminado', 'success');
        loadShippingZones();
    } catch (error) {
        console.error('Error eliminando método:', error);
        showToast('Error eliminando método de envío', 'error');
    }
}

window.loadProducts = loadProducts;
window.loadOrders = loadOrders;
window.loadCustomers = loadCustomers;
window.removeImage = removeImage;
window.loadShippingZones = loadShippingZones;
window.editShippingZone = editShippingZone;
window.addShippingMethod = addShippingMethod;
window.editShippingMethod = editShippingMethod;
window.deleteShippingZone = deleteShippingZone;
window.deleteShippingMethod = deleteShippingMethod;

