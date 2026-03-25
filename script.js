// --- 1. INITIAL STATE (DATABASE LOKAL) ---
let gameState = JSON.parse(localStorage.getItem('LevelUpMe_Data')) || {
    lv: 1,
    exp: 0,
    nextExp: 100,
    coins: 0,
    sp: 0,
    stats: { int: 0, fit: 0, lead: 0, cre: 0 },
    quests: {}, // Format: {"YYYY-MM-DD": [ {id, title, diff, status, timeSpent, isDaily} ]}
    wishlist: [],
    bought: []
};

let currentViewDate = new Date();
let selectedDateStr = formatDate(new Date());
let activeTimer = null;
let timerSeconds = 0;

// --- 2. CORE FUNCTIONS (SAVE & UPDATE) ---
function saveData() {
    localStorage.setItem('LevelUpMe_Data', JSON.stringify(gameState));
    renderUI();
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// --- 3. TAB NAVIGATION ---
function changeTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    
    // Sinkronisasi navigasi bawah
    const navItems = document.querySelectorAll('.nav-item');
    if(tabId === 'tab-status') navItems[0].classList.add('active');
    if(tabId === 'tab-misi') navItems[1].classList.add('active');
    if(tabId === 'tab-shop') navItems[2].classList.add('active');
}

// --- 4. CALENDAR LOGIC ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('monthDisplay');
    grid.innerHTML = '';

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                        "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    monthLabel.innerText = `${monthNames[month]} ${year}`;

    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEl = document.createElement('div');
        dayEl.className = `cal-day ${dateStr === selectedDateStr ? 'active' : ''}`;
        dayEl.innerText = day;
        dayEl.onclick = () => {
            selectedDateStr = dateStr;
            renderCalendar();
            renderQuests();
        };
        grid.appendChild(dayEl);
    }
}

document.getElementById('prevMonth').onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(); };

// --- 5. QUEST SYSTEM & REWARD LOGIC ---
function openModal(type) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');
    overlay.style.display = 'flex';

    if (type === 'misi') {
        title.innerText = "Buat Misi Baru";
        form.innerHTML = `
            <input type="text" id="q-title" placeholder="Nama Misi (Contoh: Belajar Kalkulus)">
            <select id="q-diff">
                <option value="10">Rendah (10 Koin/EXP)</option>
                <option value="25">Sedang (25 Koin/EXP)</option>
                <option value="50">Tinggi (50 Koin/EXP)</option>
            </select>
            <label><input type="checkbox" id="q-daily"> Jadikan Misi Harian</label>
        `;
        document.getElementById('btn-save').onclick = saveQuest;
    } else {
        title.innerText = "Tambah Wishlist";
        form.innerHTML = `
            <input type="text" id="w-title" placeholder="Nama Hadiah">
            <select id="w-rarity">
                <option value="100">Bronze (100 Koin)</option>
                <option value="500">Silver (500 Koin)</option>
                <option value="2000">Gold (2.000 Koin)</option>
                <option value="10000">Legendary (10.000 Koin)</option>
            </select>
        `;
        document.getElementById('btn-save').onclick = saveWishlist;
    }
}

function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

function saveQuest() {
    const title = document.getElementById('q-title').value;
    const diff = document.getElementById('q-diff').value;
    const daily = document.getElementById('q-daily').checked;

    if (!gameState.quests[selectedDateStr]) gameState.quests[selectedDateStr] = [];
    
    gameState.quests[selectedDateStr].push({
        id: Date.now(),
        title,
        reward: parseInt(diff),
        status: 'pending',
        timeSpent: 0,
        isDaily: daily
    });

    closeModal();
    saveData();
    renderQuests();
}

