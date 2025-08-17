# 🤖 Setup do Bot Automático WhatsApp

## 🎯 **O que vamos criar:**

```
Cliente → QR Code → WhatsApp → Bot Responde → Processa Pedido → Cozinha
```

## 🛠️ **Opções de Implementação:**

### **OPÇÃO A: VPS Simples (Recomendado)**
- **Custo**: R$ 30-50/mês
- **Providers**: DigitalOcean, Vultr, Linode
- **Vantagem**: Controle total, WhatsApp 24/7

### **OPÇÃO B: Railway/Render**
- **Custo**: R$ 20-40/mês  
- **Vantagem**: Deploy automático
- **Limitação**: Pode ter instabilidade

### **OPÇÃO C: AWS/Google Cloud**
- **Custo**: R$ 50-100/mês
- **Vantagem**: Escalabilidade máxima
- **Complexidade**: Maior

## 🚀 **Implementação Rápida (VPS):**

### **1. Criar VPS:**
```bash
# Ubuntu 22.04 LTS
# 1GB RAM, 1 CPU (suficiente)
# Provider: DigitalOcean ($6/mês)
```

### **2. Instalar Dependências:**
```bash
# SSH no servidor
sudo apt update
sudo apt install nodejs npm git
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Chrome para WhatsApp Web
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install google-chrome-stable
```

### **3. Deploy do Bot:**
```bash
# Clonar repositório
git clone https://github.com/gpropadm/pede.git
cd pede

# Instalar dependências completas
npm install --legacy-peer-deps

# Configurar environment
cp .env.example .env
nano .env
```

### **4. Configurar .env:**
```env
OPENAI_API_KEY=sk-sua-chave-real
RESTAURANT_NAME=Meu Restaurante
RESTAURANT_PHONE=5511987654321
RESTAURANT_ADDRESS=Rua das Flores, 123
PIX_KEY=restaurant@email.com
NODE_ENV=production
SKIP_WHATSAPP=false
```

### **5. Iniciar Bot:**
```bash
# Instalar PM2 para manter bot rodando
sudo npm install -g pm2

# Iniciar bot
pm2 start src/index.js --name restaurant-bot

# Ver logs
pm2 logs restaurant-bot

# Configurar auto-start
pm2 startup
pm2 save
```

## 📱 **Fluxo do Bot Automático:**

### **Conversa Típica:**
```
Cliente: "Olá! Estou na mesa 5. Gostaria de fazer um pedido."

Bot: "🍽️ Olá! Bem-vindo ao Meu Restaurante! 
Mesa 5 confirmada para quantas pessoas?"

Cliente: "Somos 3 pessoas"

Bot: "Perfeito! 3 pessoas na mesa 5. 
Aqui está nosso cardápio:

🥗 ENTRADAS:
• Bruschetta - R$ 18,90
• Bolinho de Bacalhau - R$ 24,90

🍽️ PRATOS PRINCIPAIS:
• Hambúrguer Artesanal - R$ 32,90
• Salmão Grelhado - R$ 45,90

O que gostariam de pedir?"

Cliente: "2 hambúrgueres e 1 coca"

Bot: "Ótima escolha! Confirmando:
• 2x Hambúrguer Artesanal - R$ 65,80
• 1x Coca-Cola - R$ 6,90

💰 Total: R$ 72,70
⏰ Tempo estimado: 25 minutos

Confirma este pedido?"

Cliente: "Sim"

Bot: "✅ Pedido confirmado!
Pedido #123 - Mesa 5

💳 Pagamento:
1️⃣ PIX: restaurant@email.com
2️⃣ Chamar garçom para cartão/dinheiro

Como prefere pagar?"
```

## 🔧 **Código do Bot Inteligente:**

### **Principais Features:**
- 🧠 **IA Conversacional**: Entende linguagem natural
- 📋 **Gestão de Pedidos**: Carrinho automático
- 💰 **Cálculos**: Preços e totais automáticos
- 📱 **Multi-sessão**: Várias mesas simultâneas
- 🍳 **Cozinha**: Pedidos em tempo real
- 💳 **Pagamentos**: PIX automático

## 💰 **Custos Operacionais:**

### **Mensal:**
- **VPS**: R$ 30-50
- **OpenAI API**: R$ 50-100 (depende do uso)
- **Total**: R$ 80-150/mês

### **Por Restaurante:**
- **Charge**: R$ 300/mês + 3% por pedido
- **Lucro**: R$ 150-220/mês por cliente
- **ROI**: 200-300%

## 🎯 **Próximos Passos:**

### **Para Implementar:**
1. **Escolher VPS** (DigitalOcean recomendado)
2. **Configurar servidor** seguindo o guide
3. **Deploy do bot completo**
4. **Testar com WhatsApp real**
5. **Ajustar respostas da IA**

### **Para Vender:**
1. **Demo funcionando** (já temos!)
2. **Bot automático** (implementando)
3. **Case study** com métricas
4. **Proposta comercial** estruturada

## 🚀 **Status Atual:**

- ✅ **QR Codes**: Funcionando
- ✅ **WhatsApp Integration**: Validado  
- ✅ **Sistema Base**: Pronto
- 🔄 **Bot Automático**: Em implementação
- ⏳ **Deploy VPS**: Próximo passo

**Quer que eu configure um VPS para você testar o bot completo?** 🤖