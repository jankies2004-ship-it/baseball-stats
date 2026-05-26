'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'admin123'

interface Member {
  id: number
  name: string
  created_at: string
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('members').select('*').order('name')
    if (data) setMembers(data)
  }, [])

  useEffect(() => {
    if (authed) fetchMembers()
  }, [authed, fetchMembers])

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

      <div className="p-4 max-w-lg mx-auto space-y-4 pb-10">

        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-bold mb-1">ℹ️ メンバー管理について</p>
          <p>メンバー登録は各自が「成績入力」ページの<strong>「初めての方はこちら」</strong>タブから行います。管理者はメンバーの削除のみ行えます。</p>
        </div>

        {/* メッセージ */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* メンバー一覧 */}
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

        {/* パスワード変更案内 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          <p className="font-bold mb-1">⚠️ パスワード変更方法</p>
          <p><code className="bg-amber-100 px-1 rounded">app/admin/page.tsx</code> の <code className="bg-amber-100 px-1 rounded">ADMIN_PASSWORD</code> を変更してVercelに再デプロイしてください。</p>
        </div>
      </div>
    </div>
  )
}
