// --- 1. FIREBASE CONFIGURATION & INITIALIZATION ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZr_SVZjljpGMgNNy3-9LGzD3qRgcjZdI",
    authDomain: "levelupme-c162c.firebaseapp.com",
    projectId: "levelupme-c162c",
    databaseURL: "https://levelupme-c162c-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "levelupme-c162c.firebasestorage.app",
    messagingSenderId: "301763237990",
    appId: "1:301763237990:web:4d03a6cdc88c4c97f4f5a7",
    measurementId: "G-XPXK5B28H6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- 2. GLOBAL STATE ---
let gameState = {
    lv: 1, exp: 0, nextExp: 100, coins: 0, sp: 0,
    stats: { int: 0, fit: 0, lead: 0, cre: 0 },
    quests: {}, wishlist: [], bought: []
};

let currentUser = null;
let currentViewDate = new Date();
let selectedDateStr = new Date().toISOString().split('T')[0];
let activeTimer = null;
let timerSeconds = 0;

// --- 3. CORE FUNCTIONS (SAVE & LOAD) ---
window.saveData = () => {
    if (currentUser) {
        set(ref(db, 'users/' + currentUser.uid), gameState)
            .then(() => renderUI())
            .catch((error) => console.error("Gagal simpan ke Firebase:", error));
    }
};

const loadUserData = () => {
    if (currentUser) {
        get(ref(db, 'users/' + currentUser.uid)).then((snapshot) => {
            if (snapshot.exists()) {
                gameState = snapshot.val();
                if (!gameState.quests) gameState.quests = {};
                if (!gameState.wishlist) gameState.wishlist = [];
                if (!gameState.bought) gameState.bought = [];
            }
            renderCalendar();
            renderQuests();
            renderShop();
            renderUI();
        });
    }
};

// --- 4. AUTH SYSTEM ---
window.handleRegister = () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    
    if (!email || !pass) {
        document.getElementById('login-error').innerText = "Email dan password wajib diisi!";
        return;
    }

    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => alert("Akun berhasil dibuat! Silakan klik Login."))
        .catch((error) => {
            if (error.code === 'auth/email-already-in-use') {
                document.getElementById('login-error').innerText = "Email sudah terdaftar!";
            } else {
                document.getElementById('login-error').innerText = "Error: " + error.message;
            }
        });
};

window.handleLogin = () => { // Tambahkan window. agar terbaca oleh HTML
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, pass)
        .catch(() => document.getElementById('login-error').innerText = "Email atau Password salah!");
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Layar login hanya hilang jika user berhasil masuk
        document.getElementById('login-screen').style.display = 'none'; 
        loadUserData();
    } else {
        currentUser = null;
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// --- 5. NAVIGATION & UI ---
window.changeTab = (tabId) => {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const navItems = document.querySelectorAll('.nav-item');
    if(tabId === 'tab-status') navItems[0].classList.add('active');
    if(tabId === 'tab-misi') navItems[1].classList.add('active');
    if(tabId === 'tab-shop') navItems[2].classList.add('active');
};

window.renderUI = () => {
    document.getElementById('top-lv').innerText = gameState.lv;
    document.getElementById('top-coins').innerText = gameState.coins;
    document.getElementById('exp-val').innerText = `${gameState.exp} / ${gameState.nextExp}`;
    document.getElementById('exp-fill').style.width = `${(gameState.exp / gameState.nextExp) * 100}%`;
    document.getElementById('stat-int').innerText = gameState.stats.int;
    document.getElementById('stat-fit').innerText = gameState.stats.fit;
    document.getElementById('stat-lead').innerText = gameState.stats.lead;
    document.getElementById('stat-cre').innerText = gameState.stats.cre;
    document.getElementById('skill-points').innerText = gameState.sp;
};

// --- 6. CALENDAR LOGIC ---
window.renderCalendar = () => {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('monthDisplay');
    grid.innerHTML = '';
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
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
};

document.getElementById('prevMonth').onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(); };

