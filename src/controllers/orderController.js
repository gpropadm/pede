class OrderController {
    constructor(database) {
        this.database = database;
    }

    async processNaturalLanguageOrder(message, session) {
        try {
            const menuItems = await this.database.getMenuItems();
            const extractedItems = this.extractItemsFromMessage(message, menuItems);
            
            if (extractedItems.length === 0) {
                return {
                    success: false,
                    message: 'Não consegui identificar itens do cardápio na sua mensagem. Pode ser mais específico?',
                    suggestions: this.suggestSimilarItems(message, menuItems)
                };
            }

            // Add items to session order
            for (const item of extractedItems) {
                await this.addItemToOrder(session, item);
            }

            return {
                success: true,
                message: this.formatOrderSummary(session.currentOrder),
                addedItems: extractedItems
            };

        } catch (error) {
            console.error('Error processing natural language order:', error);
            return {
                success: false,
                message: 'Erro ao processar pedido. Tente novamente.'
            };
        }
    }

    extractItemsFromMessage(message, menuItems) {
        const extractedItems = [];
        const messageLower = message.toLowerCase();
        
        // Remove common words and normalize
        const normalizedMessage = this.normalizeMessage(messageLower);
        
        // Look for quantity patterns
        const quantityPattern = /(\\d+)\\s*(un|unidade|unidades)?\\s*/g;
        
        for (const menuItem of menuItems) {
            const itemMatch = this.findItemInMessage(normalizedMessage, menuItem);
            
            if (itemMatch.found) {
                const quantity = itemMatch.quantity || 1;
                
                extractedItems.push({
                    id: menuItem.id,
                    name: menuItem.name,
                    price: menuItem.price,
                    quantity: quantity,
                    category: menuItem.category
                });
            }
        }

        return extractedItems;
    }

    normalizeMessage(message) {
        // Remove accents and normalize
        return message
            .normalize('NFD')
            .replace(/[\\u0300-\\u036f]/g, '')
            .replace(/[^a-z0-9\\s]/g, ' ')
            .replace(/\\s+/g, ' ')
            .trim();
    }

    findItemInMessage(message, menuItem) {
        const itemName = this.normalizeMessage(menuItem.name.toLowerCase());
        const itemWords = itemName.split(' ');
        
        // Check exact match
        if (message.includes(itemName)) {
            return {
                found: true,
                quantity: this.extractQuantityNearItem(message, itemName)
            };
        }
        
        // Check partial match (at least 70% of words)
        const messageWords = message.split(' ');
        const matchingWords = itemWords.filter(word => 
            messageWords.some(msgWord => 
                msgWord.includes(word) || word.includes(msgWord)
            )
        );
        
        const matchPercentage = matchingWords.length / itemWords.length;
        
        if (matchPercentage >= 0.7) {
            return {
                found: true,
                quantity: this.extractQuantityFromMessage(message)
            };
        }
        
        // Check for common variations and synonyms
        const variations = this.getItemVariations(menuItem);
        for (const variation of variations) {
            if (message.includes(variation)) {
                return {
                    found: true,
                    quantity: this.extractQuantityNearItem(message, variation)
                };
            }
        }
        
        return { found: false };
    }

    getItemVariations(menuItem) {
        const variations = [];
        const name = menuItem.name.toLowerCase();
        
        // Common food variations
        const synonyms = {
            'hamburguer': ['burger', 'sanduiche', 'hamburgao'],
            'refrigerante': ['refri', 'coca', 'pepsi', 'guarana'],
            'batata': ['fritas', 'batatas'],
            'agua': ['agua mineral', 'aguinha'],
            'cerveja': ['breja', 'gelada'],
            'camarao': ['camaroes'],
            'salmao': ['salmon'],
            'frango': ['galinha', 'chicken']
        };
        
        Object.entries(synonyms).forEach(([key, values]) => {
            if (name.includes(key)) {
                variations.push(...values);
            }
        });
        
        return variations;
    }

    extractQuantityFromMessage(message) {
        const quantityPatterns = [
            /(?:^|\\s)(\\d+)\\s*(?:un|unidade|unidades|x)?\\s/,
            /(?:^|\\s)(dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\\s/,
            /(?:^|\\s)(um|uma)\\s/
        ];
        
        const numberWords = {
            'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3,
            'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7,
            'oito': 8, 'nove': 9, 'dez': 10
        };
        
        for (const pattern of quantityPatterns) {
            const match = message.match(pattern);
            if (match) {
                const quantity = match[1];
                return isNaN(quantity) ? numberWords[quantity] || 1 : parseInt(quantity);
            }
        }
        
        return 1;
    }

    extractQuantityNearItem(message, itemName) {
        const itemIndex = message.indexOf(itemName);
        if (itemIndex === -1) return 1;
        
        // Look for quantity in the 20 characters before the item
        const beforeItem = message.substring(Math.max(0, itemIndex - 20), itemIndex);
        const quantity = this.extractQuantityFromMessage(beforeItem);
        
        return quantity || 1;
    }

    suggestSimilarItems(message, menuItems) {
        const suggestions = [];
        const messageLower = this.normalizeMessage(message.toLowerCase());
        
        for (const item of menuItems) {
            const itemName = this.normalizeMessage(item.name.toLowerCase());
            const similarity = this.calculateSimilarity(messageLower, itemName);
            
            if (similarity > 0.3) {
                suggestions.push({
                    name: item.name,
                    price: item.price,
                    similarity
                });
            }
        }
        
        return suggestions
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
    }

    calculateSimilarity(str1, str2) {
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        
        let matches = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1.includes(word2) || word2.includes(word1)) {
                    matches++;
                    break;
                }
            }
        }
        
        return matches / Math.max(words1.length, words2.length);
    }

    async addItemToOrder(session, item) {
        if (!session.currentOrder) {
            session.currentOrder = { items: [], total: 0, specialInstructions: '' };
        }
        
        // Check if item already exists in order
        const existingItemIndex = session.currentOrder.items.findIndex(
            orderItem => orderItem.id === item.id
        );
        
        if (existingItemIndex !== -1) {
            // Update quantity
            session.currentOrder.items[existingItemIndex].quantity += item.quantity;
        } else {
            // Add new item
            session.currentOrder.items.push(item);
        }
        
        // Recalculate total
        session.currentOrder.total = session.currentOrder.items.reduce(
            (total, orderItem) => total + (orderItem.price * orderItem.quantity), 0
        );
        
        return session.currentOrder;
    }

    async removeItemFromOrder(session, itemId, quantity = null) {
        if (!session.currentOrder || !session.currentOrder.items) {
            return session.currentOrder;
        }
        
        const itemIndex = session.currentOrder.items.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            if (quantity === null) {
                // Remove item completely
                session.currentOrder.items.splice(itemIndex, 1);
            } else {
                // Reduce quantity
                session.currentOrder.items[itemIndex].quantity -= quantity;
                if (session.currentOrder.items[itemIndex].quantity <= 0) {
                    session.currentOrder.items.splice(itemIndex, 1);
                }
            }
            
            // Recalculate total
            session.currentOrder.total = session.currentOrder.items.reduce(
                (total, orderItem) => total + (orderItem.price * orderItem.quantity), 0
            );
        }
        
        return session.currentOrder;
    }

    formatOrderSummary(order) {
        if (!order || !order.items || order.items.length === 0) {
            return 'Seu pedido está vazio.';
        }
        
        let summary = '🛒 *SEU PEDIDO:*\\n\\n';
        
        order.items.forEach((item, index) => {
            summary += `${index + 1}. ${item.name} x${item.quantity} - R$ ${(item.price * item.quantity).toFixed(2)}\\n`;
        });
        
        summary += `\\n💰 *Total: R$ ${order.total.toFixed(2)}*`;
        summary += `\\n\\n✅ Quer confirmar este pedido?`;
        
        return summary;
    }

    async calculateEstimatedTime(order) {
        if (!order || !order.items) return 15;
        
        try {
            let maxTime = 0;
            
            for (const item of order.items) {
                const menuItem = await this.database.getMenuItemById(item.id);
                if (menuItem && menuItem.preparation_time) {
                    maxTime = Math.max(maxTime, menuItem.preparation_time);
                }
            }
            
            // Add 5 minutes base time + 2 minutes per additional item
            const additionalTime = 5 + (order.items.length - 1) * 2;
            
            return Math.max(maxTime + additionalTime, 15);
            
        } catch (error) {
            console.error('Error calculating estimated time:', error);
            return 25; // Default time
        }
    }

    async validateOrder(order) {
        const errors = [];
        
        if (!order || !order.items || order.items.length === 0) {
            errors.push('Pedido está vazio');
        }
        
        if (order.total <= 0) {
            errors.push('Total do pedido inválido');
        }
        
        // Validate each item
        for (const item of order.items || []) {
            const menuItem = await this.database.getMenuItemById(item.id);
            
            if (!menuItem) {
                errors.push(`Item "${item.name}" não encontrado no cardápio`);
            } else if (!menuItem.available) {
                errors.push(`Item "${item.name}" não está disponível`);
            } else if (item.quantity <= 0) {
                errors.push(`Quantidade inválida para "${item.name}"`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default OrderController;