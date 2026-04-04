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
}
