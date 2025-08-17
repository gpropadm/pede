import { ChatOpenAI } from '@langchain/openai';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

class RestaurantChatbot {
    constructor() {
        this.llm = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0.7,
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        this.sessions = new Map(); // Store conversation sessions
        this.initializePrompts();
    }

    initializePrompts() {
        this.systemPrompt = `Você é um assistente virtual inteligente de um restaurante brasileiro. Seu nome é Chef Bot.

PERSONALIDADE:
- Seja amigável, prestativo e entusiasta sobre a comida
- Use linguagem brasileira casual mas profissional
- Sempre tente fazer upselling de forma natural
- Seja paciente e esclarecedor

SUAS FUNÇÕES:
1. Receber clientes e perguntar quantas pessoas na mesa
2. Apresentar o cardápio de forma atrativa
3. Responder dúvidas sobre pratos (ingredientes, alergênicos, tempo de preparo)
4. Receber pedidos e confirmar detalhes
5. Calcular total e oferecer opções de pagamento
6. Sugerir complementos e sobremesas

REGRAS IMPORTANTES:
- SEMPRE confirme a mesa/número de pessoas no início
- SEMPRE confirme o pedido completo antes de finalizar
- SEMPRE mencione o tempo estimado de preparo
- Ofereça bebidas se não foram pedidas
- Sugira sobremesas no final
- Para pagamento: PIX (instantâneo) ou chamar garçom
- Mantenha o contexto da conversa

INFORMAÇÕES DO RESTAURANTE:
Nome: {restaurant_name}
Telefone: {restaurant_phone}
Endereço: {restaurant_address}

CARDÁPIO ATUAL:
{menu_context}

CONVERSA ATUAL:
{conversation_history}

Cliente: {input}
Chef Bot:`;

        this.promptTemplate = PromptTemplate.fromTemplate(this.systemPrompt);
    }

    async createSession(chatId, platform, tableNumber = null) {
        const memory = new BufferMemory({
            memoryKey: 'conversation_history',
            inputKey: 'input',
            outputKey: 'output',
        });

        const session = {
            memory,
            platform,
            tableNumber,
            currentOrder: {
                items: [],
                total: 0,
                specialInstructions: ''
            },
            customerInfo: {
                name: null,
                phone: null,
                peopleCount: null
            },
            lastActivity: new Date(),
            stage: 'greeting' // greeting, ordering, confirming, payment
        };

        this.sessions.set(chatId, session);
        return session;
    }

    async getSession(chatId) {
        return this.sessions.get(chatId);
    }

    async updateSession(chatId, updates) {
        const session = this.sessions.get(chatId);
        if (session) {
            Object.assign(session, updates);
            session.lastActivity = new Date();
        }
    }

    async processMessage(chatId, message, menuItems = [], restaurantInfo = {}) {
        let session = await this.getSession(chatId);
        
        if (!session) {
            session = await this.createSession(chatId, 'whatsapp');
        }

        // Format menu context
        const menuContext = this.formatMenuForContext(menuItems);
        
        // Create the chain
        const chain = RunnableSequence.from([
            this.promptTemplate,
            this.llm,
            new StringOutputParser(),
        ]);

        try {
            // Get conversation history
            const conversationHistory = await session.memory.loadMemoryVariables({});
            
            const response = await chain.invoke({
                restaurant_name: restaurantInfo.name || 'Nosso Restaurante',
                restaurant_phone: restaurantInfo.phone || '+55 11 99999-9999',
                restaurant_address: restaurantInfo.address || 'São Paulo, SP',
                menu_context: menuContext,
                conversation_history: conversationHistory.conversation_history || '',
                input: message
            });

            // Save to memory
            await session.memory.saveContext(
                { input: message },
                { output: response }
            );

            // Analyze response to extract structured data
            const analysis = await this.analyzeResponse(message, response, session);
            
            return {
                response: response.trim(),
                analysis,
                session
            };

        } catch (error) {
            console.error('Error processing message:', error);
            return {
                response: 'Desculpe, ocorreu um erro. Pode repetir sua mensagem?',
                analysis: { intent: 'error' },
                session
            };
        }
    }

    formatMenuForContext(menuItems) {
        if (!menuItems || menuItems.length === 0) {
            return 'Cardápio não disponível no momento.';
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
                if (item.description) {
                    menuText += `  ${item.description}\n`;
                }
            });
        });

        return menuText;
    }

    async analyzeResponse(userMessage, botResponse, session) {
        // Simple intent analysis - could be enhanced with a separate LLM call
        const analysis = {
            intent: 'general',
            extractedData: {},
            suggestedActions: []
        };

        const userLower = userMessage.toLowerCase();
        const botLower = botResponse.toLowerCase();

        // Detect intents
        if (userLower.includes('pessoas') || userLower.match(/\d+\s*(pessoa|pessoas)/)) {
            analysis.intent = 'table_size';
            const match = userMessage.match(/(\d+)\s*(pessoa|pessoas)/);
            if (match) {
                analysis.extractedData.peopleCount = parseInt(match[1]);
            }
        } else if (userLower.includes('quero') || userLower.includes('pedido') || userLower.includes('gostaria')) {
            analysis.intent = 'ordering';
        } else if (userLower.includes('quanto') || userLower.includes('preço') || userLower.includes('custa')) {
            analysis.intent = 'price_inquiry';
        } else if (userLower.includes('pagar') || userLower.includes('pagamento') || userLower.includes('pix')) {
            analysis.intent = 'payment';
        } else if (userLower.includes('confirmar') || userLower.includes('ok') || userLower.includes('sim')) {
            analysis.intent = 'confirmation';
        }

        // Detect if bot is asking for confirmation
        if (botLower.includes('confirmar') || botLower.includes('está correto')) {
            analysis.suggestedActions.push('await_confirmation');
        }

        // Detect if bot mentioned payment
        if (botLower.includes('pix') || botLower.includes('pagamento')) {
            analysis.suggestedActions.push('show_payment_options');
        }

        return analysis;
    }

    async cleanupOldSessions() {
        const now = new Date();
        const maxAge = 30 * 60 * 1000; // 30 minutes

        for (const [chatId, session] of this.sessions) {
            if (now - session.lastActivity > maxAge) {
                this.sessions.delete(chatId);
            }
        }
    }
}

export default RestaurantChatbot;