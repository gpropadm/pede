export default function handler(req, res) {
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

  res.status(200).json({
    success: true,
    data: menuData
  });
}