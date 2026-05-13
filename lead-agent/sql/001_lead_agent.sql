CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_number TEXT UNIQUE,
  company_name TEXT,
  organization_form TEXT,
  industry_code TEXT,
  industry_name TEXT,
  city TEXT,
  municipality TEXT,
  county TEXT,
  address TEXT,
  registration_date TEXT,
  website_url TEXT,
  has_website INTEGER DEFAULT 0,
  facebook_url TEXT,
  instagram_url TEXT,
  owner_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  lead_score INTEGER DEFAULT 0,
  lead_status TEXT CHECK(lead_status IN ('new','researched','draft_ready','approved','contacted','rejected')) DEFAULT 'new',
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lead_research (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  source TEXT,
  data_json TEXT,
  summary TEXT,
  created_at TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS email_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  subject TEXT,
  body TEXT,
  offer_type TEXT,
  tone TEXT,
  status TEXT CHECK(status IN ('draft','approved','sent','rejected')) DEFAULT 'draft',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
