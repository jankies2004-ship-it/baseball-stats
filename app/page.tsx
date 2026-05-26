'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calcAVG, calcOBP, calcSLG, calcOPS, formatRate } from '@/lib/calculations'

const SEASONS = ['すべて', '春季大会', '夏季大会', '秋季大会', '練習試合']
const CURRENT_YEAR = new Date().getFullYear()

interface GameRow {
  member_name: string
  season: string
  year: number
  pa: number; ab: number; h: number; rbi: number; hr: number
  b2: number; b3: number; bb: number; so: number; sb: number
}

interface PlayerStats {
  name: string; games: number
  pa: number; ab: number; h: number; rbi: number; hr: number
  b2: number; b3: number; bb: number; so: number; sb: number
  avg: number; obp: number; slg: number; ops: number
}

export default function HomePage() {
  const [allGames, setAllGames] = useState<GameRow[]>([])
  const [years, setYears] = useState<string[]>([String(CURRENT_YEAR)])
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR))
  const [selectedSeason, setSelectedSeason] = useState('すべて')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('games')
        .select('member_name,season,year,pa,ab,h,rbi,hr,b2,b3,bb,so,sb')
      if (data) {
        setAllGames(data)
        const ys = [...new Set(data.map((g: GameRow) => String(g.year)))].sort((a, b) => Number(b) - Number(a))
        if (!ys.includes(String(CURRENT_YEAR))) ys.unshift(String(CURRENT_YEAR))
        setYears(ys)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = allGames.filter(g =>
    g.year === Number(selectedYear) &&
    (selectedSeason === 'すべて' || g.season === selectedSeason)
  )

  // 選手ごとに集計
  const playerMap = new Map<string, Omit<PlayerStats, 'avg' | 'obp' | 'slg' | 'ops'>>()
  filtered.forEach(g => {
    const p = playerMap.get(g.member_name)
    if (p) {
      p.games++; p.pa += g.pa; p.ab += g.ab; p.h += g.h
      p.rbi += g.rbi; p.hr += g.hr; p.b2 += g.b2; p.b3 += g.b3
      p.bb += g.bb; p.so += g.so; p.sb += g.sb
    } else {
      playerMap.set(g.member_name, {
        name: g.member_name, games: 1,
        pa: g.pa, ab: g.ab, h: g.h, rbi: g.rbi, hr: g.hr,
        b2: g.b2, b3: g.b3, bb: g.bb, so: g.so, sb: g.sb,
      })
    }
  })

  const stats: PlayerStats[] = Array.from(playerMap.values()).map(p => {
    const avg = calcAVG(p.h, p.ab)
    const obp = calcOBP(p.h, p.bb, p.ab)
    const slg = calcSLG(p.h, p.b2, p.b3, p.hr, p.ab)
    return { ...p, avg, obp, slg, ops: calcOPS(obp, slg) }
  }).sort((a, b) => b.avg - a.avg)

  // 各部門トップ値
  const topOf = (fn: (s: PlayerStats) => number, cond = (_: PlayerStats) => true) =>
    stats.filter(cond).reduce((m, s) => Math.max(m, fn(s)), -Infinity)

  const topAVG = topOf(s => s.avg, s => s.ab > 0)
  const topRBI  = topOf(s => s.rbi)
  const topHR   = topOf(s => s.hr)
  const topOPS  = topOf(s => s.ops, s => s.ab > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-green-800 text-white shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-lg font-bold tracking-wide">⚾ JANKIES打撃成績一覧</h1>
          <div className="flex gap-2">
            <Link href="/input" className="bg-yellow-400 text-green-900 text-sm font-bold px-3 py-1.5 rounded-full">
              成績入力
            </Link>
            <Link href="/admin" className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-full">
              管理
            </Link>
          </div>
        </div>
      </header>

      {/* フィルター */}
      <div className="bg-white border-b shadow-sm px-4 py-3">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {years.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select
            value={selectedSeason}
            onChange={e => setSelectedSeason(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* 成績テーブル */}
      <div className="px-4 py-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">⚾</p>
            <p>読み込み中...</p>
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="mb-4">この期間の成績データがありません</p>
            <Link href="/input" className="text-green-700 font-medium underline text-sm">
              成績を入力する →
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl shadow-md">
              <table className="min-w-full bg-white text-xs border-collapse">
                <thead>
                  <tr className="bg-green-800 text-white text-center">
                    <th className="px-3 py-3 text-left sticky left-0 bg-green-800 z-10 min-w-[72px]">名前</th>
                    <th className="px-2 py-3 min-w-[24px]" title="試合数">試</th>
                    <th className="px-2 py-3 min-w-[28px]" title="打席数">打席</th>
                    <th className="px-2 py-3 min-w-[28px]" title="打数">打数</th>
                    <th className="px-2 py-3 min-w-[36px] text-yellow-300 font-bold" title="打率=安打÷打数">打率</th>
                    <th className="px-2 py-3 min-w-[24px]" title="安打">安打</th>
                    <th className="px-2 py-3 min-w-[24px]" title="二塁打">二</th>
                    <th className="px-2 py-3 min-w-[24px]" title="三塁打">三</th>
                    <th className="px-2 py-3 min-w-[24px]" title="本塁打">本</th>
                    <th className="px-2 py-3 min-w-[28px] text-yellow-300 font-bold" title="打点">打点</th>
                    <th className="px-2 py-3 min-w-[24px]" title="四球">四</th>
                    <th className="px-2 py-3 min-w-[24px]" title="三振">振</th>
                    <th className="px-2 py-3 min-w-[24px]" title="盗塁">盗</th>
                    <th className="px-2 py-3 min-w-[36px]" title="出塁率=(安打+四球)÷(打数+四球)">出塁率</th>
                    <th className="px-2 py-3 min-w-[36px]" title="長打率=塁打数÷打数">長打率</th>
                    <th className="px-2 py-3 min-w-[36px] text-yellow-300 font-bold" title="OPS=出塁率+長打率">OPS</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => {
                    const isTopAVG = s.ab > 0 && isFinite(topAVG) && s.avg === topAVG
                    const isTopRBI = topRBI > 0 && s.rbi === topRBI
                    const isTopHR  = topHR  > 0 && s.hr  === topHR
                    const isTopOPS = s.ab > 0 && isFinite(topOPS) && s.ops === topOPS
                    const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    return (
                      <tr key={s.name} className={`${rowBg} hover:bg-green-50 transition-colors`}>
                        <td className={`px-3 py-2.5 font-semibold sticky left-0 z-10 ${rowBg} border-r border-gray-100 whitespace-nowrap`}>
                          {i === 0
                            ? <span className="text-yellow-500 mr-0.5">👑</span>
                            : <span className="text-gray-300 mr-1">{i + 1}</span>}
                          {s.name}
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-400">{s.games}</td>
                        <td className="px-2 py-2.5 text-center">{s.pa}</td>
                        <td className="px-2 py-2.5 text-center">{s.ab}</td>
                        <td className={`px-2 py-2.5 text-center font-bold ${isTopAVG ? 'text-yellow-700 bg-yellow-100' : 'text-green-800'}`}>
                          {s.ab > 0 ? formatRate(s.avg) : <span className="text-gray-300 font-normal">---</span>}
                        </td>
                        <td className="px-2 py-2.5 text-center">{s.h}</td>
                        <td className="px-2 py-2.5 text-center">{s.b2}</td>
                        <td className="px-2 py-2.5 text-center">{s.b3}</td>
                        <td className={`px-2 py-2.5 text-center font-bold ${isTopHR ? 'text-yellow-700 bg-yellow-100' : ''}`}>{s.hr}</td>
                        <td className={`px-2 py-2.5 text-center font-bold ${isTopRBI ? 'text-yellow-700 bg-yellow-100' : ''}`}>{s.rbi}</td>
                        <td className="px-2 py-2.5 text-center">{s.bb}</td>
                        <td className="px-2 py-2.5 text-center">{s.so}</td>
                        <td className="px-2 py-2.5 text-center">{s.sb}</td>
                        <td className="px-2 py-2.5 text-center text-gray-500">
                          {(s.ab + s.bb) > 0 ? formatRate(s.obp) : <span className="text-gray-300">---</span>}
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-500">
                          {s.ab > 0 ? formatRate(s.slg) : <span className="text-gray-300">---</span>}
                        </td>
                        <td className={`px-2 py-2.5 text-center font-bold ${isTopOPS ? 'text-yellow-700 bg-yellow-100' : 'text-indigo-700'}`}>
                          {s.ab > 0 ? formatRate(s.ops) : <span className="text-gray-300 font-normal">---</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 凡例・計算式説明 */}
            <div className="mt-3 space-y-1 text-xs text-gray-400 text-center">
              <p>
                <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-400 rounded mr-1 align-middle"></span>
                黄色 = 部門トップ
              </p>
              <p>打率=安打÷打数　出塁率=(安打+四球)÷(打数+四球)　長打率=塁打数÷打数　OPS=出塁率+長打率</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
