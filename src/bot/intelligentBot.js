import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';

class IntelligentRestaurantBot {
    constructor(database) {
        this.database = database;
        this.llm = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0.7,
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
        
        this.sessions = new Map();
        this.initializePrompts();
    }

    initializePrompts() {
        this.systemPrompt = `Você é o Chef Bot, assistente virtual inteligente do restaurante {restaurant_name}.

PERSONALIDADE:
- Amigável, prestativo e entusiasta
- Use linguagem brasileira casual mas profissional  
- Sempre tente fazer upselling natural
- Seja eficiente mas educado

SUAS FUNÇÕES:
1. Cumprimentar e confirmar mesa/pessoas
2. Apresentar cardápio de forma atrativa
3. Receber e processar pedidos naturalmente
4. Calcular totais e confirmar pedidos
5. Oferecer opções de pagamento
6. Sugerir complementos e sobremesas

REGRAS IMPORTANTES:
- SEMPRE confirme mesa e número de pessoas primeiro
- SEMPRE calcule e confirme totais antes de finalizar
- SEMPRE ofereça bebidas se não foram pedidas
- SEMPRE sugira sobremesas ao final
- Mantenha contexto da conversa
- Use emojis para deixar mais amigável

INFORMAÇÕES DO RESTAURANTE:
Nome: {restaurant_name}
Telefone: {restaurant_phone}
Endereço: {restaurant_address}
PIX: {pix_key}

CARDÁPIO ATUAL:
{menu_context}

PEDIDO ATUAL DA MESA:
{current_order}

HISTÓRICO DA CONVERSA:
{conversation_history}

INSTRUÇÕES ESPECIAIS:
- Se cliente pedir item que não existe, sugira similar
- Se não entender quantidade, pergunte claramente
- Sempre confirme antes de finalizar pedido
- Para pagamento: PIX instantâneo ou chamar garçom

Cliente: {input}
Chef Bot:`;

        this.promptTemplate = PromptTemplate.fromTemplate(this.systemPrompt);
    }

    async createSession(chatId, tableNumber = null) {
        const memory = new BufferMemory({
            memoryKey: 'conversation_history',
            inputKey: 'input',
            outputKey: 'output',
        });

        const session = {
            chatId,
            memory,
            tableNumber,
            peopleCount: null,
            currentOrder: {
                items: [],
                total: 0,
                specialInstructions: ''
            },
            customerInfo: {
                name: null,
                phone: null
            },
            stage: 'greeting', // greeting, menu, ordering, confirming, payment, completed
            lastActivity: new Date(),
            orderHistory: []
        };

        this.sessions.set(chatId, session);
        return session;
    }

    async processMessage(chatId, message, customerInfo = {}) {
        try {
            let session = this.sessions.get(chatId);
            
            if (!session) {
                session = await this.createSession(chatId);
            }

            // Update customer info
            if (customerInfo.name) session.customerInfo.name = customerInfo.name;
            if (customerInfo.phone) session.customerInfo.phone = customerInfo.phone;

            // Get menu and restaurant info
            const menuItems = await this.database.getMenuItems();
            const menuContext = this.formatMenuForContext(menuItems);
            
            const restaurantInfo = {
                name: process.env.RESTAURANT_NAME || 'Nosso Restaurante',
                phone: process.env.RESTAURANT_PHONE || '+55 11 99999-9999',
                address: process.env.RESTAURANT_ADDRESS || 'São Paulo, SP',
                pix_key: process.env.PIX_KEY || 'restaurant@email.com'
            };

            // Analyze message for structured data
            const analysis = await this.analyzeMessage(message, session);
            
            // Update session based on analysis
            await this.updateSessionFromAnalysis(session, analysis);

            // Get conversation history
            const conversationHistory = await session.memory.loadMemoryVariables({});
            
            // Format current order
            const currentOrderText = this.formatCurrentOrder(session.currentOrder);

            // Generate response
            const response = await this.llm.invoke(
                await this.promptTemplate.format({
                    restaurant_name: restaurantInfo.name,
                    restaurant_phone: restaurantInfo.phone,
                    restaurant_address: restaurantInfo.address,
                    pix_key: restaurantInfo.pix_key,
                    menu_context: menuContext,
                    current_order: currentOrderText,
                    conversation_history: conversationHistory.conversation_history || '',
                    input: message
                })
            );

            // Save to memory
            await session.memory.saveContext(
                { input: message },
                { output: response.content }
            );

            // Process any actions needed
            const actions = await this.processActions(session, response.content, analysis);

            session.lastActivity = new Date();

            return {
                response: response.content,
                actions,
                session,
                analysis
            };

        } catch (error) {
            console.error('Error processing message:', error);
            return {
                response: 'Desculpe, ocorreu um erro. Pode repetir sua mensagem?',
                actions: [],
                session: this.sessions.get(chatId),
                analysis: { intent: 'error' }
            };
        }
    }

