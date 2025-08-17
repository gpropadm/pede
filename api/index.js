// Serverless API handler for Vercel
import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for demo
const menuData = {
  categories: [
    {id: 1, name: "Entradas", description: "Pratos para começar bem a refeição"},
    {id: 2, name: "Pratos Principais", description: "Nossos pratos principais deliciosos"},
    {id: 3, name: "Bebidas", description: "Bebidas refrescantes e quentes"},
    {id: 4, name: "Sobremesas", description: "Doces para finalizar com chave de ouro"}
  ],
  items: [
    {id: 1, category_id: 1, name: "Bruschetta", description: "Pão italiano com tomate, manjericão e azeite", price: 18.90, category: "Entradas"},
    {id: 2, category_id: 1, name: "Bolinho de Bacalhau", description: "6 unidades com molho especial", price: 24.90, category: "Entradas"},
    {id: 3, category_id: 2, name: "Hambúrguer Artesanal", description: "Hambúrguer 180g, queijo, alface, tomate e batata", price: 32.90, category: "Pratos Principais"},
    {id: 4, category_id: 2, name: "Salmão Grelhado", description: "Salmão com legumes e arroz integral", price: 45.90, category: "Pratos Principais"},
    {id: 5, category_id: 2, name: "Risotto de Camarão", description: "Risotto cremoso com camarões frescos", price: 38.90, category: "Pratos Principais"},
    {id: 6, category_id: 3, name: "Coca-Cola 350ml", description: "Refrigerante gelado", price: 6.90, category: "Bebidas"},
    {id: 7, category_id: 3, name: "Suco Natural de Laranja", description: "Suco fresco 400ml", price: 8.90, category: "Bebidas"},
    {id: 8, category_id: 3, name: "Caipirinha", description: "Caipirinha tradicional", price: 14.90, category: "Bebidas"},
    {id: 9, category_id: 4, name: "Pudim de Leite", description: "Pudim caseiro com calda de caramelo", price: 12.90, category: "Sobremesas"},
    {id: 10, category_id: 4, name: "Petit Gateau", description: "Bolinho quente com sorvete de baunilha", price: 16.90, category: "Sobremesas"}
  ]
};

const orders = [];
let orderCounter = 1;

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Restaurant Chatbot API - Serverless Version'
  });
});

app.get('/api/menu', (req, res) => {
  res.json({
    success: true,
    data: menuData
  });
});

app.get('/api/orders/today', (req, res) => {
  res.json({
    success: true,
    data: orders
  });
});

app.post('/api/orders', (req, res) => {
  const order = {
    id: orderCounter++,
    ...req.body,
    created_at: new Date().toISOString()
  };
  orders.push(order);
  
  res.json({
    success: true,
    data: order
  });
});

