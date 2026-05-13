CREATE TABLE IF NOT EXISTS sent_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_link TEXT,
  recipient_count INTEGER DEFAULT 0,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sent_offer_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offer_id INTEGER NOT NULL,
  lead_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  track_token TEXT UNIQUE,
  opened_at TEXT,
  clicked_at TEXT,
  send_status TEXT DEFAULT 'sent',
  FOREIGN KEY (offer_id) REFERENCES sent_offers(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
