CREATE TABLE private_rooms(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TABLE encrypted_items(id TEXT PRIMARY KEY,room TEXT NOT NULL,data TEXT NOT NULL,iv TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
CREATE INDEX encrypted_room ON encrypted_items(room);
