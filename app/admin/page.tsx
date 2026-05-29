'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'admin123'
const SEASONS = ['春季大会', '夏季大会', '秋季大会', '練習試合']
const CURRENT_YEAR = new Date().getFullYear()

type StatsKey = 'pa' | 'ab' | 'h' | 'rbi' | 'hr' | 'b2' | 'b3' | 'bb' | 'so' | 'sb'
type StatsState = Record<StatsKey, string>
type AdminTab = 'members' | 'edit-stats'

const STAT_FIELDS: { key: StatsKey; label: string }[] = [
  { key: 'pa',  label: '打席数' },
  { key: 'ab',  label: '打数' },
  { key: 'h',   label: '安打' },
  { key: 'rbi', label: '打点' },
  { key: 'hr',  label: '本塁打' },
  { key: 'b2',  label: '二塁打' },
  { key: 'b3',  label: '三塁打' },
  { key: 'bb',  label: '四球' },
  { key: 'so',  label: '三振' },
  { key: 'sb',  label: '盗塁' },
]

const EMPTY_STATS: StatsState = { pa: '', ab: '', h: '', rbi: '', hr: '', b2: '', b3: '', bb: '', so: '', sb: '' }

interface Member {
  id: number
  name: string
  created_at: string
}

interface Game {
  id: number
  member_name: string
  season: string
  year: number
  date: string
  opponent: string | null
  pa: number
  ab: number
  h: number
  rbi: number
  hr: number
  b2: number
  b3: number
  bb: number
  so: number
  sb: number
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [adminTab, setAdminTab] = useState<AdminTab>('members')

