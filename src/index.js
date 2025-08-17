import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services
import Database from './database/database.js';
import MemoryDatabase from './database/memoryDatabase.js';
import RestaurantChatbot from './services/langchain.js';
import WhatsAppService from './services/whatsapp.js';
import TelegramService from './services/telegram.js';
import OrderController from './controllers/orderController.js';
import QRCodeGenerator from './utils/qrGenerator.js';

// ES6 module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

class RestaurantChatbotApp {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        
        // Initialize services (use memory database for serverless)
        this.database = process.env.NODE_ENV === 'production' 
            ? new MemoryDatabase() 
            : new Database(process.env.DATABASE_PATH);
        this.chatbot = new RestaurantChatbot();
        this.orderController = new OrderController(this.database);
        this.qrGenerator = new QRCodeGenerator(`http://localhost:${this.port}`);
        
        this.whatsappService = null;
        this.telegramService = null;
        
        this.setupExpress();
        this.setupRoutes();
    }

    setupExpress() {
        // Middleware
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Serve static files
        this.app.use('/qr-codes', express.static('./qr-codes'));
        this.app.use('/public', express.static('./public'));
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                services: {
                    database: this.database ? 'connected' : 'disconnected',
                    whatsapp: this.whatsappService?.isClientReady() ? 'ready' : 'not ready',
                    telegram: this.telegramService?.isClientReady() ? 'ready' : 'not ready'
                }
            });
        });
    }

    setupRoutes() {
        // API Routes
        this.app.get('/api/menu', async (req, res) => {
            try {
                const menuItems = await this.database.getMenuItems();
                const categories = await this.database.getCategories();
                
                res.json({
                    success: true,
                    data: {
                        categories,
                        items: menuItems
                    }
                });
            } catch (error) {
                console.error('Error fetching menu:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error fetching menu'
                });
            }
        });

        this.app.get('/api/orders/today', async (req, res) => {
            try {
                const orders = await this.database.getTodaysOrders();
                res.json({
                    success: true,
                    data: orders
                });
            } catch (error) {
                console.error('Error fetching today orders:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error fetching orders'
                });
            }
        });

        this.app.get('/api/orders/:id', async (req, res) => {
            try {
                const orderId = req.params.id;
                const order = await this.database.getOrderById(orderId);
                
                if (!order) {
                    return res.status(404).json({
                        success: false,
                        error: 'Order not found'
                    });
                }
                
                const items = await this.database.getOrderItems(orderId);
                
                res.json({
                    success: true,
                    data: {
                        ...order,
                        items
                    }
                });
            } catch (error) {
                console.error('Error fetching order:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error fetching order'
                });
            }
        });

        this.app.put('/api/orders/:id/status', async (req, res) => {
            try {
                const orderId = req.params.id;
                const { status } = req.body;
                
                await this.database.updateOrderStatus(orderId, status);
                
                res.json({
                    success: true,
                    message: 'Order status updated successfully'
                });
            } catch (error) {
                console.error('Error updating order status:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error updating order status'
                });
            }
        });

        // QR Code generation routes
        this.app.get('/api/qr/table/:number', async (req, res) => {
            try {
                const tableNumber = parseInt(req.params.number);
                const platform = req.query.platform || 'whatsapp';
                
                const qrResult = await this.qrGenerator.generateTableQRCode(tableNumber, platform);
                
                res.json({
                    success: true,
                    data: qrResult
                });
            } catch (error) {
                console.error('Error generating QR code:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error generating QR code'
                });
            }
        });

        this.app.get('/api/qr/generate-all', async (req, res) => {
            try {
                const tableCount = parseInt(req.query.tables) || 10;
                const platforms = req.query.platforms ? req.query.platforms.split(',') : ['whatsapp'];
                
                const results = await this.qrGenerator.generateAllTableQRCodes(tableCount, platforms);
                
                res.json({
                    success: true,
                    data: results,
                    message: `Generated ${results.length} QR codes`
                });
            } catch (error) {
                console.error('Error generating QR codes:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error generating QR codes'
                });
            }
        });

        this.app.get('/api/qr/print/:platform', async (req, res) => {
            try {
                const platform = req.params.platform;
                const tables = req.query.tables ? req.query.tables.split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                
                const htmlPath = await this.qrGenerator.generatePrintableSheet(tables, platform);
                
                res.json({
                    success: true,
                    data: {
                        htmlPath,
                        downloadUrl: `/qr-codes/${path.basename(htmlPath)}`
                    }
                });
            } catch (error) {
                console.error('Error generating printable sheet:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error generating printable sheet'
                });
            }
        });

        // WhatsApp status route
        this.app.get('/api/whatsapp/status', (req, res) => {
            res.json({
                success: true,
                data: {
                    ready: this.whatsappService?.isClientReady() || false,
                    qrCode: this.whatsappService?.getQRCode() || null
                }
            });
        });

        // Admin dashboard route
        this.app.get('/admin', (req, res) => {
            res.send(this.generateAdminHTML());
        });

        // Root route
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Restaurant Chatbot API',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    menu: '/api/menu',
                    orders: '/api/orders/today',
                    qr_generator: '/api/qr/generate-all',
                    admin: '/admin',
                    whatsapp_status: '/api/whatsapp/status'
                },
                documentation: 'https://github.com/your-repo/restaurant-chatbot'
            });
        });
    }

    generateAdminHTML() {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Restaurant Chatbot</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .button:hover { background: #0056b3; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Restaurant Chatbot - Admin Panel</h1>
            <p>Painel de controle para o sistema de pedidos via WhatsApp/Telegram</p>
        </div>

        <div class="grid">
            <div class="section">
                <h3>📊 Status dos Serviços</h3>
                <div id="service-status">Carregando...</div>
                <button class="button" onclick="checkStatus()">Atualizar Status</button>
            </div>

            <div class="section">
                <h3>📱 WhatsApp</h3>
                <div id="whatsapp-status">Carregando...</div>
                <div id="qr-code"></div>
            </div>

            <div class="section">
                <h3>🍽️ Cardápio</h3>
                <button class="button" onclick="loadMenu()">Ver Cardápio</button>
                <div id="menu-data"></div>
            </div>

            <div class="section">
                <h3>📋 Pedidos de Hoje</h3>
                <button class="button" onclick="loadTodayOrders()">Carregar Pedidos</button>
                <div id="orders-data"></div>
            </div>

            <div class="section">
                <h3>📱 Gerar QR Codes</h3>
                <label>Quantidade de mesas: <input type="number" id="table-count" value="10" min="1" max="50"></label><br><br>
                <label>Plataforma: 
                    <select id="platform">
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telegram">Telegram</option>
                    </select>
                </label><br><br>
                <button class="button" onclick="generateQRCodes()">Gerar QR Codes</button>
                <button class="button" onclick="generatePrintSheet()">Gerar Folha para Impressão</button>
                <div id="qr-results"></div>
            </div>
        </div>
    </div>

    <script>
        async function checkStatus() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                document.getElementById('service-status').innerHTML = \`
                    <div class="status \${data.status === 'ok' ? 'success' : 'warning'}">
                        <strong>Sistema:</strong> \${data.status}<br>
                        <strong>Database:</strong> \${data.services.database}<br>
                        <strong>WhatsApp:</strong> \${data.services.whatsapp}<br>
                        <strong>Telegram:</strong> \${data.services.telegram}
                    </div>
                \`;
            } catch (error) {
                document.getElementById('service-status').innerHTML = '<div class="status warning">Erro ao verificar status</div>';
            }
        }

        async function checkWhatsAppStatus() {
            try {
                const response = await fetch('/api/whatsapp/status');
                const data = await response.json();
                
                let statusHTML = \`<div class="status \${data.data.ready ? 'success' : 'warning'}">
                    <strong>Status:</strong> \${data.data.ready ? 'Conectado' : 'Desconectado'}
                </div>\`;
                
                if (data.data.qrCode) {
                    statusHTML += '<p>Escaneie o QR Code abaixo com WhatsApp:</p>';
                    document.getElementById('qr-code').innerHTML = \`<img src="data:image/png;base64,\${data.data.qrCode}" style="max-width: 300px;">\`;
                } else {
                    document.getElementById('qr-code').innerHTML = '';
                }
                
                document.getElementById('whatsapp-status').innerHTML = statusHTML;
            } catch (error) {
                document.getElementById('whatsapp-status').innerHTML = '<div class="status warning">Erro ao verificar WhatsApp</div>';
            }
        }

        async function loadMenu() {
            try {
                const response = await fetch('/api/menu');
                const data = await response.json();
                
                if (data.success) {
                    let menuHTML = '<h4>Categorias e Itens:</h4>';
                    data.data.categories.forEach(category => {
                        const categoryItems = data.data.items.filter(item => item.category_id === category.id);
                        menuHTML += \`<h5>\${category.name} (\${categoryItems.length} itens)</h5>\`;
                    });
                    document.getElementById('menu-data').innerHTML = menuHTML;
                }
            } catch (error) {
                document.getElementById('menu-data').innerHTML = '<div class="status warning">Erro ao carregar cardápio</div>';
            }
        }

        async function loadTodayOrders() {
            try {
                const response = await fetch('/api/orders/today');
                const data = await response.json();
                
                if (data.success) {
                    let ordersHTML = \`<h4>Total de pedidos hoje: \${data.data.length}</h4>\`;
                    data.data.forEach(order => {
                        ordersHTML += \`
                            <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0;">
                                <strong>Pedido #\${order.id}</strong> - \${order.status}<br>
                                Cliente: \${order.customer_name}<br>
                                Total: R$ \${order.total_amount}<br>
                                Plataforma: \${order.platform}
                            </div>
                        \`;
                    });
                    document.getElementById('orders-data').innerHTML = ordersHTML;
                }
            } catch (error) {
                document.getElementById('orders-data').innerHTML = '<div class="status warning">Erro ao carregar pedidos</div>';
            }
        }

        async function generateQRCodes() {
            const tableCount = document.getElementById('table-count').value;
            const platform = document.getElementById('platform').value;
            
            try {
                const response = await fetch(\`/api/qr/generate-all?tables=\${tableCount}&platforms=\${platform}\`);
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('qr-results').innerHTML = \`
                        <div class="status success">
                            \${data.message}<br>
                            QR Codes salvos em: ./qr-codes/
                        </div>
                    \`;
                }
            } catch (error) {
                document.getElementById('qr-results').innerHTML = '<div class="status warning">Erro ao gerar QR codes</div>';
            }
        }

        async function generatePrintSheet() {
            const tableCount = document.getElementById('table-count').value;
            const platform = document.getElementById('platform').value;
            const tables = Array.from({length: tableCount}, (_, i) => i + 1).join(',');
            
            try {
                const response = await fetch(\`/api/qr/print/\${platform}?tables=\${tables}\`);
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('qr-results').innerHTML = \`
                        <div class="status success">
                            Folha de impressão gerada!<br>
                            <a href="\${data.data.downloadUrl}" target="_blank" class="button">Abrir para Imprimir</a>
                        </div>
                    \`;
                }
            } catch (error) {
                document.getElementById('qr-results').innerHTML = '<div class="status warning">Erro ao gerar folha de impressão</div>';
            }
        }

        // Load initial data
        checkStatus();
        checkWhatsAppStatus();
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            checkStatus();
            checkWhatsAppStatus();
        }, 30000);
    </script>
</body>
</html>`;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Restaurant Chatbot System...');
            
            // Initialize database
            console.log('📊 Connecting to database...');
            await this.database.connect();
            await this.database.initialize();
            
            // Skip WhatsApp and Telegram in serverless production
            if (process.env.NODE_ENV !== 'production') {
                // Initialize WhatsApp service (skip in production if SKIP_WHATSAPP=true)
                if (process.env.SKIP_WHATSAPP !== 'true') {
                    console.log('📱 Initializing WhatsApp service...');
                    this.whatsappService = new WhatsAppService(this.chatbot, this.database);
                } else {
                    console.log('📱 Skipping WhatsApp service (SKIP_WHATSAPP=true)');
                }
                
                // Initialize Telegram service
                console.log('🤖 Initializing Telegram service...');
                this.telegramService = new TelegramService(this.chatbot, this.database);
                
                // Start services (don't wait for WhatsApp as it requires QR scan)
                const services = [];
                
                if (this.whatsappService) {
                    services.push(this.whatsappService.initialize().catch(err => console.log('WhatsApp init error:', err.message)));
                }
                
                if (this.telegramService) {
                    services.push(this.telegramService.initialize().catch(err => console.log('Telegram init error:', err.message)));
                }
                
                Promise.all(services);
            } else {
                console.log('🚀 Running in serverless production mode - skipping bot services');
            }
            
            console.log('✅ All services initialized successfully!');
            
        } catch (error) {
            console.error('❌ Error initializing services:', error);
            throw error;
        }
    }

    async start() {
        try {
            await this.initialize();
            
            this.app.listen(this.port, () => {
                console.log(`
🎉 Restaurant Chatbot Server is running!

📊 Admin Panel: http://localhost:${this.port}/admin
🔗 API Docs: http://localhost:${this.port}/
❤️  Health Check: http://localhost:${this.port}/health

📱 WhatsApp: Waiting for QR code scan
🤖 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'Ready' : 'Token not configured'}

`);
            });
            
            // Cleanup session periodically
            setInterval(() => {
                this.chatbot.cleanupOldSessions();
            }, 5 * 60 * 1000); // Every 5 minutes
            
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        console.log('🛑 Shutting down services...');
        
        if (this.whatsappService) {
            await this.whatsappService.destroy();
        }
        
        if (this.telegramService) {
            await this.telegramService.stop();
        }
        
        if (this.database) {
            await this.database.close();
        }
        
        console.log('✅ Shutdown complete');
    }
}

// Handle graceful shutdown
const app = new RestaurantChatbotApp();

process.on('SIGINT', async () => {
    await app.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await app.shutdown();
    process.exit(0);
});

// Start the application
app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});