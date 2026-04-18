import React, { useState } from 'react'
import NamesList from '../components/NamesList'
import Results from '../components/Results'
import { generateMatchings } from '../lib/matching'

export default function Home() {
    const [names, setNames] = useState<string[]>(['', '', '', '', ''])
    const [rounds, setRounds] = useState<number>(1)
    const [matchings, setMatchings] = useState<ReturnType<typeof generateMatchings>>([])

    function getNames() {
        return names.map((n) => n.trim()).filter((n) => n)
    }

    function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        const validNames = getNames()
        if (validNames.length < 2 || isNaN(rounds) || rounds < 1) {
            alert('参加者は2人以上、回数は1以上で入力してください。')
            return
        }
        const m = generateMatchings(validNames, rounds)
        setMatchings(m)
    }

    return (
        <main style={{ padding: '1rem' }}>
            <h1>交流会用1on1マッチング</h1>

            <section id="controls" className="collapsible">
                <form id="match-form" onSubmit={onSubmit}>
                    <label>参加者名:<br /></label>
                    <NamesList names={names} setNames={setNames} />
                    <label>対戦回数:<br />
                        <input type="number" id="rounds" min={1} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
                    </label>
                    <br /><br />
                    <button type="submit">マッチング生成</button>
                </form>
            </section>

            <h3>マッチング結果</h3>
            <Results matchings={matchings} />
        </main>
    )
}
