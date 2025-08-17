// Memory-based database for serverless environments
class MemoryDatabase {
    constructor() {
        this.categories = [
            {id: 1, name: "Entradas", description: "Pratos para começar bem a refeição", sort_order: 1, active: 1},
            {id: 2, name: "Pratos Principais", description: "Nossos pratos principais deliciosos", sort_order: 2, active: 1},
            {id: 3, name: "Bebidas", description: "Bebidas refrescantes e quentes", sort_order: 3, active: 1},
            {id: 4, name: "Sobremesas", description: "Doces para finalizar com chave de ouro", sort_order: 4, active: 1}
        ];

        this.menuItems = [
            {id: 1, category_id: 1, name: "Bruschetta", description: "Pão italiano com tomate, manjericão e azeite", price: 18.90, available: 1, preparation_time: 10, category: "Entradas"},
            {id: 2, category_id: 1, name: "Bolinho de Bacalhau", description: "6 unidades com molho especial", price: 24.90, available: 1, preparation_time: 15, category: "Entradas"},
            {id: 3, category_id: 2, name: "Hambúrguer Artesanal", description: "Hambúrguer 180g, queijo, alface, tomate e batata", price: 32.90, available: 1, preparation_time: 20, category: "Pratos Principais"},
            {id: 4, category_id: 2, name: "Salmão Grelhado", description: "Salmão com legumes e arroz integral", price: 45.90, available: 1, preparation_time: 25, category: "Pratos Principais"},
            {id: 5, category_id: 2, name: "Risotto de Camarão", description: "Risotto cremoso com camarões frescos", price: 38.90, available: 1, preparation_time: 30, category: "Pratos Principais"},
            {id: 6, category_id: 3, name: "Coca-Cola 350ml", description: "Refrigerante gelado", price: 6.90, available: 1, preparation_time: 2, category: "Bebidas"},
            {id: 7, category_id: 3, name: "Suco Natural de Laranja", description: "Suco fresco 400ml", price: 8.90, available: 1, preparation_time: 5, category: "Bebidas"},
            {id: 8, category_id: 3, name: "Caipirinha", description: "Caipirinha tradicional", price: 14.90, available: 1, preparation_time: 5, category: "Bebidas"},
            {id: 9, category_id: 4, name: "Pudim de Leite", description: "Pudim caseiro com calda de caramelo", price: 12.90, available: 1, preparation_time: 5, category: "Sobremesas"},
            {id: 10, category_id: 4, name: "Petit Gateau", description: "Bolinho quente com sorvete de baunilha", price: 16.90, available: 1, preparation_time: 15, category: "Sobremesas"}
        ];

        this.orders = [];
        this.chatSessions = {};
        this.orderCounter = 1;
    }

    async connect() {
        console.log('Connected to Memory database (serverless mode)');
        return Promise.resolve();
    }

    async initialize() {
        console.log('Memory database initialized successfully');
        return Promise.resolve();
    }

    async query(sql, params = []) {
        // Simple query simulation for basic operations
        return Promise.resolve([]);
    }

    async run(sql, params = []) {
        return Promise.resolve({ lastID: this.orderCounter++, changes: 1 });
    }

    async getMenuItems() {
        return Promise.resolve(this.menuItems);
    }

    async getCategories() {
        return Promise.resolve(this.categories);
    }

    async getMenuItemById(id) {
        const item = this.menuItems.find(item => item.id == id && item.available);
        return Promise.resolve(item || null);
    }

    async searchMenuItems(searchTerm) {
        const items = this.menuItems.filter(item => 
            (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             item.description.toLowerCase().includes(searchTerm.toLowerCase())) && 
            item.available
        );
        return Promise.resolve(items);
    }

    async getTableById(id) {
        return Promise.resolve({ id, table_number: id, capacity: 4, active: 1 });
    }

    async getTableByNumber(tableNumber) {
        return Promise.resolve({ id: tableNumber, table_number: tableNumber, capacity: 4, active: 1 });
    }

    async createOrder(orderData) {
        const order = {
            id: this.orderCounter++,
            ...orderData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.orders.push(order);
        return Promise.resolve({ lastID: order.id, changes: 1 });
    }

    async addOrderItem(orderItemData) {
        return Promise.resolve({ lastID: this.orderCounter++, changes: 1 });
    }

    async getOrderById(id) {
        const order = this.orders.find(order => order.id == id);
        return Promise.resolve(order || null);
    }

    async getOrderItems(orderId) {
        // Mock order items
        return Promise.resolve([]);
    }

    async updateOrderStatus(orderId, status) {
        const order = this.orders.find(order => order.id == orderId);
        if (order) {
            order.status = status;
            order.updated_at = new Date().toISOString();
        }
        return Promise.resolve({ lastID: orderId, changes: 1 });
    }

    async updatePaymentStatus(orderId, paymentStatus, paymentMethod = null) {
        const order = this.orders.find(order => order.id == orderId);
        if (order) {
            order.payment_status = paymentStatus;
            order.payment_method = paymentMethod;
            order.updated_at = new Date().toISOString();
        }
        return Promise.resolve({ lastID: orderId, changes: 1 });
    }

    async createOrUpdateChatSession(sessionData) {
        this.chatSessions[sessionData.chat_id] = {
            ...sessionData,
            last_activity: new Date().toISOString()
        };
        return Promise.resolve({ lastID: 1, changes: 1 });
    }

    async getChatSession(chatId) {
        return Promise.resolve(this.chatSessions[chatId] || null);
    }

    async getOrdersByDateRange(startDate, endDate) {
        const filtered = this.orders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
        });
        return Promise.resolve(filtered);
    }

    async getTodaysOrders() {
        const today = new Date().toISOString().split('T')[0];
        return this.getOrdersByDateRange(today + ' 00:00:00', today + ' 23:59:59');
    }

    async close() {
        console.log('Memory database connection closed');
        return Promise.resolve();
    }
}

export default MemoryDatabase;