// app_core.js

// --- DATABASE SIMULATION ---
const DB_KEY = 'rafi_pay_users_db';
function getDB() { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; }
function saveDB(data) { localStorage.setItem(DB_KEY, JSON.stringify(data)); }

// --- UTILS ---
function showToast(msg, type='success') {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    const icon = document.getElementById('toast-icon');
    icon.className = type === 'error' ? 'fa-solid fa-circle-xmark text-red-500' : 'fa-solid fa-circle-check text-green-500';
    t.style.top = "20px";
    setTimeout(() => t.style.top = "-100px", 2500);
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active-screen');
        setTimeout(() => { if(!s.classList.contains('active-screen')) s.style.display = 'none'; }, 400);
    });
    const target = document.getElementById(id);
    target.style.display = 'block';
    setTimeout(() => target.classList.add('active-screen'), 10);
}

// --- TAB SWITCHING (NEW) ---
function switchTab(tabName) {
    // Hide all tabs
    document.getElementById('tab-home').classList.add('hidden');
    document.getElementById('tab-address').classList.add('hidden');
    
    // Reset buttons
    document.getElementById('btn-home').classList.remove('active');
    document.getElementById('btn-address').classList.remove('active');

    // Show selected
    document.getElementById('tab-' + tabName).classList.remove('hidden');
    document.getElementById('btn-' + tabName).classList.add('active');
}

// --- CORE FUNCTIONS ---
let currentUser = null;

function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();

    if(!email || !pass) { showToast("Enter credentials", "error"); return; }

    const admin = SECURE_VAULT.find(a => atob(a.e) === email && atob(a.p) === pass);
    if(admin) {
        const db = getDB();
        if(!db[email]) {
            db[email] = { name: admin.n, pass: pass, card: generateCard(admin.n) };
            saveDB(db);
        }
        loginUser(email, db[email]);
        return;
    }

    const db = getDB();
    if(db[email] && db[email].pass === pass) {
        loginUser(email, db[email]);
    } else {
        showToast("Email/Password Wrong!", "error");
    }
}

function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value.trim();

    if(!name || !email || !pass) { showToast("All fields required", "error"); return; }
    
    const db = getDB();
    if(db[email]) { showToast("Email already used!", "error"); return; }

    const card = generateCard(name);
    db[email] = { name, pass, card };
    saveDB(db);

    showToast("Account Created! Please Login.");
    document.getElementById('login-email').value = email;
    switchScreen('screen-login');
}

function handleForgot() {
    const email = prompt("Enter your registered Email:");
    if(!email) return;
    const db = getDB();
    const user = db[email.toLowerCase().trim()];
    if(user) {
        alert(`Hello ${user.name},\nYour Password is: ${user.pass}`);
    } else {
        alert("No account found!");
    }
}

function loginUser(email, data) {
    currentUser = { email, ...data };
    loadDashboard();
    switchScreen('screen-dash');
    switchTab('home'); // Default to home
    showToast("Welcome Back!");
}

function handleLogout() {
    currentUser = null;
    document.getElementById('login-pass').value = '';
    switchScreen('screen-login');
}

function generateCard(name) {
    const bin = "4" + Math.floor(Math.random() * 90000 + 10000);
    let num = bin; while(num.length < 15) num += Math.floor(Math.random()*10);
    let sum=0, d=false;
    for(let i=num.length-1; i>=0; i--){ let n=parseInt(num[i]); if(d){if((n*=2)>9)n-=9;} sum+=n; d=!d; }
    const fullNum = num + ((sum*9)%10);

    return {
        number: fullNum,
        holder: name.toUpperCase(),
        exp: `0${Math.floor(Math.random()*9)+1}/${Math.floor(Math.random()*5)+26}`,
        cvv: Math.floor(Math.random()*899+100)
    };
}

function loadDashboard() {
    if(!currentUser) return;
    const c = currentUser.card;
    document.getElementById('user-name-display').innerText = currentUser.name;
    document.getElementById('user-avatar').innerText = currentUser.name[0].toUpperCase();
    document.getElementById('card-num').innerText = c.number.match(/.{1,4}/g).join(' ');
    document.getElementById('card-holder').innerText = c.holder;
    document.getElementById('card-exp').innerText = c.exp;
    document.getElementById('card-cvv').innerText = c.cvv;
}

function regenerateCard() {
    if(!confirm("Generate new card?")) return;
    const newCard = generateCard(currentUser.name);
    const db = getDB();
    db[currentUser.email].card = newCard;
    saveDB(db);
    currentUser.card = newCard;
    loadDashboard();
    showToast("New Card Issued");
}

function copyCardNum() {
    const txt = document.getElementById('card-num').innerText.replace(/\s/g,'');
    navigator.clipboard.writeText(txt).then(() => showToast("Copied!"));
}

function copyAllIdentity() {
    const c = currentUser.card;
    const info = `Name: ${c.holder}\nCard: ${c.number}\nExp: ${c.exp}\nCVV: ${c.cvv}`;
    navigator.clipboard.writeText(info).then(() => showToast("Info Copied!"));
}

// --- NEW: ADDRESS GENERATOR LOGIC ---
function pasteFromClip() {
    navigator.clipboard.readText().then(text => {
        document.getElementById('paste-card-input').value = text;
        showToast("Pasted!");
    }).catch(err => {
        showToast("Allow clipboard permission!", "error");
    });
}

function generateBillingAddress() {
    const input = document.getElementById('paste-card-input').value;
    if(input.length < 10) { showToast("Invalid Card Number", "error"); return; }

    // Random US Data
    const streets = ["Maple Ave", "Oak St", "Washington Blvd", "Lakeview Dr", "Sunset Blvd", "Broadway"];
    const cities = [
        {c:"New York", s:"NY", z:"10001"},
        {c:"Los Angeles", s:"CA", z:"90001"},
        {c:"Miami", s:"FL", z:"33101"},
        {c:"Chicago", s:"IL", z:"60601"},
        {c:"Houston", s:"TX", z:"77001"}
    ];
    
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomStreet = Math.floor(Math.random() * 9000 + 100) + " " + streets[Math.floor(Math.random() * streets.length)];
    const randomPhone = "+1 (" + Math.floor(Math.random() * 800 + 200) + ") " + Math.floor(Math.random() * 800 + 100) + "-" + Math.floor(Math.random() * 9000 + 1000);

    // Show Result
    document.getElementById('res-street').innerText = randomStreet;
    document.getElementById('res-city').innerText = randomCity.c;
    document.getElementById('res-state').innerText = randomCity.s;
    document.getElementById('res-zip').innerText = randomCity.z;
    document.getElementById('res-phone').innerText = randomPhone;

    document.getElementById('address-result').classList.remove('hidden');
    showToast("Address Generated!");
}

function copyBilling() {
    const s = document.getElementById('res-street').innerText;
    const c = document.getElementById('res-city').innerText;
    const st = document.getElementById('res-state').innerText;
    const z = document.getElementById('res-zip').innerText;
    const p = document.getElementById('res-phone').innerText;
    
    const full = `Street: ${s}\nCity: ${c}\nState: ${st}\nZip: ${z}\nPhone: ${p}\nCountry: USA`;
    navigator.clipboard.writeText(full).then(() => showToast("Address Copied!"));
                                                                      }
