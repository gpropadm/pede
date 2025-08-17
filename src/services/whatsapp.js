import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';

class WhatsAppService {
    constructor(chatbot, database) {
        this.chatbot = chatbot;
        this.database = database;
        this.client = null;
        this.isReady = false;
        this.qrCodeData = null;
    }

    async initialize() {
        console.log('Initializing WhatsApp client...');
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-session'
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventListeners();
        
        try {
            await this.client.initialize();
        } catch (error) {
            console.error('Error initializing WhatsApp client:', error);
            throw error;
        }
    }

    setupEventListeners() {
        this.client.on('qr', (qr) => {
            console.log('QR Code received');
            this.qrCodeData = qr;
            this.generateQRCode(qr);
        });

        this.client.on('ready', () => {
            console.log('WhatsApp client is ready!');
            this.isReady = true;
            this.qrCodeData = null;
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp client authenticated');
        });

        this.client.on('auth_failure', (message) => {
            console.error('WhatsApp authentication failed:', message);
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp client disconnected:', reason);
            this.isReady = false;
        });

        this.client.on('message', async (message) => {
            try {
                await this.handleMessage(message);
            } catch (error) {
                console.error('Error handling WhatsApp message:', error);
            }
        });
    }

    async generateQRCode(qr) {
        try {
            const qrImagePath = './whatsapp-qr.png';
            await qrcode.toFile(qrImagePath, qr);
            console.log('QR Code saved to:', qrImagePath);
            console.log('Scan this QR code with WhatsApp to connect:');
            console.log(qr);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }

    async handleMessage(message) {
        // Skip messages from groups and status updates
        if (message.from.includes('@g.us') || message.from === 'status@broadcast') {
            return;
        }

        // Skip messages sent by the bot itself
        if (message.fromMe) {
            return;
        }

        const chatId = message.from;
        const messageText = message.body;
        const contact = await message.getContact();
        
        console.log(`Received message from ${contact.name || contact.number}: ${messageText}`);

        try {
            // Get menu items from database
            const menuItems = await this.database.getMenuItems();
            
            // Restaurant info
            const restaurantInfo = {
                name: process.env.RESTAURANT_NAME || 'Nosso Restaurante',
                phone: process.env.RESTAURANT_PHONE || '+55 11 99999-9999',
                address: process.env.RESTAURANT_ADDRESS || 'São Paulo, SP'
            };

            // Process message with LangChain
            const result = await this.chatbot.processMessage(
                chatId, 
                messageText, 
                menuItems, 
                restaurantInfo
            );

            // Update customer info in session
            if (contact.name || contact.number) {
                await this.chatbot.updateSession(chatId, {
                    customerInfo: {
                        ...result.session.customerInfo,
                        name: contact.name || contact.number,
                        phone: contact.number
                    }
                });
            }

            // Handle special actions based on analysis
            await this.handleSpecialActions(chatId, result.analysis, result.session);

            // Send response
            await this.sendMessage(chatId, result.response);

            // Save chat session to database
            await this.saveChatSession(chatId, result.session, contact);

        } catch (error) {
            console.error('Error processing WhatsApp message:', error);
            await this.sendMessage(chatId, 'Desculpe, ocorreu um erro. Pode tentar novamente?');
        }
    }

    async handleSpecialActions(chatId, analysis, session) {
        try {
            // Extract people count
            if (analysis.intent === 'table_size' && analysis.extractedData.peopleCount) {
                await this.chatbot.updateSession(chatId, {
                    customerInfo: {
                        ...session.customerInfo,
                        peopleCount: analysis.extractedData.peopleCount
                    },
                    stage: 'ordering'
                });
            }

            // Show payment options
            if (analysis.suggestedActions.includes('show_payment_options')) {
                const paymentMessage = this.formatPaymentOptions();
                await this.sendMessage(chatId, paymentMessage);
            }

            // Process order confirmation
            if (analysis.intent === 'confirmation' && session.stage === 'confirming') {
                await this.processOrderConfirmation(chatId, session);
            }

        } catch (error) {
            console.error('Error handling special actions:', error);
        }
    }

    formatPaymentOptions() {
        const pixKey = process.env.PIX_KEY || 'restaurant@email.com';
        
        return `💳 *OPÇÕES DE PAGAMENTO*

1️⃣ *PIX* (Instantâneo)
Chave PIX: \`${pixKey}\`
📱 Copie a chave e pague pelo seu banco

2️⃣ *Chamar Garçom*
🙋‍♂️ Clique aqui para chamar o garçom à sua mesa
Pagamento em dinheiro ou cartão

Qual opção prefere?`;
    }

    async processOrderConfirmation(chatId, session) {
        try {
            if (!session.currentOrder.items.length) {
                await this.sendMessage(chatId, 'Seu pedido está vazio. Gostaria de adicionar algo?');
                return;
            }

            // Create order in database
            const orderData = {
                table_id: session.tableNumber || null,
                customer_phone: session.customerInfo.phone,
                customer_name: session.customerInfo.name,
                platform: 'whatsapp',
                chat_id: chatId,
                total_amount: session.currentOrder.total,
                special_instructions: session.currentOrder.specialInstructions
            };

            const orderResult = await this.database.createOrder(orderData);
            const orderId = orderResult.lastID;

            // Add order items
            for (const item of session.currentOrder.items) {
                await this.database.addOrderItem({
                    order_id: orderId,
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    special_instructions: item.specialInstructions || null
                });
            }

            // Update session
            await this.chatbot.updateSession(chatId, {
                currentOrderId: orderId,
                stage: 'payment'
            });

            const confirmationMessage = `✅ *PEDIDO CONFIRMADO!*

📋 Pedido #${orderId}
👥 ${session.customerInfo.peopleCount || 1} pessoa(s)
💰 Total: R$ ${session.currentOrder.total.toFixed(2)}

⏰ Tempo estimado: 25-30 minutos

Agora escolha a forma de pagamento! 👇`;

            await this.sendMessage(chatId, confirmationMessage);

        } catch (error) {
            console.error('Error processing order confirmation:', error);
            await this.sendMessage(chatId, 'Erro ao confirmar pedido. Tente novamente.');
        }
    }

    async saveChatSession(chatId, session, contact) {
        try {
            const sessionData = {
                chat_id: chatId,
                platform: 'whatsapp',
                customer_phone: contact.number,
                customer_name: contact.name || contact.number,
                table_id: session.tableNumber || null,
                current_order_id: session.currentOrderId || null,
                session_data: {
                    stage: session.stage,
                    customerInfo: session.customerInfo,
                    currentOrder: session.currentOrder
                }
            };

            await this.database.createOrUpdateChatSession(sessionData);
        } catch (error) {
            console.error('Error saving chat session:', error);
        }
    }

    async sendMessage(chatId, message) {
        if (!this.isReady) {
            console.error('WhatsApp client not ready');
            return;
        }

        try {
            await this.client.sendMessage(chatId, message);
            console.log(`Message sent to ${chatId}: ${message.substring(0, 50)}...`);
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
        }
    }

    async sendImage(chatId, imagePath, caption = '') {
        if (!this.isReady) {
            console.error('WhatsApp client not ready');
            return;
        }

        try {
            const media = MessageMedia.fromFilePath(imagePath);
            await this.client.sendMessage(chatId, media, { caption });
            console.log(`Image sent to ${chatId}`);
        } catch (error) {
            console.error('Error sending WhatsApp image:', error);
        }
    }

    async broadcastMessage(message, customerPhones = []) {
        if (!this.isReady) {
            console.error('WhatsApp client not ready');
            return;
        }

        try {
            for (const phone of customerPhones) {
                const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
                await this.sendMessage(chatId, message);
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error broadcasting WhatsApp message:', error);
        }
    }

    getQRCode() {
        return this.qrCodeData;
    }

    isClientReady() {
        return this.isReady;
    }

    async destroy() {
        if (this.client) {
            await this.client.destroy();
        }
    }
}

export default WhatsAppService;