// --- 7. QUEST SYSTEM ---
window.openModal = (type) => {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('modal-form');
    overlay.style.display = 'flex';

    if (type === 'misi') {
        title.innerText = "Buat Misi Baru";
        form.innerHTML = `<input type="text" id="q-title" placeholder="Nama Misi"><select id="q-diff"><option value="10">Rendah</option><option value="25">Sedang</option><option value="50">Tinggi</option></select>`;
        document.getElementById('btn-save').onclick = window.saveQuest;
    } else {
        title.innerText = "Tambah Wishlist";
        form.innerHTML = `<input type="text" id="w-title" placeholder="Nama Hadiah"><select id="w-rarity"><option value="100">Bronze</option><option value="500">Silver</option><option value="2000">Gold</option><option value="10000">Legendary</option></select>`;
        document.getElementById('btn-save').onclick = window.saveWishlist;
    }
};

window.closeModal = () => document.getElementById('modal-overlay').style.display = 'none';

window.saveQuest = () => {
    const title = document.getElementById('q-title').value;
    const diff = document.getElementById('q-diff').value;
    if (!gameState.quests[selectedDateStr]) gameState.quests[selectedDateStr] = [];
    gameState.quests[selectedDateStr].push({ id: Date.now(), title, reward: parseInt(diff), status: 'pending', timeSpent: 0 });
    closeModal();
    window.saveData();
    renderQuests();
};

window.renderQuests = () => {
    const container = document.getElementById('quest-container');
    container.innerHTML = `<h4 style="margin-top:0; color:#ffd700;">Misi: ${selectedDateStr}</h4>`;
    const dayQuests = gameState.quests[selectedDateStr] || [];
    dayQuests.forEach(q => {
        const card = document.createElement('div');
        card.className = `quest-card ${q.status}`;
        let subText = q.status === 'active' ? `<span class="glow-text">⏱ ${Math.floor(timerSeconds/60)}m ${timerSeconds%60}s</span>` : (q.status === 'completed' ? `✅ Selesai (+${q.earnedReward || q.reward} Koin)` : "Menunggu...");
        card.innerHTML = `<div class="quest-info"><strong>${q.title}</strong><small>${subText}</small></div>
            <div class="quest-actions">
                ${q.status === 'pending' ? `<button onclick="startQuest(${q.id})" class="btn-play"><i class="fas fa-play"></i></button>` : ''}
                ${q.status === 'active' ? `<button onclick="finishQuest(${q.id})" class="btn-check"><i class="fas fa-check"></i></button>` : ''}
                <button onclick="deleteQuest(${q.id})" class="btn-delete"><i class="fas fa-trash"></i></button>
            </div>`;
        container.appendChild(card);
    });
};

window.startQuest = (id) => {
    gameState.quests[selectedDateStr].forEach(q => q.status = q.id === id ? 'active' : 'pending');
    timerSeconds = 0;
    if(activeTimer) clearInterval(activeTimer);
    activeTimer = setInterval(() => { timerSeconds++; renderQuests(); }, 1000);
    window.saveData();
};

window.finishQuest = (id) => {
    clearInterval(activeTimer);
    const quest = gameState.quests[selectedDateStr].find(q => q.id === id);
    const bonus = 1 + (Math.floor(Math.floor(timerSeconds/60) / 5) * 0.01);
    const finalReward = Math.floor(quest.reward * bonus);
    quest.status = 'completed';
    quest.timeSpent = timerSeconds;
    quest.earnedReward = finalReward;
    gameState.coins += finalReward;
    window.addExp(finalReward);
    window.saveData();
    renderQuests();
};

window.deleteQuest = (id) => {
    gameState.quests[selectedDateStr] = gameState.quests[selectedDateStr].filter(q => q.id !== id);
    window.saveData();
    renderQuests();
};

// --- 8. SHOP & HISTORY ---
window.saveWishlist = () => {
    const title = document.getElementById('w-title').value;
    const price = document.getElementById('w-rarity').value;
    const rarity = document.querySelector(`#w-rarity option[value="${price}"]`).text;
    gameState.wishlist.push({ id: Date.now(), title, price: parseInt(price), rarity });
    closeModal();
    window.saveData();
    renderShop();
};

