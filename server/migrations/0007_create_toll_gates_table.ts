
export const createTollGatesTable = `
  CREATE TABLE IF NOT EXISTS toll_gates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    operator TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    operating_hours TEXT DEFAULT '24/7',
    is_active BOOLEAN DEFAULT true,
    car_price INTEGER DEFAULT 200,
    bus_price INTEGER DEFAULT 300,
    truck_price INTEGER DEFAULT 500,
    motorcycle_price INTEGER DEFAULT 150,
    traffic_status TEXT DEFAULT 'light',
    queue_time TEXT DEFAULT '2-3 minutes',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO toll_gates (id, name, location, operator, latitude, longitude, car_price, bus_price, truck_price) VALUES
  ('TG_VI_001', 'Third Mainland Bridge Toll', 'Victoria Island, Lagos', 'Lagos State Government', 6.4281, 3.4219, 200, 300, 500),
  ('TG_LK_002', 'Lekki-Ikoyi Link Bridge', 'Lekki, Lagos', 'Lekki Concession Company', 6.4474, 3.4553, 250, 400, 600),
  ('TG_LA_003', 'Lagos-Ibadan Expressway Toll', 'Berger, Lagos', 'Lagos State Government', 6.5568, 3.3515, 300, 450, 700);
`;
