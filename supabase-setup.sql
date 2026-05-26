-- ===================================================
-- Supabase テーブル作成 & RLS 設定 SQL
-- Supabase Dashboard > SQL Editor で実行してください
-- ===================================================

-- membersテーブル（未作成の場合）
CREATE TABLE IF NOT EXISTS members (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- gamesテーブル（未作成の場合）
CREATE TABLE IF NOT EXISTS games (
  id          BIGSERIAL PRIMARY KEY,
  member_name TEXT NOT NULL,
  season      TEXT NOT NULL,
  year        INTEGER NOT NULL,
  date        DATE NOT NULL,
  opponent    TEXT,
  pa          INTEGER DEFAULT 0,
  ab          INTEGER DEFAULT 0,
  h           INTEGER DEFAULT 0,
  rbi         INTEGER DEFAULT 0,
  hr          INTEGER DEFAULT 0,
  b2          INTEGER DEFAULT 0,
  b3          INTEGER DEFAULT 0,
  bb          INTEGER DEFAULT 0,
  so          INTEGER DEFAULT 0,
  sb          INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- RLS (Row Level Security) ポリシー設定
-- 認証なしで全操作を許可する設定
-- ===================================================

-- membersテーブルのRLS有効化
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- membersテーブル: 全員が読み書き可能
DROP POLICY IF EXISTS "members_select" ON members;
DROP POLICY IF EXISTS "members_insert" ON members;
DROP POLICY IF EXISTS "members_delete" ON members;

CREATE POLICY "members_select" ON members FOR SELECT TO anon USING (true);
CREATE POLICY "members_insert" ON members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "members_delete" ON members FOR DELETE TO anon USING (true);

-- gamesテーブルのRLS有効化
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- gamesテーブル: 全員が読み書き可能
DROP POLICY IF EXISTS "games_select" ON games;
DROP POLICY IF EXISTS "games_insert" ON games;
DROP POLICY IF EXISTS "games_delete" ON games;

CREATE POLICY "games_select" ON games FOR SELECT TO anon USING (true);
CREATE POLICY "games_insert" ON games FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "games_delete" ON games FOR DELETE TO anon USING (true);