window.renderShop = () => {
    const container = document.getElementById('shop-container');
    container.innerHTML = "";
    gameState.wishlist.forEach(item => {
        const card = document.createElement('div');
        card.className = `quest-card rarity-${item.rarity.toLowerCase()}`;
        card.innerHTML = `<div class="quest-info"><strong>${item.title}</strong><small><i class="fas fa-coins"></i> ${item.price}</small></div>
            <div class="quest-actions"><button onclick="buyItem(${item.id})" class="btn-check" style="width:auto; padding:0 10px;">Tukar</button></div>`;
        container.appendChild(card);
    });
};

window.buyItem = (id) => {
    const idx = gameState.wishlist.findIndex(i => i.id === id);
    if (gameState.coins >= gameState.wishlist[idx].price) {
        gameState.coins -= gameState.wishlist[idx].price;
        gameState.bought.push({...gameState.wishlist[idx], buyDate: new Date().toLocaleDateString()});
        gameState.wishlist.splice(idx, 1);
        window.saveData();
        renderShop();
    } else { alert("Koin tidak cukup!"); }
};

window.showSubTabShop = (mode) => {
    if (mode === 'items') renderShop();
    else renderShopHistory();
};

const renderShopHistory = () => {
    const container = document.getElementById('shop-container');
    container.innerHTML = `<h4 style="text-align:center;">History Pembelian</h4>`;
    gameState.bought.forEach(item => {
        const card = document.createElement('div');
        card.className = `quest-card`;
        card.innerHTML = `<div class="quest-info"><strong>${item.title}</strong><small>${item.buyDate}</small></div>`;
        container.appendChild(card);
    });
};

window.showSubTabMisi = (mode) => {
    if (mode === 'active') renderQuests();
    else renderAllQuestHistory();
};

const renderAllQuestHistory = () => {
    const container = document.getElementById('quest-container');
    container.innerHTML = `<h4 style="text-align:center;">Semua History Misi</h4>`;
    Object.keys(gameState.quests).forEach(date => {
        gameState.quests[date].forEach(q => {
            const card = document.createElement('div');
            card.className = `quest-card`;
            card.innerHTML = `<div class="quest-info"><strong>${q.title}</strong><small>${date}</small></div>
                <div class="quest-actions"><button onclick="reQuest('${q.title}', ${q.reward})" class="btn-play"><i class="fas fa-redo"></i></button></div>`;
            container.appendChild(card);
        });
    });
};

window.reQuest = (title, reward) => {
    if (!gameState.quests[selectedDateStr]) gameState.quests[selectedDateStr] = [];
    gameState.quests[selectedDateStr].push({ id: Date.now(), title, reward, status: 'pending', timeSpent: 0 });
    window.saveData();
    window.showSubTabMisi('active');
};

// --- 9. LEVELING ---
window.addExp = (amount) => {
    gameState.exp += amount;
    while (gameState.exp >= gameState.nextExp) {
        gameState.exp -= gameState.nextExp;
        gameState.lv++;
        gameState.sp += 2;
        gameState.nextExp = Math.floor(gameState.nextExp * 1.5);
    }
};

window.upgradeStat = (stat) => {
    if (gameState.sp > 0) { gameState.stats[stat]++; gameState.sp--; window.saveData(); }
};

// Tambahkan 'name' ke initial state jika belum ada
// (Data ini akan tersimpan otomatis ke Firebase saat saveData dipanggil)

window.changeNickname = () => {
    const newName = prompt("Masukkan nama karakter baru:", gameState.name || "ROY ARI");
    
    if (newName && newName.trim().length > 0) {
        if (newName.length > 15) {
            alert("Nama terlalu panjang! Maksimal 15 karakter.");
            return;
        }
        
        gameState.name = newName.trim();
        document.getElementById('user-name-display').innerHTML = 
            `${gameState.name} <i class="fas fa-edit" style="font-size: 0.7rem; opacity: 0.6;"></i>`;
        
        window.saveData(); // Simpan ke Firebase
        alert("Nama berhasil diubah!");
    }
};

// Pastikan di dalam fungsi renderUI(), nama juga diperbarui:
// Tambahkan baris ini di dalam fungsi window.renderUI = () => { ... }
document.getElementById('user-name-display').innerHTML = 
    `${gameState.name || "ROY ARI"} <i class="fas fa-edit" style="font-size: 0.7rem; opacity: 0.6;"></i>`;