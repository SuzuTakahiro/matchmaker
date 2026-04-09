// 参加者名リスト管理（ページロード時に実行）
let namesArray = ["", "", "", "", ""];
const namesList = document.getElementById('names-list');
const addNameBtn = document.getElementById('add-name');

function renderNames() {
    namesList.innerHTML = '';
    namesArray.forEach((n, idx) => {
        const div = document.createElement('div');
        div.style.marginBottom = '0.5em';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = n;
        input.placeholder = `例: 参加者${idx + 1}`;
        input.style.width = '12em';
        input.oninput = function () {
            namesArray[idx] = input.value;
        };
        div.appendChild(input);
        if (namesArray.length > 1) {
            const delBtn = document.createElement('button');
            delBtn.textContent = '削除';
            delBtn.style.marginLeft = '1em';
            delBtn.onclick = function () {
                namesArray.splice(idx, 1);
                renderNames();
            };
            div.appendChild(delBtn);
        }
        namesList.appendChild(div);
    });
}

addNameBtn.addEventListener('click', function () {
    namesArray.push("");
    renderNames();
});

function getNames() {
    // 空欄を除外
    return namesArray.map(n => n.trim()).filter(n => n);
}

// 初期表示
renderNames();

// フォーム送信処理
document.getElementById('match-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const names = getNames();
    const rounds = parseInt(document.getElementById('rounds').value, 10);
    if (names.length < 2 || isNaN(rounds) || rounds < 1) {
        document.getElementById('result').innerHTML = '<span style="color:red">参加者は2人以上、回数は1以上で入力してください。</span>';
        return;
    }
    const matchings = generateMatchings(names, rounds);
    displayMatchings(matchings, names);
    // collapse controls and show open button
    const controls = document.getElementById('controls');
    const openBtn = document.getElementById('open-controls');
    if (controls) controls.classList.add('collapsed');
    if (openBtn) openBtn.style.display = 'inline-block';
    // mark that controls have been used at least once
    window._controlsOpenedOnce = true;
    // ensure close button is hidden after generation
    const closeBtn = document.getElementById('close-controls');
    if (closeBtn) closeBtn.style.display = 'none';
});

// open-controls button handler: reopen the form for editing/regeneration
const openBtn = document.getElementById('open-controls');
if (openBtn) {
    openBtn.addEventListener('click', function () {
        const controls = document.getElementById('controls');
        const closeBtn = document.getElementById('close-controls');
        if (controls) controls.classList.remove('collapsed');
        openBtn.style.display = 'none';
        // if this is not the first open (i.e. used before), show close button
        if (window._controlsOpenedOnce && closeBtn) {
            closeBtn.style.display = 'inline-block';
        }
        // focus first input
        const firstInput = document.querySelector('#names-list input');
        if (firstInput) firstInput.focus();
        // scroll to top of controls
        if (controls) controls.scrollIntoView({ behavior: 'smooth' });
    });
}

// close-controls button handler: collapse the form again
const closeBtn = document.getElementById('close-controls');
if (closeBtn) {
    closeBtn.addEventListener('click', function () {
        const controls = document.getElementById('controls');
        if (controls) controls.classList.add('collapsed');
        closeBtn.style.display = 'none';
        if (openBtn) openBtn.style.display = 'inline-block';
    });
}

