import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

class QRCodeGenerator {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }

    async generateTableQRCode(tableNumber, platform = 'whatsapp') {
        try {
            const qrData = this.generateQRData(tableNumber, platform);
            const filename = `mesa-${tableNumber}-${platform}.png`;
            const filepath = path.join('./qr-codes', filename);
            
            // Ensure directory exists
            await fs.mkdir('./qr-codes', { recursive: true });
            
            // Generate QR code
            await QRCode.toFile(filepath, qrData, {
                type: 'png',
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            });
            
            console.log(`QR Code generated: ${filepath}`);
            return {
                filepath,
                filename,
                qrData,
                tableNumber,
                platform
            };
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            throw error;
        }
    }

    generateQRData(tableNumber, platform) {
        const restaurantPhone = process.env.RESTAURANT_PHONE || '5511999999999';
        const restaurantName = process.env.RESTAURANT_NAME || 'Nosso Restaurante';
        
        if (platform === 'whatsapp') {
            const message = encodeURIComponent(
                `Olá! Estou na mesa ${tableNumber} do ${restaurantName}. Gostaria de fazer um pedido.`
            );
            return `https://wa.me/${restaurantPhone.replace(/[^0-9]/g, '')}?text=${message}`;
        } else if (platform === 'telegram') {
            const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'restaurant_bot';
            const message = encodeURIComponent(`Mesa ${tableNumber} - ${restaurantName}`);
            return `https://t.me/${botUsername}?start=${message}`;
        }
        
        // Default web interface
        return `${this.baseUrl}/order?table=${tableNumber}`;
    }

    async generateAllTableQRCodes(tableCount = 10, platforms = ['whatsapp', 'telegram']) {
        const results = [];
        
        for (let tableNumber = 1; tableNumber <= tableCount; tableNumber++) {
            for (const platform of platforms) {
                try {
                    const result = await this.generateTableQRCode(tableNumber, platform);
                    results.push(result);
                } catch (error) {
                    console.error(`Error generating QR for table ${tableNumber} (${platform}):`, error);
                }
            }
        }
        
        return results;
    }

    async generatePrintableSheet(tableNumbers = [], platform = 'whatsapp') {
        try {
            const htmlContent = await this.generatePrintableHTML(tableNumbers, platform);
            const htmlPath = path.join('./qr-codes', `impressao-${platform}.html`);
            
            await fs.writeFile(htmlPath, htmlContent);
            
            console.log(`Printable sheet generated: ${htmlPath}`);
            return htmlPath;
            
        } catch (error) {
            console.error('Error generating printable sheet:', error);
            throw error;
        }
    }

    async generatePrintableHTML(tableNumbers, platform) {
        const restaurantName = process.env.RESTAURANT_NAME || 'Nosso Restaurante';
        
        let qrCodesHTML = '';
        
        for (const tableNumber of tableNumbers) {
            const qrData = this.generateQRData(tableNumber, platform);
            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            qrCodesHTML += `
                <div class="qr-container">
                    <h3>Mesa ${tableNumber}</h3>
                    <img src="${qrCodeDataURL}" alt="QR Code Mesa ${tableNumber}">
                    <p class="instructions">
                        📱 Escaneie para fazer seu pedido<br>
                        via ${platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                    </p>
                    <p class="table-number">MESA ${tableNumber}</p>
                </div>
            `;
        }
        
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Codes - ${restaurantName}</title>
    <style>
        @page {
            size: A4;
            margin: 1cm;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        
        .header h1 {
            margin: 0;
            color: #333;
            font-size: 28px;
        }
        
        .header p {
            margin: 5px 0;
            color: #666;
            font-size: 16px;
        }
        
        .qr-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            justify-items: center;
        }
        
        .qr-container {
            text-align: center;
            padding: 20px;
            border: 2px solid #333;
            border-radius: 10px;
            background: #f9f9f9;
            page-break-inside: avoid;
            width: 250px;
        }
        
        .qr-container h3 {
            margin: 0 0 15px 0;
            font-size: 24px;
            color: #333;
            font-weight: bold;
        }
        
        .qr-container img {
            display: block;
            margin: 0 auto 15px auto;
            border: 1px solid #ddd;
        }
        
        .instructions {
            font-size: 14px;
            color: #555;
            margin: 10px 0;
            line-height: 1.4;
        }
        
        .table-number {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin: 10px 0 0 0;
            padding: 8px;
            background: #333;
            color: white;
            border-radius: 5px;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .qr-container {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${restaurantName}</h1>
        <p>Códigos QR para Pedidos via ${platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</p>
        <p>Escaneie o QR code da sua mesa para fazer pedidos pelo celular</p>
    </div>
    
    <div class="qr-grid">
        ${qrCodesHTML}
    </div>
    
    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
        <p>Gerado automaticamente pelo sistema de pedidos digital</p>
        <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
</body>
</html>`;
    }

    async generateMenuQRCode(platform = 'whatsapp') {
        try {
            const qrData = this.generateMenuQRData(platform);
            const filename = `cardapio-${platform}.png`;
            const filepath = path.join('./qr-codes', filename);
            
            await fs.mkdir('./qr-codes', { recursive: true });
            
            await QRCode.toFile(filepath, qrData, {
                type: 'png',
                width: 400,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            return {
                filepath,
                filename,
                qrData,
                platform
            };
            
        } catch (error) {
            console.error('Error generating menu QR code:', error);
            throw error;
        }
    }

    generateMenuQRData(platform) {
        const restaurantPhone = process.env.RESTAURANT_PHONE || '5511999999999';
        const restaurantName = process.env.RESTAURANT_NAME || 'Nosso Restaurante';
        
        if (platform === 'whatsapp') {
            const message = encodeURIComponent(
                `Olá! Gostaria de ver o cardápio do ${restaurantName}.`
            );
            return `https://wa.me/${restaurantPhone.replace(/[^0-9]/g, '')}?text=${message}`;
        } else if (platform === 'telegram') {
            const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'restaurant_bot';
            return `https://t.me/${botUsername}?start=menu`;
        }
        
        return `${this.baseUrl}/menu`;
    }
}

export default QRCodeGenerator;