  // 成績修正用
  const [editMember, setEditMember] = useState('')
  const [memberGames, setMemberGames] = useState<Game[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [editStats, setEditStats] = useState<StatsState>(EMPTY_STATS)
  const [editOpponent, setEditOpponent] = useState('')
  const [editSeason, setEditSeason] = useState('練習試合')
  const [editYear, setEditYear] = useState(String(CURRENT_YEAR))
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('members').select('*').order('name')
    if (data) setMembers(data)
  }, [])

  useEffect(() => {
    if (authed) fetchMembers()
  }, [authed, fetchMembers])

  useEffect(() => {
    if (!editMember) {
      setMemberGames([])
      setSelectedGame(null)
      return
    }
    async function fetchGames() {
      setLoadingGames(true)
      setSelectedGame(null)
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('member_name', editMember)
        .order('date', { ascending: false })
      setMemberGames(data ?? [])
      setLoadingGames(false)
    }
    fetchGames()
  }, [editMember])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthed(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  async function handleDelete(id: number, name: string) {
    if (deleteTarget !== id) {
      setDeleteTarget(id)
      return
    }
    setLoading(true)
    setMessage(null)
    await supabase.from('games').delete().eq('member_name', name)
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: '削除に失敗しました' })
    } else {
      setMessage({ type: 'success', text: `${name} を削除しました（成績も削除済み）` })
      setDeleteTarget(null)
      fetchMembers()
    }
    setLoading(false)
  }

  function selectGameForEdit(game: Game) {
    setSelectedGame(game)
    setEditStats({
      pa:  String(game.pa),
      ab:  String(game.ab),
      h:   String(game.h),
      rbi: String(game.rbi),
      hr:  String(game.hr),
      b2:  String(game.b2),
      b3:  String(game.b3),
      bb:  String(game.bb),
      so:  String(game.so),
      sb:  String(game.sb),
    })
    setEditOpponent(game.opponent ?? '')
    setEditSeason(game.season)
    setEditYear(String(game.year))
    setEditDate(game.date)
  }

  function setEditStat(key: StatsKey, value: string) {
    if (value === '' || /^\d+$/.test(value)) {
      setEditStats(prev => ({ ...prev, [key]: value }))
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGame) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase.from('games').update({
      season: editSeason,
      year: Number(editYear),
      date: editDate,
      opponent: editOpponent.trim() || null,
      pa:  Number(editStats.pa)  || 0,
      ab:  Number(editStats.ab)  || 0,
      h:   Number(editStats.h)   || 0,
      rbi: Number(editStats.rbi) || 0,
      hr:  Number(editStats.hr)  || 0,
      b2:  Number(editStats.b2)  || 0,
      b3:  Number(editStats.b3)  || 0,
      bb:  Number(editStats.bb)  || 0,
      so:  Number(editStats.so)  || 0,
      sb:  Number(editStats.sb)  || 0,
    }).eq('id', selectedGame.id)

    if (error) {
      setMessage({ type: 'error', text: '保存に失敗しました: ' + error.message })
    } else {
      setMessage({ type: 'success', text: `✓ ${editMember} の ${editDate} の成績を修正しました！` })
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('member_name', editMember)
        .order('date', { ascending: false })
      setMemberGames(data ?? [])
      setSelectedGame(null)
    }
    setSaving(false)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-green-800 text-white shadow-lg">
          <div className="px-4 py-4 flex items-center max-w-lg mx-auto">
            <Link href="/" className="text-white mr-3 text-xl">←</Link>
            <h1 className="text-lg font-bold">JANKIES 管理者ページ</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xs">
            <div className="text-center mb-6">
              <p className="text-4xl mb-2">🔒</p>
              <h2 className="text-lg font-bold text-gray-800">JANKIES 管理者ログイン</h2>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(false) }}
              placeholder="パスワード"
              className={`w-full border rounded-xl px-4 py-3 text-base mb-3 ${authError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              autoComplete="current-password"
            />
            {authError && (
              <p className="text-red-600 text-sm mb-3 text-center">パスワードが違います</p>
            )}
            <button type="submit" className="w-full bg-green-700 text-white py-3 rounded-xl font-bold text-base">
              ログイン
            </button>
            <Link href="/" className="block text-center text-sm text-gray-400 underline mt-4">
              成績表に戻る
            </Link>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center">
            <Link href="/" className="text-white mr-3 text-xl">←</Link>
            <h1 className="text-lg font-bold">JANKIES 管理者ページ</h1>
          </div>
          <span className="text-green-300 text-xs">🔓 ログイン中</span>
        </div>
      </header>

      {/* タブ */}
      <div className="bg-white border-b shadow-sm">
        <div className="flex max-w-lg mx-auto">
          <button
            onClick={() => { setAdminTab('members'); setMessage(null) }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              adminTab === 'members'
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-400'
            }`}
          >
            メンバー管理
          </button>
          <button
            onClick={() => { setAdminTab('edit-stats'); setMessage(null) }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              adminTab === 'edit-stats'
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-400'
            }`}
          >
            成績修正
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4 pb-10">

        {/* メッセージ */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* ── タブ: メンバー管理 ── */}
        {adminTab === 'members' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-bold mb-1">ℹ️ メンバー管理について</p>
              <p>メンバー登録は各自が「成績入力」ページの<strong>「初めての方はこちら」</strong>タブから行います。管理者はメンバーの削除のみ行えます。</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-700">登録メンバー一覧</h2>
                <span className="text-xs text-gray-400">{members.length}名</span>
              </div>
              {members.length === 0 ? (
                <p className="p-6 text-center text-gray-400 text-sm">まだメンバーがいません</p>
              ) : (
                <ul>
                  {members.map((m, i) => (
                    <li
                      key={m.id}
                      className={`flex items-center justify-between px-4 py-3.5 ${i < members.length - 1 ? 'border-b' : ''}`}
                    >
                      <span className="font-medium text-gray-800">{m.name}</span>
                      <button
                        onClick={() => handleDelete(m.id, m.name)}
                        disabled={loading}
                        className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
                          deleteTarget === m.id
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {deleteTarget === m.id ? 'もう一度で削除確定' : '削除'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center">
              ※ メンバー削除時はそのメンバーの全成績も削除されます
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              <p className="font-bold mb-1">⚠️ パスワード変更方法</p>
              <p><code className="bg-amber-100 px-1 rounded">app/admin/page.tsx</code> の <code className="bg-amber-100 px-1 rounded">ADMIN_PASSWORD</code> を変更してVercelに再デプロイしてください。</p>
            </div>
          </>
        )}

        {/* ── タブ: 成績修正 ── */}
        {adminTab === 'edit-stats' && (
          <>
            {/* 選手選択 */}
            <div className="bg-white rounded-2xl shadow-md p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">選手を選択</label>
              <select
                value={editMember}
                onChange={e => setEditMember(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
              >
                <option value="">▼ 選手を選択してください</option>
                {members.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* 試合一覧 */}
            {editMember && !selectedGame && (
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h2 className="text-sm font-bold text-gray-700">{editMember} の試合一覧</h2>
                </div>
                {loadingGames ? (
                  <p className="p-6 text-center text-gray-400 text-sm">読み込み中...</p>
                ) : memberGames.length === 0 ? (
                  <p className="p-6 text-center text-gray-400 text-sm">成績データがありません</p>
                ) : (
                  <ul>
                    {memberGames.map((g, i) => (
                      <li
                        key={g.id}
                        className={`px-4 py-3 ${i < memberGames.length - 1 ? 'border-b' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {g.date}
                              <span className="text-gray-400 font-normal text-xs ml-1">{g.season} · {g.year}年</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {g.opponent ? `vs ${g.opponent}` : '対戦相手なし'}
                              <span className="ml-2">{g.ab}打数{g.h}安打 {g.hr}HR {g.rbi}打点</span>
                            </p>
                          </div>
                          <button
                            onClick={() => selectGameForEdit(g)}
                            className="bg-green-100 text-green-700 text-sm px-3 py-1.5 rounded-full font-medium ml-2 shrink-0"
                          >
                            修正
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 修正フォーム */}
            {selectedGame && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 flex items-center justify-between">
                  <p className="text-sm text-yellow-800 font-medium">
                    ✏️ {editMember} · {selectedGame.date} の成績を修正中
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedGame(null)}
                    className="text-xs text-yellow-700 underline ml-2 shrink-0"
                  >
                    キャンセル
                  </button>
                </div>

                {/* 大会区分・年度 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">大会区分</label>
                    <select
                      value={editSeason}
                      onChange={e => setEditSeason(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white shadow-sm"
                    >
                      {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">年度</label>
                    <select
                      value={editYear}
                      onChange={e => setEditYear(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white shadow-sm"
                    >
                      {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(y => (
                        <option key={y} value={y}>{y}年</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 試合日・対戦相手 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">試合日</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">対戦相手</label>
                    <input
                      type="text"
                      value={editOpponent}
                      onChange={e => setEditOpponent(e.target.value)}
                      placeholder="チーム名"
                      className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white shadow-sm"
                    />
                  </div>
                </div>

                {/* 打撃成績グリッド */}
                <div className="bg-white rounded-2xl shadow-md p-4">
                  <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b">打撃成績</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {STAT_FIELDS.map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={editStats[key]}
                          onChange={e => setEditStat(key, e.target.value)}
                          placeholder="0"
                          className="w-full border border-gray-200 rounded-xl px-2 py-3 text-2xl text-center bg-gray-50 font-bold"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-green-700 text-white py-4 rounded-2xl text-base font-bold shadow-lg active:bg-green-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : '成績を保存する'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
