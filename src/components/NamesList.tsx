import React from 'react'

type Props = {
    names: string[]
    setNames: (n: string[]) => void
}

export default function NamesList({ names, setNames }: Props) {
    function update(idx: number, value: string) {
        const next = names.slice()
        next[idx] = value
        setNames(next)
    }
    function add() {
        setNames([...names, ''])
    }
    function remove(idx: number) {
        const next = names.slice()
        next.splice(idx, 1)
        setNames(next)
    }

    return (
        <div>
            {names.map((n, idx) => (
                <div key={idx} style={{ marginBottom: '0.5em' }}>
                    <input
                        type="text"
                        value={n}
                        placeholder={`例: 参加者${idx + 1}`}
                        style={{ width: '12em' }}
                        onChange={(e) => update(idx, e.target.value)}
                    />
                    {names.length > 1 && (
                        <button type="button" style={{ marginLeft: '1em' }} onClick={() => remove(idx)}>
                            削除
                        </button>
                    )}
                </div>
            ))}
            <button type="button" onClick={add} id="add-name">
                入力枠を追加
            </button>
        </div>
    )
}
