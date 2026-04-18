export type Match = { a: string; b: string; round?: number }

export function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
}

export function generateMatchings(names: string[], rounds: number) {
    const allMatches: Match[][] = []
    let history = new Set<string>()
    let byeHistory = new Set<string>()
    let winHistory: Record<string, number> = {}
    names.forEach((n) => (winHistory[n] = 0))

    function tryMakePairs(pool: string[]) {
        const pairs: { a: string; b: string }[] = []
        while (pool.length > 0) {
            const a = pool.shift() as string
            let foundIdx = -1
            for (let j = 0; j < pool.length; j++) {
                const b = pool[j]
                const key = [a, b].sort().join('-')
                const winKey = [winHistory[a], winHistory[b]].sort().join('-')
                if (!history.has(key) && winKey !== '0-0') {
                    foundIdx = j
                    break
                }
            }
            if (foundIdx === -1) {
                for (let j = 0; j < pool.length; j++) {
                    const b = pool[j]
                    const key = [a, b].sort().join('-')
                    if (!history.has(key)) {
                        foundIdx = j
                        break
                    }
                }
            }
            if (foundIdx === -1) return null
            const b = pool.splice(foundIdx, 1)[0]
            pairs.push({ a, b })
        }
        return pairs
    }

    for (let r = 1; r <= rounds; r++) {
        let roundMatches: Match[] = []
        let attempts = 0
        let success = false
        while (attempts < 200 && !success) {
            attempts++
            const pool = shuffle([...names])
            let byePlayer: string | null = null
            if (pool.length % 2 === 1) {
                let byeIndex = pool.findIndex((n) => !byeHistory.has(n))
                if (byeIndex === -1) byeIndex = Math.floor(Math.random() * pool.length)
                byePlayer = pool.splice(byeIndex, 1)[0]
            }
            const pairs = tryMakePairs(pool.slice())
            if (pairs) {
                if (byePlayer) {
                    roundMatches.push({ a: byePlayer, b: '不戦勝', round: r })
                }
                pairs.forEach((p) => {
                    const key = [p.a, p.b].sort().join('-')
                    history.add(key)
                    roundMatches.push({ a: p.a, b: p.b, round: r })
                })
                if (byePlayer) byeHistory.add(byePlayer)
                success = true
            }
        }
        if (!success) {
            let pool = shuffle([...names])
            if (pool.length % 2 === 1) {
                const bye = pool.splice(0, 1)[0]
                roundMatches.push({ a: bye, b: '不戦勝', round: r })
            }
            for (let i = 0; i < pool.length; i += 2) {
                const a = pool[i]
                const b = pool[i + 1]
                const key = [a, b].sort().join('-')
                history.add(key)
                roundMatches.push({ a, b, round: r })
            }
        }
        allMatches.push(roundMatches)
    }

    return allMatches
}
