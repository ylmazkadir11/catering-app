-- ============================================================
-- Catering Yönetim Sistemi - PostgreSQL Veritabanı Şeması
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,   -- 'admin', 'chef', 'depot'
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
    ('admin', 'Sistem Yöneticisi'),
    ('chef', 'Şef - Menü, Reçete ve Üretim'),
    ('depot', 'Depo - Stok ve Malzeme')
ON CONFLICT (name) DO NOTHING;

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    role_id       INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active     BOOLEAN DEFAULT TRUE,
    fcm_token     VARCHAR(500),
    last_login    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role_id    ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_username   ON users(username);

-- Varsayılan Kullanıcılar (Şifreler: admin123, chef123, depo123)
INSERT INTO users (username, email, password_hash, full_name, role_id)
SELECT 'admin', 'admin@catering.local', '$2b$10$HQQ1EbZO13JjLlrg.l7PDOXMR7zll7ZFYNoHXeX70eFz7SDuF4mui', 'Sistem Yöneticisi', r.id
FROM roles r WHERE r.name = 'admin'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, password_hash, full_name, role_id)
SELECT 'chef', 'chef@catering.local', '$2b$10$c2BnPFkKFL.69ccFUkvTd.VhjwvpTfTraHR5my//hymiUPL86NFL.', 'Baş Şef Mehmet', r.id
FROM roles r WHERE r.name = 'chef'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, password_hash, full_name, role_id)
SELECT 'depo', 'depo@catering.local', '$2b$10$cNo289CoWO6a8pF2XyZ58urKMWfZq9kJeMRNMGojK/0sJb12IPhpO', 'Depo Sorumlusu Ali', r.id
FROM roles r WHERE r.name = 'depot'
ON CONFLICT (username) DO NOTHING;

-- 3. UNITS
CREATE TABLE IF NOT EXISTS units (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(50) UNIQUE NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO units (name, abbreviation) VALUES
    ('Gram', 'gr'),
    ('Kilogram', 'kg'),
    ('Mililitre', 'ml'),
    ('Litre', 'lt'),
    ('Adet', 'adet'),
    ('Demet', 'demet'),
    ('Porsiyon', 'por'),
    ('Paket', 'pkt')
ON CONFLICT (name) DO NOTHING;

-- 4. MATERIALS
CREATE TABLE IF NOT EXISTS materials (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100) UNIQUE NOT NULL,
    category      VARCHAR(50),
    unit_id       INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    minimum_stock NUMERIC(10,3) DEFAULT 0,
    current_stock NUMERIC(10,3) DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_name    ON materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_unit_id ON materials(unit_id);

-- 5. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no    VARCHAR(100) UNIQUE NOT NULL,
    supplier_name VARCHAR(150),
    invoice_date  DATE NOT NULL,
    total_amount  NUMERIC(12,2) DEFAULT 0,
    notes         TEXT,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices(invoice_no);

-- 6. BATCHES (FIFO Partileri)
CREATE TABLE IF NOT EXISTS batches (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id        UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    invoice_id         UUID REFERENCES invoices(id) ON DELETE SET NULL,
    batch_number       VARCHAR(100),
    entry_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date        DATE,
    quantity_entered   NUMERIC(10,3) NOT NULL,
    quantity_remaining NUMERIC(10,3) NOT NULL,
    unit_price         NUMERIC(10,4),
    total_price        NUMERIC(12,2),
    is_exhausted       BOOLEAN DEFAULT FALSE,
    created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_fifo ON batches(material_id, entry_date ASC, is_exhausted);

-- 7. RECIPES
CREATE TABLE IF NOT EXISTS recipes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) UNIQUE NOT NULL,
    category    VARCHAR(50),
    description TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 8. RECIPE_ITEMS (Kişi Başı Gramaj)
CREATE TABLE IF NOT EXISTS recipe_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    quantity    NUMERIC(10,3) NOT NULL,
    unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT recipe_item_unique UNIQUE(recipe_id, material_id)
);

-- 9. MENUS
CREATE TABLE IF NOT EXISTS menus (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_date   DATE UNIQUE NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes       TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MENU_ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id    UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    meal_type  VARCHAR(20) NOT NULL,
    recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT menu_item_unique UNIQUE(menu_id, meal_type, recipe_id)
);

-- 11. PRODUCTIONS
CREATE TABLE IF NOT EXISTS productions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id          UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
    production_date  DATE NOT NULL,
    meal_type        VARCHAR(20) NOT NULL,
    person_count     INTEGER NOT NULL,
    status           VARCHAR(20) DEFAULT 'draft',
    confirmed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at     TIMESTAMPTZ,
    cancelled_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at     TIMESTAMPTZ,
    report_generated BOOLEAN DEFAULT FALSE,
    notes            TEXT,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PRODUCTION_ITEMS
CREATE TABLE IF NOT EXISTS production_items (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_id  UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
    material_id    UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    calculated_qty NUMERIC(10,3) NOT NULL,
    actual_qty     NUMERIC(10,3) NOT NULL,
    unit_id        INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    total_cost     NUMERIC(12,2) DEFAULT 0,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT production_item_unique UNIQUE(production_id, material_id)
);

