import React, { useRef } from 'react'
import type { Match } from '../lib/matching'

type Props = {
    matchings: Match[][]
}

function inlineAllComputedStyles(root: HTMLElement) {
    const nodes = root.querySelectorAll('*')
    nodes.forEach((el) => {
        const cs = window.getComputedStyle(el as Element) as any
        try {
            (el as HTMLElement).style.background = cs.backgroundColor || cs.background
            if (cs.backgroundImage && cs.backgroundImage !== 'none') (el as HTMLElement).style.backgroundImage = cs.backgroundImage
                ; (el as HTMLElement).style.color = cs.color
                ; (el as HTMLElement).style.font = cs.font
                ; (el as HTMLElement).style.paddingTop = cs.getPropertyValue('padding-top')
                ; (el as HTMLElement).style.paddingRight = cs.getPropertyValue('padding-right')
                ; (el as HTMLElement).style.paddingBottom = cs.getPropertyValue('padding-bottom')
                ; (el as HTMLElement).style.paddingLeft = cs.getPropertyValue('padding-left')
                ; (el as HTMLElement).style.margin = cs.margin
            const ws = cs.getPropertyValue('white-space') || cs.whiteSpace
            if (ws) (el as HTMLElement).style.whiteSpace = ws
            const to = cs.getPropertyValue('text-overflow') || cs.textOverflow
            if (to && to !== 'clip') (el as HTMLElement).style.textOverflow = to
            const ov = cs.getPropertyValue('overflow') || cs.overflow
            if (ov) (el as HTMLElement).style.overflow = ov
            try {
                const blw = cs.getPropertyValue('border-left-width')
                const bls = cs.getPropertyValue('border-left-style')
                const blc = cs.getPropertyValue('border-left-color')
                if (blw && bls && bls !== 'none') {
                    ; (el as HTMLElement).style.borderLeft = `${blw} ${bls} ${blc}`
                    try {
                        const extraPx = 8
                            ; (el as HTMLElement).style.marginLeft = extraPx + 'px'
                    } catch (e) { }
                } else if (cs.border) {
                    ; (el as HTMLElement).style.border = cs.border
                }
            } catch (e) {
                ; (el as HTMLElement).style.border = cs.border
            }
            ; (el as HTMLElement).style.borderRadius = cs.borderRadius
            if (cs.boxShadow && cs.boxShadow !== 'none') (el as HTMLElement).style.boxShadow = cs.boxShadow
            try {
                if ((el as HTMLElement).classList && (el as HTMLElement).classList.contains('bye')) {
                    ; (el as HTMLElement).style.whiteSpace = 'nowrap'
                        ; (el as HTMLElement).style.flex = '0 0 auto'
                        ; (el as HTMLElement).style.minWidth = '0'
                    if (!(el as HTMLElement).style.display) (el as HTMLElement).style.display = cs.display || 'inline-block'
                }
            } catch (e) { }
            ; (el as HTMLElement).style.boxSizing = cs.boxSizing
                ; (el as HTMLElement).style.width = cs.width
                ; (el as HTMLElement).style.height = cs.height
                ; (el as HTMLElement).style.display = cs.display
        } catch (e) { }
    })
    try {
        root.style.background = window.getComputedStyle(root).backgroundColor
    } catch (e) { }
}

async function captureResultAsBlob(el: HTMLElement) {
    const clone = el.cloneNode(true) as HTMLElement
    const temp = document.createElement('div')
    temp.style.position = 'fixed'
    temp.style.left = '-10000px'
    temp.style.top = '0'
    temp.appendChild(clone)
    document.body.appendChild(temp)
    try {
        inlineAllComputedStyles(clone)
        try {
            const extraPadPx = 16
            const styleEl = document.createElement('style')
            styleEl.textContent = `.round{padding-left:${extraPadPx}px !important; padding-right:${extraPadPx}px !important;}`
            clone.insertBefore(styleEl, clone.firstChild)
        } catch (e) { }
        const rect = el.getBoundingClientRect()
        const width = Math.max(Math.ceil(rect.width), 600)
        const height = Math.max(Math.ceil(rect.height), 200)
        const inner = '<div xmlns="http://www.w3.org/1999/xhtml">' + clone.innerHTML + '</div>'
        const svg = '<?xml version="1.0" encoding="utf-8"?>\n' +
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
            `<foreignObject width="100%" height="100%">` +
            inner +
            `</foreignObject></svg>`

        const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        const img = new Image()
        img.src = svgDataUrl
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('SVG読み込みエラー')) })
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    } finally {
        document.body.removeChild(temp)
    }
}

export default function Results({ matchings }: Props) {
    const ref = useRef<HTMLDivElement | null>(null)

    async function share() {
        if (!ref.current) return
        try {
            const blob = await captureResultAsBlob(ref.current)
            if (!blob) throw new Error('画像生成に失敗しました')
            const file = new File([blob], 'match-result.png', { type: 'image/png' })
            if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
                await (navigator as any).share({ files: [file], title: 'マッチング結果', text: 'マッチング結果を共有します' })
                return
            }
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'match-result.png'
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
            const tweetText = encodeURIComponent('マッチング結果です。画像を添付して投稿してください。')
            const intent = `https://twitter.com/intent/tweet?text=${tweetText}`
            window.open(intent, '_blank')
        } catch (err: any) {
            alert('共有に失敗しました: ' + (err?.message || err))
        }
    }

    return (
        <div>
            <div id="result" ref={ref}>
                {matchings.map((round, idx) => (
                    <div className="round" key={idx}>
                        <h3>第{idx + 1}回</h3>
                        <ul className="match-list">
                            {round.map((m, i) => (
                                <li key={i}>
                                    {m.b === '不戦勝' ? (
                                        <>
                                            <span className="player-name">{m.a}</span>
                                            <span className="bye">不戦勝</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="player-name">{m.a}</span>
                                            <span className="vs">vs</span>
                                            <span className="player-name">{m.b}</span>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            {matchings.length > 0 && (
                <div style={{ marginTop: '0.8em' }}>
                    <button onClick={share} id="share-result">結果を共有(β)</button>
                </div>
            )}
        </div>
    )
}
