export default function handler(req, res) {
  const html = `
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
        .qr-link { display: block; margin: 5px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Restaurant Chatbot - Admin</h1>
            <p>Painel de controle do sistema de pedidos</p>
        </div>

        <div class="grid">
            <div class="section">
                <h3>📊 Status do Sistema</h3>
                <div class="status success">
                    ✅ API funcionando<br>
                    ✅ Serverless ativo<br>
                    ✅ Deploy na Vercel<br>
                    🌐 Pronto para uso
                </div>
                <button class="button" onclick="testAPI()">Testar API</button>
                <div id="api-result"></div>
            </div>

            <div class="section">
                <h3>🍽️ Cardápio</h3>
                <p><strong>Categorias:</strong> 4</p>
                <p><strong>Itens:</strong> 10</p>
                <button class="button" onclick="loadMenu()">Carregar Cardápio</button>
                <div id="menu-display"></div>
            </div>

            <div class="section">
                <h3>📱 Gerar QR Codes</h3>
                <label>Número de mesas: <input type="number" id="table-count" value="5" min="1" max="20"></label><br><br>
                <button class="button" onclick="generateQRs()">Gerar QR Codes</button>
                <div id="qr-results"></div>
            </div>

            <div class="section">
                <h3>💰 Modelo de Negócio</h3>
                <div style="text-align: left;">
                    <p><strong>💵 Preço:</strong> R$ 300/mês por restaurante</p>
                    <p><strong>💳 Comissão:</strong> 3% por pedido processado</p>
                    <p><strong>🎯 Mercado:</strong> 1M+ restaurantes no Brasil</p>
                    <p><strong>📈 Potencial:</strong> R$ 300M+ anuais</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>🚀 Funcionalidades Demo</h3>
            <div style="text-align: left;">
                <p>✅ <strong>API REST:</strong> Cardápio e pedidos funcionais</p>
                <p>✅ <strong>QR Codes:</strong> Links diretos para WhatsApp</p>
                <p>✅ <strong>Dashboard:</strong> Interface administrativa</p>
                <p>✅ <strong>Serverless:</strong> Escalável automaticamente</p>
                <p>⚠️ <strong>WhatsApp Bot:</strong> Precisa VPS para produção</p>
                <p>⚠️ <strong>IA Conversacional:</strong> LangChain + OpenAI</p>
            </div>
        </div>
    </div>

    <script>
        async function testAPI() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                document.getElementById('api-result').innerHTML = 
                    '<div class="status success">✅ API respondendo: ' + data.message + '</div>';
            } catch (error) {
                document.getElementById('api-result').innerHTML = 
                    '<div class="status" style="background: #f8d7da; color: #721c24;">❌ Erro: ' + error.message + '</div>';
            }
        }

        async function loadMenu() {
            try {
                const response = await fetch('/api/menu');
                const data = await response.json();
                let html = '<h4>Cardápio Carregado:</h4>';
                data.data.categories.forEach(cat => {
                    html += '<h5>' + cat.name + '</h5>';
                    const items = data.data.items.filter(item => item.category_id === cat.id);
                    items.forEach(item => {
                        html += '<p>• ' + item.name + ' - R$ ' + item.price.toFixed(2) + '<br><small>' + item.description + '</small></p>';
                    });
                });
                document.getElementById('menu-display').innerHTML = html;
            } catch (error) {
                document.getElementById('menu-display').innerHTML = 
                    '<div class="status" style="background: #f8d7da; color: #721c24;">❌ Erro: ' + error.message + '</div>';
            }
        }

        function generateQRs() {
            const count = document.getElementById('table-count').value;
            const restaurantPhone = '5511999999999';
            const restaurantName = 'Meu Restaurante';
            
            let html = '<h4>QR Codes Gerados:</h4>';
            for (let i = 1; i <= count; i++) {
                const message = encodeURIComponent('Olá! Estou na mesa ' + i + ' do ' + restaurantName + '. Gostaria de fazer um pedido.');
                const qrData = 'https://wa.me/' + restaurantPhone + '?text=' + message;
                
                html += '<div class="qr-link">';
                html += '<strong>Mesa ' + i + ':</strong><br>';
                html += '<a href="' + qrData + '" target="_blank">' + qrData + '</a>';
                html += '</div>';
            }
            document.getElementById('qr-results').innerHTML = html;
        }

        // Auto-load on page load
        window.onload = function() {
            testAPI();
        };
    </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}