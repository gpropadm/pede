# 🚀 Deploy para Produção

## 📋 **Checklist Antes do Deploy**

### ✅ **1. Configurações Obrigatórias**
- [ ] OpenAI API Key configurada
- [ ] Variáveis de ambiente do restaurante
- [ ] Número de telefone válido para WhatsApp
- [ ] Chave PIX para pagamentos

### ✅ **2. Deploy na Vercel**

#### **Passo 1: GitHub**
```bash
git init
git add .
git commit -m "🤖 Restaurant Chatbot - Sistema completo"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/restaurant-chatbot.git
git push -u origin main
```

#### **Passo 2: Vercel Dashboard**
1. Acesse [vercel.com](https://vercel.com)
2. Conecte com GitHub
3. Import repository: `restaurant-chatbot`
4. Configure Environment Variables:

```env
OPENAI_API_KEY=sk-sua-chave-aqui
RESTAURANT_NAME=Nome do Seu Restaurante  
RESTAURANT_PHONE=+5511999999999
RESTAURANT_ADDRESS=Seu Endereço Completo
PIX_KEY=sua-chave-pix@email.com
NODE_ENV=production
```

#### **Passo 3: Deploy**
- Clique "Deploy"
- Aguarde 2-3 minutos
- Acesse: `https://seu-app.vercel.app`

## 🔧 **Configurações Pós-Deploy**

### **1. Teste o Sistema**
```bash
# Health check
curl https://seu-app.vercel.app/health

# Admin panel
https://seu-app.vercel.app/admin

# API de cardápio
https://seu-app.vercel.app/api/menu
```

### **2. Gere QR Codes para Produção**
1. Acesse: `https://seu-app.vercel.app/admin`
2. Configure número de mesas
3. Gere QR codes com URLs reais
4. Baixe folha para impressão

### **3. Configure WhatsApp Business**
```bash
# No admin panel:
1. Acesse /admin
2. Veja QR code do WhatsApp
3. Escaneie com WhatsApp Business
4. Status mudará para "ready"
```

## 📱 **URLs Importantes**

### **Para Clientes:**
- QR Codes apontam para: `https://wa.me/SEU-NUMERO?text=Mesa%201`
- Conversação direta no WhatsApp

### **Para Você (Admin):**
- **Dashboard**: `https://seu-app.vercel.app/admin`
- **API**: `https://seu-app.vercel.app/api/*`
- **Health**: `https://seu-app.vercel.app/health`

## 💰 **Monetização**

### **Modelo de Cobrança:**
- **R$ 300/mês** por restaurante
- **3%** por pedido processado
- **R$ 2.000** setup + treinamento

### **Planos:**
- **Básico**: R$ 200/mês (100 pedidos)
- **Pro**: R$ 500/mês (ilimitado + analytics)
- **Enterprise**: R$ 1.000/mês (múltiplos restaurantes)

## 🎯 **Próximos Recursos**

### **Versão 2.0:**
- [ ] Multi-restaurantes na mesma instância
- [ ] Analytics avançados
- [ ] Integração Mercado Pago
- [ ] App mobile para garçons
- [ ] Relatórios financeiros

### **Integrações:**
- [ ] iFood delivery
- [ ] Uber Eats
- [ ] Sistema de estoque
- [ ] ERP restaurante

## 🚨 **Troubleshooting**

### **Deploy falhou?**
```bash
# Verifique logs na Vercel
# Problemas comuns:
1. API Key do OpenAI inválida
2. Dependências não instaladas
3. Variáveis de ambiente faltando
```

### **WhatsApp não conecta?**
```bash
# No ambiente de produção:
1. QR code pode demorar aparecer
2. Use WhatsApp Business
3. Verifique logs do admin panel
```

## 🎉 **Sistema em Produção!**

**Parabéns! Seu chatbot está funcionando 24/7 na web!**

- ✅ Clientes podem fazer pedidos
- ✅ Pagamentos via PIX funcionando  
- ✅ Admin panel para controle
- ✅ QR codes reais para impressão
- ✅ Sistema escalável e profissional

**Próximo passo: Vender para restaurantes! 🚀**