    async analyzeMessage(message, session) {
        const analysis = {
            intent: 'general',
            extractedData: {},
            suggestedActions: []
        };

        const messageLower = message.toLowerCase();

        // Detect table/people count
        const tableMatch = messageLower.match(/mesa\s*(\d+)/);
        const peopleMatch = messageLower.match(/(\d+)\s*pessoa[s]?|somos\s*(\d+)/);
        
        if (tableMatch) {
            analysis.extractedData.tableNumber = parseInt(tableMatch[1]);
            analysis.intent = 'table_info';
        }
        
        if (peopleMatch) {
            analysis.extractedData.peopleCount = parseInt(peopleMatch[1] || peopleMatch[2]);
            analysis.intent = 'people_count';
        }

        // Detect order intent
        if (messageLower.includes('quero') || messageLower.includes('gostaria') || 
            messageLower.includes('pedido') || messageLower.includes('pedir')) {
            analysis.intent = 'ordering';
            
            // Try to extract items and quantities
            const menuItems = await this.database.getMenuItems();
            const extractedItems = this.extractItemsFromMessage(message, menuItems);
            if (extractedItems.length > 0) {
                analysis.extractedData.items = extractedItems;
                analysis.suggestedActions.push('add_to_order');
            }
        }

        // Detect confirmation
        if (messageLower.includes('sim') || messageLower.includes('confirma') || 
            messageLower.includes('ok') || messageLower.includes('certo')) {
            analysis.intent = 'confirmation';
            analysis.suggestedActions.push('confirm_order');
        }

        // Detect payment intent
        if (messageLower.includes('pix') || messageLower.includes('pagar') || 
            messageLower.includes('pagamento')) {
            analysis.intent = 'payment';
            analysis.suggestedActions.push('process_payment');
        }

        return analysis;
    }

    extractItemsFromMessage(message, menuItems) {
        const extractedItems = [];
        const messageLower = message.toLowerCase();
        
        for (const item of menuItems) {
            const itemName = item.name.toLowerCase();
            
            // Check if item is mentioned
            if (messageLower.includes(itemName) || 
                this.findSimilarItem(messageLower, itemName)) {
                
                // Extract quantity
                const quantity = this.extractQuantityForItem(messageLower, itemName);
                
                extractedItems.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: quantity,
                    category: item.category
                });
            }
        }
        
        return extractedItems;
    }

    findSimilarItem(message, itemName) {
        const itemWords = itemName.split(' ');
        let matchCount = 0;
        
        for (const word of itemWords) {
            if (word.length > 3 && message.includes(word)) {
                matchCount++;
            }
        }
        
        return matchCount / itemWords.length > 0.5;
    }

    extractQuantityForItem(message, itemName) {
        const itemIndex = message.indexOf(itemName);
        if (itemIndex === -1) return 1;
        
        // Look for numbers near the item name
        const beforeItem = message.substring(Math.max(0, itemIndex - 20), itemIndex);
        const afterItem = message.substring(itemIndex, itemIndex + itemName.length + 10);
        
        const numberPattern = /(\d+)/;
        const beforeMatch = beforeItem.match(numberPattern);
        const afterMatch = afterItem.match(numberPattern);
        
        if (beforeMatch) return parseInt(beforeMatch[1]);
        if (afterMatch) return parseInt(afterMatch[1]);
        
        return 1;
    }

    async updateSessionFromAnalysis(session, analysis) {
        if (analysis.extractedData.tableNumber) {
            session.tableNumber = analysis.extractedData.tableNumber;
        }
        
        if (analysis.extractedData.peopleCount) {
            session.peopleCount = analysis.extractedData.peopleCount;
        }
        
        if (analysis.extractedData.items) {
            for (const item of analysis.extractedData.items) {
                await this.addItemToOrder(session, item);
            }
        }
    }

    async addItemToOrder(session, item) {
        const existingItem = session.currentOrder.items.find(orderItem => orderItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            session.currentOrder.items.push(item);
        }
        
        // Recalculate total
        session.currentOrder.total = session.currentOrder.items.reduce(
            (total, orderItem) => total + (orderItem.price * orderItem.quantity), 0
        );
    }

    formatMenuForContext(menuItems) {
        if (!menuItems || menuItems.length === 0) {
            return 'Cardápio temporariamente indisponível.';
        }

        const categories = {};
        menuItems.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push(item);
        });

        let menuText = '';
        Object.entries(categories).forEach(([category, items]) => {
            menuText += `\n${category.toUpperCase()}:\n`;
            items.forEach(item => {
                menuText += `• ${item.name} - R$ ${item.price.toFixed(2)}\n`;
            });
        });

        return menuText;
    }

    formatCurrentOrder(order) {
        if (!order.items || order.items.length === 0) {
            return 'Pedido vazio';
        }
        
        let orderText = 'PEDIDO ATUAL:\n';
        order.items.forEach(item => {
            orderText += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        });
        orderText += `\nTOTAL: R$ ${order.total.toFixed(2)}`;
        
        return orderText;
    }

    async processActions(session, response, analysis) {
        const actions = [];
        
        if (analysis.suggestedActions.includes('confirm_order') && session.currentOrder.items.length > 0) {
            // Create order in database
            const orderData = {
                table_id: session.tableNumber,
                customer_phone: session.customerInfo.phone,
                customer_name: session.customerInfo.name,
                platform: 'whatsapp',
                chat_id: session.chatId,
                total_amount: session.currentOrder.total,
                special_instructions: session.currentOrder.specialInstructions
            };
            
            try {
                const orderResult = await this.database.createOrder(orderData);
                
                // Add order items
                for (const item of session.currentOrder.items) {
                    await this.database.addOrderItem({
                        order_id: orderResult.lastID,
                        menu_item_id: item.id,
                        quantity: item.quantity,
                        unit_price: item.price
                    });
                }
                
                actions.push({
                    type: 'order_created',
                    orderId: orderResult.lastID,
                    data: orderData
                });
                
                session.stage = 'payment';
                
            } catch (error) {
                console.error('Error creating order:', error);
                actions.push({
                    type: 'error',
                    message: 'Erro ao processar pedido'
                });
            }
        }
        
        return actions;
    }

    async cleanupOldSessions() {
        const now = new Date();
        const maxAge = 60 * 60 * 1000; // 1 hour
        
        for (const [chatId, session] of this.sessions) {
            if (now - session.lastActivity > maxAge) {
                this.sessions.delete(chatId);
            }
        }
    }
}

export default IntelligentRestaurantBot;