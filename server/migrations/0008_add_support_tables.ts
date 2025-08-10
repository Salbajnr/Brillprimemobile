
import { Client } from 'pg';

export async function up(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      ticket_number VARCHAR(20) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      user_role VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'OPEN',
      priority VARCHAR(20) DEFAULT 'NORMAL',
      assigned_to INTEGER REFERENCES admin_users(id),
      admin_notes TEXT,
      resolution TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS support_responses (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER REFERENCES support_tickets(id) NOT NULL,
      responder_id INTEGER NOT NULL,
      responder_type VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      attachments TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
    CREATE INDEX IF NOT EXISTS idx_support_responses_ticket_id ON support_responses(ticket_id);
  `);
}

export async function down(client: Client) {
  await client.query(`DROP TABLE IF EXISTS support_responses;`);
  await client.query(`DROP TABLE IF EXISTS support_tickets;`);
}
