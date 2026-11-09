CREATE TABLE fila (id TEXT PRIMARY KEY, recibo TEXT NOT NULL, estado TEXT NOT NULL, pedido TEXT, resultado TEXT, expira INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX fila_expira ON fila(expira);
--> statement-breakpoint
CREATE TABLE conexao (id INTEGER PRIMARY KEY, ultima INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE limites (chave TEXT PRIMARY KEY, total INTEGER NOT NULL, expira INTEGER NOT NULL);
