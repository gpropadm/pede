-- Restaurant Menu Database Schema

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT 1,
    preparation_time INTEGER DEFAULT 15, -- minutes
    ingredients TEXT, -- JSON array
    allergens TEXT, -- JSON array
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Tables table
CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    qr_code TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_id INTEGER,
    customer_phone TEXT,
    customer_name TEXT,
    platform TEXT NOT NULL, -- 'whatsapp' or 'telegram'
    chat_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, ready, delivered, cancelled
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT, -- 'pix', 'card', 'cash', 'attendant'
    payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
    special_instructions TEXT,
    estimated_time INTEGER, -- minutes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL,
    customer_phone TEXT,
    customer_name TEXT,
    table_id INTEGER,
    current_order_id INTEGER,
    session_data TEXT, -- JSON with conversation context
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id),
    FOREIGN KEY (current_order_id) REFERENCES orders(id)
);

-- Insert sample data
INSERT OR IGNORE INTO categories (name, description, sort_order) VALUES
('Entradas', 'Pratos para começar bem a refeição', 1),
('Pratos Principais', 'Nossos pratos principais deliciosos', 2),
('Bebidas', 'Bebidas refrescantes e quentes', 3),
('Sobremesas', 'Doces para finalizar com chave de ouro', 4);

INSERT OR IGNORE INTO menu_items (category_id, name, description, price, preparation_time) VALUES
(1, 'Bruschetta', 'Pão italiano com tomate, manjericão e azeite', 18.90, 10),
(1, 'Bolinho de Bacalhau', '6 unidades com molho especial', 24.90, 15),
(2, 'Hambúrguer Artesanal', 'Hambúrguer 180g, queijo, alface, tomate e batata', 32.90, 20),
(2, 'Salmão Grelhado', 'Salmão com legumes e arroz integral', 45.90, 25),
(2, 'Risotto de Camarão', 'Risotto cremoso com camarões frescos', 38.90, 30),
(3, 'Coca-Cola 350ml', 'Refrigerante gelado', 6.90, 2),
(3, 'Suco Natural de Laranja', 'Suco fresco 400ml', 8.90, 5),
(3, 'Caipirinha', 'Caipirinha tradicional', 14.90, 5),
(4, 'Pudim de Leite', 'Pudim caseiro com calda de caramelo', 12.90, 5),
(4, 'Petit Gateau', 'Bolinho quente com sorvete de baunilha', 16.90, 15);

INSERT OR IGNORE INTO tables (table_number, capacity) VALUES
(1, 2), (2, 4), (3, 2), (4, 6), (5, 4), (6, 2), (7, 8), (8, 4), (9, 2), (10, 4);