-- 13. STOCK_MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id    UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    batch_id       UUID REFERENCES batches(id) ON DELETE SET NULL,
    movement_type  VARCHAR(20) NOT NULL,
    quantity       NUMERIC(10,3) NOT NULL,
    unit_price     NUMERIC(10,4),
    total_cost     NUMERIC(12,2),
    reference_type VARCHAR(30),
    reference_id   UUID,
    production_id  UUID REFERENCES productions(id) ON DELETE SET NULL,
    invoice_id     UUID REFERENCES invoices(id) ON DELETE SET NULL,
    notes          TEXT,
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 14. LOGS
CREATE TABLE IF NOT EXISTS logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    username    VARCHAR(50) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    old_data    JSONB,
    new_data    JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- 15. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    body         TEXT NOT NULL,
    type         VARCHAR(50) NOT NULL,
    reference_id UUID,
    is_read      BOOLEAN DEFAULT FALSE,
    sent_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ÖRNEK BAŞLANGIÇ VERİLERİ (Demo için malzemeler ve yemekler)
DO $$
DECLARE
  kg_id INT;
  lt_id INT;
  adet_id INT;
  gr_id INT;
  et_id UUID;
  pirinc_id UUID;
  yag_id UUID;
  salca_id UUID;
  rec_kavurma UUID;
  rec_pilav UUID;
  admin_id UUID;
BEGIN
  SELECT id INTO kg_id FROM units WHERE abbreviation = 'kg' LIMIT 1;
  SELECT id INTO lt_id FROM units WHERE abbreviation = 'lt' LIMIT 1;
  SELECT id INTO adet_id FROM units WHERE abbreviation = 'adet' LIMIT 1;
  SELECT id INTO gr_id FROM units WHERE abbreviation = 'gr' LIMIT 1;
  SELECT id INTO admin_id FROM users WHERE username = 'admin' LIMIT 1;

  -- Örnek Malzemeler
  INSERT INTO materials (name, category, unit_id, minimum_stock, current_stock, created_by)
  VALUES ('Dana Kuşbaşı', 'Et & Tavuk', kg_id, 20.0, 50.0, admin_id)
  RETURNING id INTO et_id;

  INSERT INTO materials (name, category, unit_id, minimum_stock, current_stock, created_by)
  VALUES ('Baldo Pirinç', 'Bakliyat', kg_id, 30.0, 100.0, admin_id)
  RETURNING id INTO pirinc_id;

  INSERT INTO materials (name, category, unit_id, minimum_stock, current_stock, created_by)
  VALUES ('Ayçiçek Yağı', 'Kuru Gıda', lt_id, 15.0, 40.0, admin_id)
  RETURNING id INTO yag_id;

  INSERT INTO materials (name, category, unit_id, minimum_stock, current_stock, created_by)
  VALUES ('Domates Salçası', 'Baharat & Sos', kg_id, 10.0, 25.0, admin_id)
  RETURNING id INTO salca_id;

  -- İlk Parti Girişleri (FIFO Testi için)
  INSERT INTO batches (material_id, batch_number, entry_date, expiry_date, quantity_entered, quantity_remaining, unit_price, total_price, created_by)
  VALUES (et_id, 'ET-2026-P1', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 50.0, 50.0, 380.00, 19000.00, admin_id);

  INSERT INTO batches (material_id, batch_number, entry_date, expiry_date, quantity_entered, quantity_remaining, unit_price, total_price, created_by)
  VALUES (pirinc_id, 'PRN-2026-P1', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '180 days', 100.0, 100.0, 65.00, 6500.00, admin_id);

  INSERT INTO batches (material_id, batch_number, entry_date, expiry_date, quantity_entered, quantity_remaining, unit_price, total_price, created_by)
  VALUES (yag_id, 'YAG-2026-P1', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '300 days', 40.0, 40.0, 75.00, 3000.00, admin_id);

  INSERT INTO batches (material_id, batch_number, entry_date, expiry_date, quantity_entered, quantity_remaining, unit_price, total_price, created_by)
  VALUES (salca_id, 'SLC-2026-P1', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '90 days', 25.0, 25.0, 85.00, 2125.00, admin_id);

  -- Örnek Reçeteler
  INSERT INTO recipes (name, category, description, created_by)
  VALUES ('Dana Kavurma', 'Ana Yemek', 'Özel baharatlarla pişirilen lezzetli dana kavurma', admin_id)
  RETURNING id INTO rec_kavurma;

  INSERT INTO recipe_items (recipe_id, material_id, quantity, unit_id)
  VALUES (rec_kavurma, et_id, 0.150, kg_id); -- Kişi başı 150 gr et

  INSERT INTO recipe_items (recipe_id, material_id, quantity, unit_id)
  VALUES (rec_kavurma, yag_id, 0.020, lt_id); -- Kişi başı 20 ml yağ

  INSERT INTO recipes (name, category, description, created_by)
  VALUES ('Pirinç Pilavı', 'Pilav & Makarna', 'Geleneksel tereyağlı tane tane pirinç pilavı', admin_id)
  RETURNING id INTO rec_pilav;

  INSERT INTO recipe_items (recipe_id, material_id, quantity, unit_id)
  VALUES (rec_pilav, pirinc_id, 0.080, kg_id); -- Kişi başı 80 gr pirinç

  INSERT INTO recipe_items (recipe_id, material_id, quantity, unit_id)
  VALUES (rec_pilav, yag_id, 0.015, lt_id); -- Kişi başı 15 ml yağ
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
