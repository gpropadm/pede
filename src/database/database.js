import sqlite3 from 'sqlite3';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
    constructor(dbPath = './src/database/restaurant.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async initialize() {
        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = await readFile(schemaPath, 'utf8');
            
            return new Promise((resolve, reject) => {
                this.db.exec(schema, (err) => {
                    if (err) {
                        console.error('Error initializing database:', err);
                        reject(err);
                    } else {
                        console.log('Database initialized successfully');
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Error reading schema file:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database query error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err);
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Menu operations
    async getMenuItems() {
        const query = `
            SELECT 
                mi.*,
                c.name as category
            FROM menu_items mi
            JOIN categories c ON mi.category_id = c.id
            WHERE mi.available = 1 AND c.active = 1
            ORDER BY c.sort_order, mi.sort_order, mi.name
        `;
        return this.query(query);
    }

    async getCategories() {
        const query = `
            SELECT * FROM categories 
            WHERE active = 1 
            ORDER BY sort_order, name
        `;
        return this.query(query);
    }

    async getMenuItemById(id) {
        const query = `
            SELECT 
                mi.*,
                c.name as category
            FROM menu_items mi
            JOIN categories c ON mi.category_id = c.id
            WHERE mi.id = ? AND mi.available = 1
        `;
        const result = await this.query(query, [id]);
        return result[0] || null;
    }

    async searchMenuItems(searchTerm) {
        const query = `
            SELECT 
                mi.*,
                c.name as category
            FROM menu_items mi
            JOIN categories c ON mi.category_id = c.id
            WHERE (mi.name LIKE ? OR mi.description LIKE ?) 
            AND mi.available = 1 AND c.active = 1
            ORDER BY mi.name
        `;
        const searchPattern = `%${searchTerm}%`;
        return this.query(query, [searchPattern, searchPattern]);
    }

    // Table operations
    async getTableById(id) {
        const query = 'SELECT * FROM tables WHERE id = ? AND active = 1';
        const result = await this.query(query, [id]);
        return result[0] || null;
    }

    async getTableByNumber(tableNumber) {
        const query = 'SELECT * FROM tables WHERE table_number = ? AND active = 1';
        const result = await this.query(query, [tableNumber]);
        return result[0] || null;
    }

    // Order operations
    async createOrder(orderData) {
        const query = `
            INSERT INTO orders (
                table_id, customer_phone, customer_name, platform, 
                chat_id, total_amount, special_instructions
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        return this.run(query, [
            orderData.table_id,
            orderData.customer_phone,
            orderData.customer_name,
            orderData.platform,
            orderData.chat_id,
            orderData.total_amount,
            orderData.special_instructions
        ]);
    }

    async addOrderItem(orderItemData) {
        const query = `
            INSERT INTO order_items (
                order_id, menu_item_id, quantity, unit_price, special_instructions
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        return this.run(query, [
            orderItemData.order_id,
            orderItemData.menu_item_id,
            orderItemData.quantity,
            orderItemData.unit_price,
            orderItemData.special_instructions
        ]);
    }

    async getOrderById(id) {
        const query = `
            SELECT 
                o.*,
                t.table_number
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            WHERE o.id = ?
        `;
        const result = await this.query(query, [id]);
        return result[0] || null;
    }

    async getOrderItems(orderId) {
        const query = `
            SELECT 
                oi.*,
                mi.name as item_name,
                mi.description as item_description
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.order_id = ?
        `;
        return this.query(query, [orderId]);
    }

    async updateOrderStatus(orderId, status) {
        const query = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        return this.run(query, [status, orderId]);
    }

    async updatePaymentStatus(orderId, paymentStatus, paymentMethod = null) {
        const query = `
            UPDATE orders 
            SET payment_status = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        return this.run(query, [paymentStatus, paymentMethod, orderId]);
    }

    // Chat session operations
    async createOrUpdateChatSession(sessionData) {
        const checkQuery = 'SELECT id FROM chat_sessions WHERE chat_id = ?';
        const existing = await this.query(checkQuery, [sessionData.chat_id]);

        if (existing.length > 0) {
            const updateQuery = `
                UPDATE chat_sessions 
                SET customer_phone = ?, customer_name = ?, table_id = ?, 
                    current_order_id = ?, session_data = ?, last_activity = CURRENT_TIMESTAMP
                WHERE chat_id = ?
            `;
            return this.run(updateQuery, [
                sessionData.customer_phone,
                sessionData.customer_name,
                sessionData.table_id,
                sessionData.current_order_id,
                JSON.stringify(sessionData.session_data),
                sessionData.chat_id
            ]);
        } else {
            const insertQuery = `
                INSERT INTO chat_sessions (
                    chat_id, platform, customer_phone, customer_name, 
                    table_id, current_order_id, session_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            return this.run(insertQuery, [
                sessionData.chat_id,
                sessionData.platform,
                sessionData.customer_phone,
                sessionData.customer_name,
                sessionData.table_id,
                sessionData.current_order_id,
                JSON.stringify(sessionData.session_data)
            ]);
        }
    }

    async getChatSession(chatId) {
        const query = 'SELECT * FROM chat_sessions WHERE chat_id = ?';
        const result = await this.query(query, [chatId]);
        if (result[0]) {
            result[0].session_data = JSON.parse(result[0].session_data || '{}');
        }
        return result[0] || null;
    }

    // Analytics and reporting
    async getOrdersByDateRange(startDate, endDate) {
        const query = `
            SELECT 
                o.*,
                t.table_number,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.created_at BETWEEN ? AND ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        return this.query(query, [startDate, endDate]);
    }

    async getTodaysOrders() {
        const today = new Date().toISOString().split('T')[0];
        return this.getOrdersByDateRange(today + ' 00:00:00', today + ' 23:59:59');
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

export default Database;