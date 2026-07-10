-- Personal ingest token for the browser extension. A member mints a token in
-- settings and pastes it into the extension; requests carrying it authenticate
-- as that user. We store only the SHA-256 hash (hex) -- the raw token is shown
-- once at generation and never persisted. Nullable: unset until a member mints
-- one. Never add this column to a client-facing select projection.
alter table public.users
  add column ingest_token_hash text;

-- One token per hash: lets us resolve a user from a presented token by exact
-- hash match, and makes a leaked hash useless without the raw preimage.
create unique index users_ingest_token_hash_key
  on public.users (ingest_token_hash)
  where ingest_token_hash is not null;