function generateMatchings(names, rounds) {
    let allMatches = [];
    let history = new Set();
    let byeHistory = new Set();
    let winHistory = {};
    names.forEach(n => winHistory[n] = 0);

    function tryMakePairs(pool) {
        // pool: array of remaining players (no bye)
        const pairs = [];
        const used = new Set();
        while (pool.length > 0) {
            const a = pool.shift();
            // find partner index
            let foundIdx = -1;
            for (let j = 0; j < pool.length; j++) {
                const b = pool[j];
                const key = [a, b].sort().join('-');
                const winKey = [winHistory[a], winHistory[b]].sort().join('-');
                if (!history.has(key) && winKey !== '0-0') {
                    foundIdx = j;
                    break;
                }
            }
            if (foundIdx === -1) {
                // try allow pairs that only avoid history
                for (let j = 0; j < pool.length; j++) {
                    const b = pool[j];
                    const key = [a, b].sort().join('-');
                    if (!history.has(key)) { foundIdx = j; break; }
                }
            }
            if (foundIdx === -1) {
                // failed to find partner for a
                return null;
            }
            const b = pool.splice(foundIdx, 1)[0];
            pairs.push({ a, b });
        }
        return pairs;
    }

    for (let r = 1; r <= rounds; r++) {
        let roundMatches = [];
        // attempt multiple times to find a valid pairing for this round
        let attempts = 0;
        let success = false;
        while (attempts < 200 && !success) {
            attempts++;
            const pool = shuffle([...names]);
            // assign bye if odd, prefer someone without bye yet
            let byePlayer = null;
            if (pool.length % 2 === 1) {
                let byeIndex = pool.findIndex(n => !byeHistory.has(n));
                if (byeIndex === -1) byeIndex = Math.floor(Math.random() * pool.length);
                byePlayer = pool.splice(byeIndex, 1)[0];
            }
            // try to make pairs from pool
            const pairs = tryMakePairs(pool.slice());
            if (pairs) {
                // accept
                if (byePlayer) {
                    roundMatches.push({ a: byePlayer, b: '不戦勝', round: r });
                }
                pairs.forEach(p => {
                    const key = [p.a, p.b].sort().join('-');
                    history.add(key);
                    roundMatches.push({ a: p.a, b: p.b, round: r });
                });
                if (byePlayer) byeHistory.add(byePlayer);
                success = true;
            }
        }
        if (!success) {
            // fallback: simple pairing (may repeat history)
            let pool = shuffle([...names]);
            if (pool.length % 2 === 1) {
                const bye = pool.splice(0, 1)[0];
                roundMatches.push({ a: bye, b: '不戦勝', round: r });
            }
            for (let i = 0; i < pool.length; i += 2) {
                const a = pool[i], b = pool[i + 1];
                const key = [a, b].sort().join('-');
                history.add(key);
                roundMatches.push({ a, b, round: r });
            }
        }
        allMatches.push(roundMatches);
    }
    return allMatches;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function displayMatchings(matchings, names) {
    const container = document.getElementById('result');
    container.innerHTML = '';
    matchings.forEach((round, idx) => {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'round';
        const h = document.createElement('h3');
        h.textContent = `第${idx + 1}回`;
        roundDiv.appendChild(h);

        const ul = document.createElement('ul');
        ul.className = 'match-list';
        round.forEach(match => {
            const li = document.createElement('li');
            if (match.b === '不戦勝') {
                const nameSpan = document.createElement('span');
                nameSpan.className = 'player-name';
                nameSpan.textContent = match.a;
                const bye = document.createElement('span');
                bye.className = 'bye';
                bye.textContent = '不戦勝';
                li.appendChild(nameSpan);
                li.appendChild(bye);
            } else if (match.a === '不戦勝') {
                const nameSpan = document.createElement('span');
                nameSpan.className = 'player-name';
                nameSpan.textContent = match.b;
                const bye = document.createElement('span');
                bye.className = 'bye';
                bye.textContent = '不戦勝';
                li.appendChild(nameSpan);
                li.appendChild(bye);
            } else {
                const aSpan = document.createElement('span');
                aSpan.className = 'player-name';
                aSpan.textContent = match.a;
                const vs = document.createElement('span');
                vs.className = 'vs';
                vs.textContent = 'vs';
                const bSpan = document.createElement('span');
                bSpan.className = 'player-name';
                bSpan.textContent = match.b;
                li.appendChild(aSpan);
                li.appendChild(vs);
                li.appendChild(bSpan);
            }
            ul.appendChild(li);
        });
        roundDiv.appendChild(ul);
        container.appendChild(roundDiv);
    });
    // show share button when results exist
    const shareBtn = document.getElementById('share-result');
    if (shareBtn) shareBtn.style.display = matchings.length ? 'inline-block' : 'none';
}

// --- Capture #result and share ---
function inlineAllComputedStyles(root) {
    const nodes = root.querySelectorAll('*');
    nodes.forEach(el => {
        const cs = window.getComputedStyle(el);
        // copy a subset of properties to avoid exceptions
        // background: prefer full background (including gradients) when available
        el.style.background = cs.backgroundColor || cs.background;
        if (cs.backgroundImage && cs.backgroundImage !== 'none') el.style.backgroundImage = cs.backgroundImage;
        el.style.backgroundSize = cs.backgroundSize;
        el.style.color = cs.color;
        el.style.font = cs.font;
        // copy padding per-side to avoid losing spacing
        el.style.paddingTop = cs.getPropertyValue('padding-top');
        el.style.paddingRight = cs.getPropertyValue('padding-right');
        el.style.paddingBottom = cs.getPropertyValue('padding-bottom');
        el.style.paddingLeft = cs.getPropertyValue('padding-left');
        el.style.margin = cs.margin;
        // preserve white-space and text overflow behaviour
        const ws = cs.getPropertyValue('white-space') || cs.whiteSpace;
        if (ws) el.style.whiteSpace = ws;
        const to = cs.getPropertyValue('text-overflow') || cs.textOverflow;
        if (to && to !== 'clip') el.style.textOverflow = to;
        const ov = cs.getPropertyValue('overflow') || cs.overflow;
        if (ov) el.style.overflow = ov;
        // ensure border-left and border shorthand are applied when present
        try {
            const blw = cs.getPropertyValue('border-left-width');
            const bls = cs.getPropertyValue('border-left-style');
            const blc = cs.getPropertyValue('border-left-color');
            if (blw && bls && bls !== 'none') {
                el.style.borderLeft = `${blw} ${bls} ${blc}`;
                // add a small horizontal gap around the left border for better spacing in capture
                try {
                    const extraPx = 8; // adjust this value to increase/decrease gap
                    el.style.marginLeft = extraPx + 'px';
                } catch (e) {
                    // ignore padding adjustments if any error occurs
                }
            } else if (cs.border) {
                el.style.border = cs.border;
            }
        } catch (e) {
            el.style.border = cs.border;
        }
        el.style.borderRadius = cs.borderRadius;
        if (cs.boxShadow && cs.boxShadow !== 'none') el.style.boxShadow = cs.boxShadow;
        // if this is the bye badge, force nowrap and prevent shrinking in capture
        try {
            if (el.classList && el.classList.contains('bye')) {
                el.style.whiteSpace = 'nowrap';
                el.style.flex = '0 0 auto';
                el.style.minWidth = '0';
                // ensure padding and display are preserved
                if (!el.style.display) el.style.display = cs.display || 'inline-block';
            }
        } catch (e) { }
        el.style.boxSizing = cs.boxSizing;
        el.style.width = cs.width;
        el.style.height = cs.height;
        el.style.display = cs.display;
    });
    try { root.style.background = window.getComputedStyle(root).backgroundColor; } catch (e) { }
}

async function captureResultAsBlob() {
    const el = document.getElementById('result');
    if (!el) throw new Error('result 要素が見つかりません');
    const clone = el.cloneNode(true);
    // place clone offscreen so computed styles apply
    const temp = document.createElement('div');
    temp.style.position = 'fixed'; temp.style.left = '-10000px'; temp.style.top = '0';
    temp.appendChild(clone);
    document.body.appendChild(temp);
    try {
        inlineAllComputedStyles(clone);
        // add a small horizontal padding to .round elements only for the capture
        try {
            const extraPadPx = 16;
            const styleEl = document.createElement('style');
            styleEl.textContent = `.round{padding-left:${extraPadPx}px !important; padding-right:${extraPadPx}px !important;}`;
            clone.insertBefore(styleEl, clone.firstChild);
        } catch (e) { console.warn('injecting capture padding failed', e); }
        const rect = el.getBoundingClientRect();
        const width = Math.max(Math.ceil(rect.width), 600);
        const height = Math.max(Math.ceil(rect.height), 200);
        // serialize clone as XHTML inside a namespaced wrapper
        const inner = '<div xmlns="http://www.w3.org/1999/xhtml">' + clone.innerHTML + '</div>';
        const svg = '<?xml version="1.0" encoding="utf-8"?>\n' +
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
            `<foreignObject width="100%" height="100%">` +
            inner +
            `</foreignObject></svg>`;

        const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        const img = new Image();
        img.src = svgDataUrl;
        await new Promise((res, rej) => { img.onload = res; img.onerror = e => rej(new Error('SVG読み込みエラー')); });
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);


        return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    } finally {
        document.body.removeChild(temp);
    }
}

async function shareResult() {
    try {
        const blob = await captureResultAsBlob();
        if (!blob) throw new Error('画像生成に失敗しました');
        const file = new File([blob], 'match-result.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'マッチング結果', text: 'マッチング結果を共有します' });
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'match-result.png'; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        const tweetText = encodeURIComponent('マッチング結果です。画像を添付して投稿してください。');
        const intent = `https://twitter.com/intent/tweet?text=${tweetText}`;
        window.open(intent, '_blank');
    } catch (err) {
        alert('共有に失敗しました: ' + err.message);
    }
}

const shareBtnEl = document.getElementById('share-result');
if (shareBtnEl) shareBtnEl.addEventListener('click', shareResult);
