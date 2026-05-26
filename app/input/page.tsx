'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SEASONS = ['春季大会', '夏季大会', '秋季大会', '練習試合']
const CURRENT_YEAR = new Date().getFullYear()
const MEMBER_KEY = 'baseball_member_name'

interface Member { id: number; name: string }
type Tab = 'select' | 'register'
type StatsKey = 'pa' | 'ab' | 'h' | 'rbi' | 'hr' | 'b2' | 'b3' | 'bb' | 'so' | 'sb'
type StatsState = Record<StatsKey, string>

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

export default function InputPage() {
  const [tab, setTab] = useState<Tab>('select')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [newName, setNewName] = useState('')
  const [registering, setRegistering] = useState(false)
  const [season, setSeason] = useState('練習試合')
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [opponent, setOpponent] = useState('')
  const [stats, setStats] = useState<StatsState>(EMPTY_STATS)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('members').select('id,name').order('name')
      const list: Member[] = data ?? []
      setMembers(list)
      const saved = localStorage.getItem(MEMBER_KEY)
      if (saved && list.some(m => m.name === saved)) {
        setSelectedMember(saved)
        setTab('select')
      }
    }
    init()
  }, [])

  function selectMember(name: string) {
    setSelectedMember(name)
    if (name) localStorage.setItem(MEMBER_KEY, name)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setRegistering(true)
    setMessage(null)

    // 既存チェック
    if (members.some(m => m.name === name)) {
      selectMember(name)
      setTab('select')
      setNewName('')
      setRegistering(false)
      return
    }

    const { error } = await supabase.from('members').insert({ name })
    if (error) {
      setMessage({ type: 'error', text: '登録に失敗しました: ' + error.message })
      setRegistering(false)
      return
    }

    const { data } = await supabase.from('members').select('id,name').order('name')
    if (data) setMembers(data)
    selectMember(name)
    setTab('select')
    setNewName('')
    setRegistering(false)
  }

  function setStat(key: StatsKey, value: string) {
    if (value === '' || /^\d+$/.test(value)) {
      setStats(prev => ({ ...prev, [key]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember) {
      setMessage({ type: 'error', text: '名前を選択してください' })
      return
    }
    setSubmitting(true)
    setMessage(null)

    const { error } = await supabase.from('games').insert({
      member_name: selectedMember,
      season,
      year: Number(year),
      date,
      opponent: opponent.trim() || null,
      pa:  Number(stats.pa)  || 0,
      ab:  Number(stats.ab)  || 0,
      h:   Number(stats.h)   || 0,
      rbi: Number(stats.rbi) || 0,
      hr:  Number(stats.hr)  || 0,
      b2:  Number(stats.b2)  || 0,
      b3:  Number(stats.b3)  || 0,
      bb:  Number(stats.bb)  || 0,
      so:  Number(stats.so)  || 0,
      sb:  Number(stats.sb)  || 0,
    })

    if (error) {
      setMessage({ type: 'error', text: '登録に失敗しました: ' + error.message })
    } else {
      setMessage({ type: 'success', text: `✓ ${selectedMember} の成績を登録しました！` })
      setStats(EMPTY_STATS)
      setOpponent('')
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-800 text-white shadow-lg">
        <div className="px-4 py-4 flex items-center max-w-lg mx-auto">
          <Link href="/" className="text-white mr-3 text-xl leading-none">←</Link>
          <h1 className="text-lg font-bold">⚾ JANKIES 成績入力</h1>
        </div>
      </header>

      {/* タブ */}
      <div className="bg-white border-b shadow-sm">
        <div className="flex max-w-lg mx-auto">
          <button
            onClick={() => setTab('select')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'select'
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-400'
            }`}
          >
            メンバー選択
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'register'
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-400'
            }`}
          >
            初めての方はこちら
          </button>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4 pb-10">

        {/* ── タブ: メンバー選択 ── */}
        {tab === 'select' && (
          <div className="bg-white rounded-2xl shadow-md p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              あなたの名前
            </label>
            <select
              value={selectedMember}
              onChange={e => selectMember(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
            >
              <option value="">▼ 名前を選択してください</option>
              {members.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
            {selectedMember && (
              <p className="mt-2 text-sm text-green-700 font-medium">
                ✓ {selectedMember} さんとして入力します
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              名前がない場合は「初めての方はこちら」タブから登録できます
            </p>
          </div>
        )}

        {/* ── タブ: 新規登録 ── */}
        {tab === 'register' && (
          <div className="bg-white rounded-2xl shadow-md p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">あなたの名前を登録</p>
            <p className="text-xs text-gray-400 mb-3">初回のみ登録が必要です。次回からは「メンバー選択」タブで選べます。</p>
            <form onSubmit={handleRegister} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="例：田中 太郎"
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base"
                maxLength={20}
                autoFocus
              />
              <button
                type="submit"
                disabled={registering || !newName.trim()}
                className="bg-green-700 text-white px-4 py-3 rounded-xl font-bold whitespace-nowrap disabled:opacity-50"
              >
                {registering ? '登録中...' : '登録'}
              </button>
            </form>
          </div>
        )}

        {/* ── 成績入力フォーム ── */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 大会区分・年度 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">大会区分</label>
              <select
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white shadow-sm"
              >
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">年度</label>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">試合日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">対戦相手</label>
              <input
                type="text"
                value={opponent}
                onChange={e => setOpponent(e.target.value)}
                placeholder="チーム名"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white shadow-sm"
              />
            </div>
          </div>

          {/* 打撃成績グリッド */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b">打撃成績を入力</h2>
            <div className="grid grid-cols-2 gap-3">
              {STAT_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={stats[key]}
                    onChange={e => setStat(key, e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-2 py-3 text-2xl text-center bg-gray-50 font-bold"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* メッセージ */}
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={submitting || !selectedMember}
            className="w-full bg-green-700 text-white py-4 rounded-2xl text-base font-bold shadow-lg active:bg-green-900 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? '登録中...'
              : selectedMember
                ? `${selectedMember} の成績を登録する`
                : '名前を選択してください'}
          </button>

          <Link href="/" className="block text-center text-sm text-gray-400 underline">
            成績表に戻る
          </Link>
        </form>
      </div>
    </div>
  )
}
