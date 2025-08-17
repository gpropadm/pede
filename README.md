# 🤖 Restaurant Chatbot - Sistema de Pedidos Inteligente

Sistema completo de pedidos para restaurantes via **WhatsApp** e **Telegram** usando **LangChain** e **IA**.

## 🚀 Características

### 🎯 Funcionalidades Principais
- **Conversação Natural**: Clientes fazem pedidos conversando naturalmente
- **Multi-plataforma**: WhatsApp e Telegram integrados
- **QR Codes Inteligentes**: Mesa → WhatsApp/Telegram automaticamente
- **IA Conversacional**: LangChain + GPT para entender linguagem natural
- **Gestão Completa**: Do pedido ao pagamento

### 💰 Monetização
- **SaaS Mensal**: R$ 200-500/mês por restaurante
- **% sobre vendas**: 2-5% por pedido processado
- **Setup**: R$ 2.000-5.000 por implementação

## 🛠️ Tecnologias

```
LangChain + OpenAI → Inteligência conversacional
WhatsApp Web API → Integração WhatsApp
Telegraf → Bot Telegram
SQLite → Banco de dados
Express.js → API REST
Node.js → Backend
```

## ⚡ Instalação Rápida

### 1. Clone e Configure
```bash
cd restaurant-chatbot
npm install
cp .env.example .env
```

### 2. Configure o .env
```env
# OpenAI para IA conversacional
OPENAI_API_KEY=sk-your-openai-api-key

# Telegram Bot (opcional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Configurações do Restaurante
RESTAURANT_NAME=Meu Restaurante
RESTAURANT_PHONE=+5511999999999
RESTAURANT_ADDRESS=Rua das Flores, 123 - São Paulo, SP

# Pagamento PIX
PIX_KEY=restaurant@email.com
```

### 3. Execute
```bash
npm start
```

## 📱 Como Funciona

### Fluxo do Cliente:
1. **Escaneia QR Code** na mesa
2. **Abre WhatsApp/Telegram** automaticamente
3. **Conversa natural**: "Somos 3 pessoas, quero 2 hambúrgueres"
4. **IA entende** e processa o pedido
5. **Confirma e oferece pagamento** (PIX ou garçom)
6. **Pedido vai direto** para a cozinha

### Fluxo do Restaurante:
1. **Gera QR Codes** para todas as mesas
2. **Recebe pedidos** em tempo real
3. **Gerencia pelo admin panel**
4. **Processa pagamentos**

## 🎮 Testando o Sistema

### 1. Inicie o servidor
```bash
npm start
```

### 2. Acesse o Admin Panel
```
http://localhost:3000/admin
```

### 3. Configure WhatsApp
- Escaneie o QR Code mostrado no admin panel
- WhatsApp estará conectado e funcionando

### 4. Gere QR Codes
- No admin panel, clique em "Gerar QR Codes"
- Escolha quantidade de mesas e plataforma
- Baixe a folha para impressão

### 5. Teste um Pedido
- Escaneie um QR Code com seu celular
- Converse com o bot: "Mesa 5, somos 2 pessoas"
- Faça um pedido: "Quero 1 hambúrguer e 1 coca-cola"
- Confirme o pedido

## 📊 Admin Panel

Acesse `/admin` para:

- ✅ **Status dos Serviços** (WhatsApp, Telegram, Database)
- 📱 **QR Code do WhatsApp** para primeira conexão
- 🍽️ **Visualizar Cardápio** completo
- 📋 **Pedidos do Dia** em tempo real
- 🖨️ **Gerar QR Codes** para impressão

## 🔌 API Endpoints

```
GET  /health              → Status dos serviços
GET  /api/menu            → Cardápio completo
GET  /api/orders/today    → Pedidos de hoje
GET  /api/orders/:id      → Detalhes do pedido
PUT  /api/orders/:id/status → Atualizar status

GET  /api/qr/table/:number    → Gerar QR para mesa
GET  /api/qr/generate-all     → Gerar todos QR codes
GET  /api/qr/print/:platform  → Folha para impressão

GET  /api/whatsapp/status → Status WhatsApp + QR Code
```

## 🎯 Exemplos de Conversas

### Cliente típico:
```
Cliente: "Mesa 8, somos 4 pessoas"
Bot: "Perfeito! 4 pessoas na mesa 8. Aqui está nosso cardápio..."

Cliente: "Quero 2 hambúrgueres e 2 coca-colas"
Bot: "Ótima escolha! Adicionei:
• 2x Hambúrguer Artesanal - R$ 65,80
• 2x Coca-Cola 350ml - R$ 13,80
Total: R$ 79,60
Confirma esse pedido?"

Cliente: "Sim"
Bot: "Pedido confirmado! Tempo estimado: 25 min
Como quer pagar? PIX ou chamar garçom?"
```

## 🔧 Configuração Avançada

### Personalizar Cardápio
Edite o arquivo `src/database/schema.sql` ou use a API:

```sql
INSERT INTO menu_items (category_id, name, description, price) VALUES
(1, 'Novo Prato', 'Descrição deliciosa', 29.90);
```

### Webhooks e Integrações
```javascript
// Integrar com sistema POS existente
app.post('/webhook/new-order', async (req, res) => {
    const order = req.body;
    // Enviar para seu sistema POS
    await yourPOSSystem.createOrder(order);
});
```

## 🚨 Troubleshooting

### WhatsApp não conecta:
- Verifique se o QR Code está sendo mostrado no `/admin`
- Escaneie com WhatsApp (não com câmera)
- Aguarde até aparecer "WhatsApp: ready" no status

### Telegram não funciona:
- Verifique se `TELEGRAM_BOT_TOKEN` está configurado
- Crie um bot com @BotFather no Telegram
- Configure o token no `.env`

### IA não entende pedidos:
- Verifique se `OPENAI_API_KEY` está configurado
- Teste com pedidos mais simples: "Quero 1 hambúrguer"
- Veja logs do console para debug

## 📈 Próximos Passos

### Para Produção:
1. **Hosting**: Deploy no Railway, Heroku ou VPS
2. **Domínio**: Configure domínio próprio para QR codes
3. **SSL**: Configure HTTPS obrigatório
4. **Backup**: Configure backup automático do banco
5. **Monitoring**: Configure logs e alertas

### Melhorias:
- 🎨 Interface web para clientes (sem WhatsApp)
- 🔔 Notificações push para restaurante
- 📊 Analytics e relatórios avançados
- 💳 Integração com Mercado Pago/Stripe
- 🌍 Multi-idioma automático

## 💡 Oportunidades de Negócio

### Modelo SaaS:
- **Plano Básico**: R$ 200/mês (até 100 pedidos)
- **Plano Pro**: R$ 500/mês (pedidos ilimitados + analytics)
- **Enterprise**: R$ 1000/mês (múltiplos restaurantes)

### Mercado Potencial:
- 1M+ restaurantes no Brasil
- Crescimento de delivery: 30% ao ano
- ROI para restaurante: 2-3x em 6 meses

## 📞 Suporte

Problemas? Abra uma issue ou contate:
- 📧 Email: suporte@restaurantchatbot.com
- 📱 WhatsApp: +55 11 99999-9999
- 🌐 Site: https://restaurantchatbot.com

---

**🎉 Pronto para revolucionar o seu restaurante com IA?**

Faça `npm start` e comece a testar agora mesmo!