export default function handler(req, res) {
  res.status(200).json({
    success: true,
    data: {
      restaurantPhone: process.env.RESTAURANT_PHONE || '5511999999999',
      restaurantName: process.env.RESTAURANT_NAME || 'Meu Restaurante',
      restaurantAddress: process.env.RESTAURANT_ADDRESS || 'São Paulo, SP',
      pixKey: process.env.PIX_KEY || 'restaurant@email.com'
    }
  });
}