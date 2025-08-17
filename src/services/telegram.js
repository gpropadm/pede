import pkg from 'telegraf';
const { Telegraf, Markup } = pkg;

class TelegramService {
    constructor(chatbot, database) {
        this.chatbot = chatbot;
        this.database = database;
        this.bot = null;
        this.isReady = false;
    }

    async initialize() {
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            console.log('Telegram bot token not provided, skipping Telegram service');
            return;
        }

        console.log('Initializing Telegram bot...');
        
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        
        this.setupCommands();
        this.setupMessageHandlers();
        
        try {
            await this.bot.launch();
            this.isReady = true;
            console.log('Telegram bot is ready!');
        } catch (error) {
            console.error('Error initializing Telegram bot:', error);
            throw error;
        }
    }

    setupCommands() {
        // Start command
        this.bot.start(async (ctx) => {
            const welcomeMessage = `🤖 Olá! Bem-vindo ao *${process.env.RESTAURANT_NAME || 'Nosso Restaurante'}*!

Sou seu assistente virtual para pedidos. Para começar, me diga:

📍 Qual o número da sua mesa?
👥 Quantas pessoas estão na mesa?

Ex: "Mesa 5, somos 3 pessoas"`;

            await ctx.replyWithMarkdown(welcomeMessage);
        });

        // Help command
        this.bot.help(async (ctx) => {
            const helpMessage = `🆘 *COMO USAR O BOT*

*Comandos disponíveis:*
/start - Iniciar novo pedido
/menu - Ver cardápio completo
/pedido - Ver seu pedido atual
/ajuda - Esta mensagem

*Como fazer pedidos:*
1️⃣ Informe mesa e quantidade de pessoas
2️⃣ Escolha itens do cardápio
3️⃣ Confirme seu pedido
4️⃣ Escolha forma de pagamento

*Exemplos:*
"Quero 2 hambúrgueres"
"Adiciona uma coca-cola"
"Quanto custa o salmão?"
"Confirmar pedido"`;

            await ctx.replyWithMarkdown(helpMessage);
        });

        // Menu command
        this.bot.command('menu', async (ctx) => {
            await this.sendMenu(ctx);
        });

        // Current order command
        this.bot.command('pedido', async (ctx) => {
            await this.sendCurrentOrder(ctx);
        });
    }

    setupMessageHandlers() {
        // Handle all text messages
        this.bot.on('text', async (ctx) => {
            try {
                await this.handleMessage(ctx);
            } catch (error) {
                console.error('Error handling Telegram message:', error);
                await ctx.reply('Desculpe, ocorreu um erro. Pode tentar novamente?');
            }
        });

        // Handle callback queries (inline keyboard buttons)
        this.bot.on('callback_query', async (ctx) => {
            try {
                await this.handleCallbackQuery(ctx);
            } catch (error) {
                console.error('Error handling Telegram callback:', error);
                await ctx.answerCbQuery('Erro ao processar ação');
            }
        });
    }

    async handleMessage(ctx) {
        const chatId = ctx.chat.id.toString();
        const messageText = ctx.message.text;
        const user = ctx.from;
        
        console.log(`Received Telegram message from ${user.first_name}: ${messageText}`);

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
            await this.chatbot.updateSession(chatId, {
                customerInfo: {
                    ...result.session.customerInfo,
                    name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
                    phone: user.username || chatId
                }
            });

            // Handle special actions based on analysis
            await this.handleSpecialActions(ctx, result.analysis, result.session);

            // Send response
            await ctx.replyWithMarkdown(result.response, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true 
            });

            // Save chat session to database
            await this.saveChatSession(chatId, result.session, user);

        } catch (error) {
            console.error('Error processing Telegram message:', error);
            await ctx.reply('Desculpe, ocorreu um erro. Pode tentar novamente?');
        }
    }

    async handleCallbackQuery(ctx) {
        const action = ctx.callbackQuery.data;
        const chatId = ctx.chat.id.toString();
        
        console.log(`Received callback query: ${action}`);

        if (action.startsWith('add_item_')) {
            const itemId = action.replace('add_item_', '');
            await this.addItemToOrder(ctx, itemId);
        } else if (action === 'confirm_order') {
            await this.confirmOrder(ctx);
        } else if (action === 'payment_pix') {
            await this.showPixPayment(ctx);
        } else if (action === 'payment_attendant') {
            await this.callAttendant(ctx);
        } else if (action === 'show_menu') {
            await this.sendMenu(ctx);
        }

        await ctx.answerCbQuery();
    }

    async handleSpecialActions(ctx, analysis, session) {
        try {
            const chatId = ctx.chat.id.toString();

            // Extract people count
            if (analysis.intent === 'table_size' && analysis.extractedData.peopleCount) {
                await this.chatbot.updateSession(chatId, {
                    customerInfo: {
                        ...session.customerInfo,
                        peopleCount: analysis.extractedData.peopleCount
                    },
                    stage: 'ordering'
                });

                // Show menu after table info
                setTimeout(() => this.sendMenu(ctx), 1000);
            }

            // Show payment options
            if (analysis.suggestedActions.includes('show_payment_options')) {
                await this.showPaymentOptions(ctx);
            }

            // Process order confirmation
            if (analysis.intent === 'confirmation' && session.stage === 'confirming') {
                await this.processOrderConfirmation(ctx, session);
            }

        } catch (error) {
            console.error('Error handling special actions:', error);
        }
    }

    async sendMenu(ctx) {
        try {
            const categories = await this.database.getCategories();
            const menuItems = await this.database.getMenuItems();

            let menuMessage = `🍽️ *CARDÁPIO*\n\n`;

            for (const category of categories) {
                const categoryItems = menuItems.filter(item => item.category_id === category.id);
                if (categoryItems.length === 0) continue;

                menuMessage += `*${category.name.toUpperCase()}*\n`;
                
                categoryItems.forEach(item => {
                    menuMessage += `• ${item.name} - R$ ${item.price.toFixed(2)}\n`;
                    if (item.description) {
                        menuMessage += `  _${item.description}_\n`;
                    }
                });
                menuMessage += '\n';
            }

            menuMessage += `💬 Para pedir, escreva algo como:\n"Quero 2 hambúrgueres e 1 coca-cola"`;

            await ctx.replyWithMarkdown(menuMessage);

        } catch (error) {
            console.error('Error sending menu:', error);
            await ctx.reply('Erro ao carregar cardápio.');
        }
    }

    async sendCurrentOrder(ctx) {
        try {
            const chatId = ctx.chat.id.toString();
            const session = await this.chatbot.getSession(chatId);

            if (!session || !session.currentOrder.items.length) {
                await ctx.reply('Você ainda não tem itens no pedido. Use /menu para ver o cardápio!');
                return;
            }

            let orderMessage = `🛒 *SEU PEDIDO ATUAL*\n\n`;
            
            session.currentOrder.items.forEach((item, index) => {
                orderMessage += `${index + 1}. ${item.name} x${item.quantity} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
            });

            orderMessage += `\n💰 *Total: R$ ${session.currentOrder.total.toFixed(2)}*`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('✅ Confirmar Pedido', 'confirm_order')],
                [Markup.button.callback('📋 Ver Cardápio', 'show_menu')]
            ]);

            await ctx.replyWithMarkdown(orderMessage, keyboard);

        } catch (error) {
            console.error('Error sending current order:', error);
            await ctx.reply('Erro ao mostrar pedido atual.');
        }
    }

    async showPaymentOptions(ctx) {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💳 PIX (Instantâneo)', 'payment_pix')],
            [Markup.button.callback('🙋‍♂️ Chamar Garçom', 'payment_attendant')]
        ]);

        const paymentMessage = `💳 *ESCOLHA A FORMA DE PAGAMENTO*

• *PIX*: Pagamento instantâneo
• *Garçom*: Dinheiro ou cartão na mesa`;

        await ctx.replyWithMarkdown(paymentMessage, keyboard);
    }

    async showPixPayment(ctx) {
        const pixKey = process.env.PIX_KEY || 'restaurant@email.com';
        
        const pixMessage = `💳 *PAGAMENTO VIA PIX*

🔑 *Chave PIX:* \`${pixKey}\`

📱 *Como pagar:*
1. Abra seu banco/app de pagamento
2. Copie a chave PIX acima
3. Faça a transferência
4. Envie o comprovante aqui

⚡ O pagamento é processado instantaneamente!`;

        await ctx.replyWithMarkdown(pixMessage);
    }

    async callAttendant(ctx) {
        const chatId = ctx.chat.id.toString();
        const session = await this.chatbot.getSession(chatId);
        
        let attendantMessage = `🙋‍♂️ *GARÇOM CHAMADO!*

Um garçom será direcionado à sua mesa em breve.`;

        if (session?.tableNumber) {
            attendantMessage += `\n📍 Mesa: ${session.tableNumber}`;
        }

        attendantMessage += `\n\n💰 Você pode pagar em dinheiro ou cartão diretamente com o garçom.`;

        await ctx.replyWithMarkdown(attendantMessage);

        // Here you could integrate with a kitchen display system or notification service
        console.log(`Attendant called for chat ${chatId}, table ${session?.tableNumber || 'unknown'}`);
    }

    async processOrderConfirmation(ctx, session) {
        try {
            const chatId = ctx.chat.id.toString();

            if (!session.currentOrder.items.length) {
                await ctx.reply('Seu pedido está vazio. Use /menu para ver o cardápio!');
                return;
            }

            // Create order in database
            const orderData = {
                table_id: session.tableNumber || null,
                customer_phone: session.customerInfo.phone,
                customer_name: session.customerInfo.name,
                platform: 'telegram',
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

            await ctx.replyWithMarkdown(confirmationMessage);
            await this.showPaymentOptions(ctx);

        } catch (error) {
            console.error('Error processing order confirmation:', error);
            await ctx.reply('Erro ao confirmar pedido. Tente novamente.');
        }
    }

    async saveChatSession(chatId, session, user) {
        try {
            const sessionData = {
                chat_id: chatId,
                platform: 'telegram',
                customer_phone: user.username || chatId,
                customer_name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
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

    async broadcastMessage(message, customerIds = []) {
        if (!this.isReady) {
            console.error('Telegram bot not ready');
            return;
        }

        try {
            for (const chatId of customerIds) {
                await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('Error broadcasting Telegram message:', error);
        }
    }

    isClientReady() {
        return this.isReady;
    }

    async stop() {
        if (this.bot) {
            this.bot.stop('SIGINT');
        }
    }
}

export default TelegramService;