app.get('/api/qr/table/:number', (req, res) => {
  const tableNumber = req.params.number;
  const platform = req.query.platform || 'whatsapp';
  const restaurantPhone = process.env.RESTAURANT_PHONE || '5511999999999';
  const restaurantName = process.env.RESTAURANT_NAME || 'Meu Restaurante';
  
  let qrData;
  if (platform === 'whatsapp') {
    const message = encodeURIComponent(\`Olá! Estou na mesa \${tableNumber} do \${restaurantName}. Gostaria de fazer um pedido.\`);
    qrData = \`https://wa.me/\${restaurantPhone.replace(/[^0-9]/g, '')}?text=\${message}\`;
  } else {
    qrData = \`https://pede-rho.vercel.app/order?table=\${tableNumber}\`;
  }
  
  res.json({
    success: true,
    data: {
      tableNumber: parseInt(tableNumber),
      platform,
      qrData,
      message: \`QR Code gerado para mesa \${tableNumber}\`
    }
  });
});

app.get('/api/qr/generate-all', (req, res) => {
  const tableCount = parseInt(req.query.tables) || 5;
  const platform = req.query.platform || 'whatsapp';
  const results = [];
  
  for (let i = 1; i <= tableCount; i++) {
    const restaurantPhone = process.env.RESTAURANT_PHONE || '5511999999999';
    const restaurantName = process.env.RESTAURANT_NAME || 'Meu Restaurante';
    
    let qrData;
    if (platform === 'whatsapp') {
      const message = encodeURIComponent(\`Olá! Estou na mesa \${i} do \${restaurantName}. Gostaria de fazer um pedido.\`);
      qrData = \`https://wa.me/\${restaurantPhone.replace(/[^0-9]/g, '')}?text=\${message}\`;
    } else {
      qrData = \`https://pede-rho.vercel.app/order?table=\${i}\`;
    }
    
    results.push({
      tableNumber: i,
      platform,
      qrData
    });
  }
  
  res.json({
    success: true,
    data: results,
    message: \`Generated \${results.length} QR codes\`
  });
});

// Admin dashboard
app.get('/admin', (req, res) => {
  const html = \`
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
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .qr-link { display: block; margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Restaurant Chatbot - Demo</h1>
            <p>Sistema de pedidos via WhatsApp/Telegram (Versão Serverless)</p>
        </div>

        <div class="grid">
            <div class="section">
                <h3>📊 Status</h3>
                <div class="status success">
                    ✅ API funcionando<br>
                    ✅ Cardápio carregado<br>
                    ✅ QR Codes funcionais<br>
                    🌐 Rodando na Vercel
                </div>
            </div>

            <div class="section">
                <h3>🍽️ Cardápio</h3>
                <p><strong>Categorias:</strong> \${menuData.categories.length}</p>
                <p><strong>Itens:</strong> \${menuData.items.length}</p>
                <button class="button" onclick="loadMenu()">Ver Cardápio Completo</button>
                <div id="menu-display"></div>
            </div>

            <div class="section">
                <h3>📱 Gerar QR Codes</h3>
                <label>Quantidade: <input type="number" id="table-count" value="5" min="1" max="20"></label><br><br>
                <button class="button" onclick="generateQRs()">Gerar QR Codes</button>
                <div id="qr-results"></div>
            </div>

            <div class="section">
                <h3>📋 Pedidos</h3>
                <p><strong>Total hoje:</strong> \${orders.length}</p>
                <button class="button" onclick="loadOrders()">Atualizar Pedidos</button>
                <div id="orders-display"></div>
            </div>
        </div>

        <div class="section">
            <h3>🚀 Próximos Passos</h3>
            <p><strong>Esta é uma versão demo serverless.</strong> Para funcionalidade completa:</p>
            <ul>
                <li>✅ APIs funcionando perfeitamente</li>
                <li>✅ QR codes redirecionam para WhatsApp</li>
                <li>⚠️ WhatsApp bot precisa de VPS para funcionar 24/7</li>
                <li>💡 Use um servidor dedicado para bot ativo</li>
            </ul>
        </div>
    </div>

    <script>
        async function loadMenu() {
            try {
                const response = await fetch('/api/menu');
                const data = await response.json();
                let html = '<h4>Cardápio Completo:</h4>';
                data.data.categories.forEach(cat => {
                    html += \`<h5>\${cat.name}</h5>\`;
                    const items = data.data.items.filter(item => item.category_id === cat.id);
                    items.forEach(item => {
                        html += \`<p>• \${item.name} - R$ \${item.price.toFixed(2)} <br><small>\${item.description}</small></p>\`;
                    });
                });
                document.getElementById('menu-display').innerHTML = html;
            } catch (error) {
                console.error('Erro:', error);
            }
        }

        async function generateQRs() {
            const count = document.getElementById('table-count').value;
            try {
                const response = await fetch(\`/api/qr/generate-all?tables=\${count}&platform=whatsapp\`);
                const data = await response.json();
                
                let html = '<h4>QR Codes Gerados:</h4>';
                data.data.forEach(qr => {
                    html += \`<div class="qr-link">
                        <strong>Mesa \${qr.tableNumber}:</strong><br>
                        <a href="\${qr.qrData}" target="_blank">\${qr.qrData}</a>
                    </div>\`;
                });
                document.getElementById('qr-results').innerHTML = html;
            } catch (error) {
                console.error('Erro:', error);
            }
        }

        async function loadOrders() {
            try {
                const response = await fetch('/api/orders/today');
                const data = await response.json();
                let html = \`<p>Total de pedidos: \${data.data.length}</p>\`;
                document.getElementById('orders-display').innerHTML = html;
            } catch (error) {
                console.error('Erro:', error);
            }
        }
    </script>
</body>
</html>\`;

  res.send(html);
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Restaurant Chatbot API - Serverless',
    version: '1.0.0-serverless',
    endpoints: {
      admin: '/admin',
      health: '/health',
      menu: '/api/menu',
      orders: '/api/orders/today',
      qr_generator: '/api/qr/generate-all'
    }
  });
});

export default app;