function renderQuests() {
    const container = document.getElementById('quest-container');
    container.innerHTML = `<h4 style="margin-top:0; color:#ffd700;">Misi: ${selectedDateStr}</h4>`;
    
    const dayQuests = gameState.quests[selectedDateStr] || [];
    
    dayQuests.forEach(q => {
        const card = document.createElement('div');
        // Memberi warna garis bawah sesuai status
        const statusColor = q.status === 'active' ? '#3b82f6' : (q.status === 'completed' ? '#22c55e' : '#ffd700');
        
        card.className = `quest-card ${q.status}`;
        card.style.borderLeft = `4px solid ${statusColor}`;
        
        // Logika tampilan teks status/waktu
        let subText = "Menunggu...";
        if (q.status === 'active') {
            const mins = Math.floor(timerSeconds / 60);
            const secs = timerSeconds % 60;
            subText = `<span class="glow-text">⏱ ${mins}m ${secs}s</span>`;
        } else if (q.status === 'completed') {
            subText = `<span style="color: #22c55e;">✅ Selesai (+${q.earnedReward || q.reward} Koin)</span>`;
        }

        card.innerHTML = `
            <div class="quest-info">
                <strong>${q.title}</strong>
                <small>${subText}</small>
            </div>
            <div class="quest-actions">
                ${q.status === 'pending' ? `<button onclick="startQuest(${q.id})" class="btn-play"><i class="fas fa-play"></i></button>` : ''}
                ${q.status === 'active' ? `<button onclick="finishQuest(${q.id})" class="btn-check"><i class="fas fa-check"></i></button>` : ''}
                <button onclick="deleteQuest(${q.id})" class="btn-delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

function startQuest(id) {
    const dayQuests = gameState.quests[selectedDateStr];
    
    // Set status misi yang dipilih jadi active
    dayQuests.forEach(q => { 
        if(q.id === id) {
            q.status = 'active';
        } else if(q.status === 'active') {
            q.status = 'pending'; // Reset misi lain jika ada yang sedang jalan
        }
    });
    
    // Reset dan Mulai Timer
    timerSeconds = 0;
    if(activeTimer) clearInterval(activeTimer);
    
    activeTimer = setInterval(() => { 
        timerSeconds++; 
        // BARIS INI WAJIB ADA: Agar tampilan angka di layar berubah tiap detik
        renderQuests(); 
    }, 1000);
    
    saveData();
}

function finishQuest(id) {
    clearInterval(activeTimer);
    const dayQuests = gameState.quests[selectedDateStr];
    const quest = dayQuests.find(q => q.id === id);
    
    const minutes = Math.floor(timerSeconds / 60);
    const bonusMultiplier = 1 + (Math.floor(minutes / 5) * 0.01);
    const finalReward = Math.floor(quest.reward * bonusMultiplier);

    quest.status = 'completed';
    quest.timeSpent = timerSeconds;
    quest.earnedReward = finalReward; // Menyimpan reward yang didapat ke dalam data misi

    gameState.coins += finalReward;
    addExp(finalReward);

    saveData();
    renderQuests();
}

function deleteQuest(id) {
    gameState.quests[selectedDateStr] = gameState.quests[selectedDateStr].filter(q => q.id !== id);
    saveData();
    renderQuests();
}

// --- 6. LEVELING SYSTEM ---
function addExp(amount) {
    gameState.exp += amount;
    while (gameState.exp >= gameState.nextExp) {
        gameState.exp -= gameState.nextExp;
        gameState.lv++;
        gameState.sp += 2; // Dapat 2 Skill Points tiap naik level
        gameState.nextExp = Math.floor(gameState.nextExp * 1.5); // Matematika: Kenaikan exp 1.5x lipat
        alert(`LEVEL UP! Kamu sekarang Level ${gameState.lv}.`);
    }
}

function upgradeStat(stat) {
    if (gameState.sp > 0) {
        gameState.stats[stat]++;
        gameState.sp--;
        saveData();
    } else {
        alert("Skill Points tidak cukup!");
    }
}

// --- 7. UI RENDERING ---
function renderUI() {
    document.getElementById('top-lv').innerText = gameState.lv;
    document.getElementById('top-coins').innerText = gameState.coins;
    document.getElementById('exp-val').innerText = `${gameState.exp} / ${gameState.nextExp}`;
    document.getElementById('exp-fill').style.width = `${(gameState.exp / gameState.nextExp) * 100}%`;
    
    document.getElementById('stat-int').innerText = gameState.stats.int;
    document.getElementById('stat-fit').innerText = gameState.stats.fit;
    document.getElementById('stat-lead').innerText = gameState.stats.lead;
    document.getElementById('stat-cre').innerText = gameState.stats.cre;
    document.getElementById('skill-points').innerText = gameState.sp;
}

// --- INITIAL LOAD ---
window.onload = () => {
    renderCalendar();
    renderQuests();
    renderUI();
};

function saveWishlist() {
    const title = document.getElementById('w-title').value;
    const price = document.getElementById('w-rarity').value;
    const rarityText = document.querySelector(`#w-rarity option[value="${price}"]`).text.split(' ')[0];

    if (!title) {
        alert("Nama hadiah tidak boleh kosong!");
        return;
    }

    gameState.wishlist.push({
        id: Date.now(),
        title: title,
        price: parseInt(price),
        rarity: rarityText,
        status: 'available'
    });

    closeModal();
    saveData();
    renderShop();
}

function renderShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = "";

    gameState.wishlist.forEach(item => {
        const card = document.createElement('div');
        card.className = `quest-card rarity-${item.rarity.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="quest-info">
                <strong>${item.title}</strong>
                <small style="color: var(--gold)"><i class="fas fa-coins"></i> ${item.price.toLocaleString()}</small>
                <small>Tier: ${item.rarity}</small>
            </div>
            <div class="quest-actions">
                <button onclick="buyItem(${item.id})" class="btn-check" style="width: auto; padding: 0 15px; border-radius: 8px;">Tukar</button>
                <button onclick="deleteWishlist(${item.id})" class="btn-delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

function buyItem(id) {
    const itemIndex = gameState.wishlist.findIndex(i => i.id === id);
    const item = gameState.wishlist[itemIndex];

    if (gameState.coins >= item.price) {
        gameState.coins -= item.price;
        gameState.bought.push({
            ...item,
            buyDate: new Date().toLocaleDateString()
        });
        gameState.wishlist.splice(itemIndex, 1); // Hapus dari wishlist
        alert(`Sukses! Kamu berhasil membeli ${item.title}. Cek di History!`);
        saveData();
        renderShop();
        renderUI();
    } else {
        alert("Koin kamu tidak cukup untuk hadiah ini! Ayo selesaikan lebih banyak misi!");
    }
}

function deleteWishlist(id) {
    gameState.wishlist = gameState.wishlist.filter(i => i.id !== id);
    saveData();
    renderShop();
}

// Fungsi untuk pindah tampilan antara Wishlist dan History
function showSubTabShop(mode) {
    const btnItems = document.getElementById('btn-wishlist');
    const btnHistory = document.getElementById('btn-bought');
    
    if (mode === 'items') {
        btnItems.classList.add('active');
        btnHistory.classList.remove('active');
        renderShop(); // Tampilkan wishlist
    } else {
        btnHistory.classList.add('active');
        btnItems.classList.remove('active');
        renderShopHistory(); // Tampilkan barang yang sudah dibeli
    }
}

// Fungsi untuk menampilkan barang yang sudah dibeli
function renderShopHistory() {
    const container = document.getElementById('shop-container');
    container.innerHTML = `<h4 style="text-align:center; color:var(--accent);">Koleksi Hadiah Terbeli</h4>`;

    if (gameState.bought.length === 0) {
        container.innerHTML += `<p style="text-align:center; opacity:0.5;">Belum ada hadiah yang ditukarkan.</p>`;
        return;
    }

    gameState.bought.forEach(item => {
        const card = document.createElement('div');
        card.className = `quest-card rarity-${item.rarity.toLowerCase()}`;
        card.style.opacity = "0.8"; // Memberi kesan barang koleksi
        
        card.innerHTML = `
            <div class="quest-info">
                <strong style="text-decoration: none;">${item.title}</strong>
                <small style="color: #22c55e;">Dibeli pada: ${item.buyDate || 'Baru saja'}</small>
                <small>Tier: ${item.rarity}</small>
            </div>
            <div class="quest-actions">
                <span style="font-size: 1.5rem;">💎</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- TAMBAHKAN FUNGSI INI UNTUK HISTORY MISI ---
function showSubTabMisi(mode) {
    const btnActive = document.getElementById('btn-active-quest');
    const btnHistory = document.getElementById('btn-history-quest');
    
    if (mode === 'active') {
        btnActive.classList.add('active');
        btnHistory.classList.remove('active');
        renderQuests(); 
    } else {
        btnHistory.classList.add('active');
        btnActive.classList.remove('active');
        renderAllQuestHistory(); // Fungsi untuk menampilkan semua riwayat
    }
}

function renderAllQuestHistory() {
    const container = document.getElementById('quest-container');
    container.innerHTML = `<h4 style="text-align:center; color:#ffd700;">Semua Riwayat Misi</h4>`;

    const allDates = Object.keys(gameState.quests);
    if (allDates.length === 0) {
        container.innerHTML += `<p style="text-align:center; opacity:0.5;">Belum ada riwayat misi.</p>`;
        return;
    }

    allDates.forEach(date => {
        gameState.quests[date].forEach(q => {
            const card = document.createElement('div');
            card.className = `quest-card ${q.status}`;
            card.style.opacity = "0.8";
            card.innerHTML = `
                <div class="quest-info">
                    <strong>${q.title}</strong>
                    <small>${date} | ${q.status}</small>
                </div>
                <div class="quest-actions">
                    <button onclick="reQuest('${q.title}', ${q.reward})" class="btn-play"><i class="fas fa-redo"></i></button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

// Fungsi agar misi lama bisa diambil lagi ke tanggal yang dipilih
function reQuest(title, reward) {
    if (!gameState.quests[selectedDateStr]) gameState.quests[selectedDateStr] = [];
    gameState.quests[selectedDateStr].push({
        id: Date.now(),
        title: title,
        reward: reward,
        status: 'pending',
        timeSpent: 0,
        isDaily: false
    });
    saveData();
    showSubTabMisi('active');
}

// --- PERBAIKAN: GABUNGKAN WINDOW.ONLOAD MENJADI SATU SAJA ---
// Hapus semua window.onload yang lama dan gunakan satu ini di paling bawah file:
window.onload = () => {
    renderCalendar();
    renderQuests();
    renderShop();
    renderUI();
};