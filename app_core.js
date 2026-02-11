// app_core.js

// --- DATABASE & SESSION CONFIG ---
const DB_KEY = 'rafi_pay_master_v3';
const SESSION_KEY = 'rafi_pay_session_active';

function getDB() { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; }
function saveDB(data) { localStorage.setItem(DB_KEY, JSON.stringify(data)); }

// --- UI UTILS ---
function showToast(msg, type='success') {
    const t = document.getElementById('toast');
    if(!t) return;
    document.getElementById('toast-msg').innerText = msg;
    const icon = document.getElementById('toast-icon');
    
    if(type === 'error') {
        icon.className = 'fa-solid fa-circle-xmark text-red-500';
    } else {
        icon.className = 'fa-solid fa-circle-check text-green-500';
    }
    
    t.style.top = "20px";
    setTimeout(() => t.style.top = "-100px", 2500);
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active-screen');
        setTimeout(() => { if(!s.classList.contains('active-screen')) s.style.display = 'none'; }, 400);
    });
    const target = document.getElementById(id);
    if(target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active-screen'), 10);
    }
}

function switchTab(tabName) {
    document.getElementById('tab-home').classList.add('hidden');
    document.getElementById('tab-address').classList.add('hidden');
    document.getElementById('btn-home').classList.remove('active');
    document.getElementById('btn-address').classList.remove('active');
    
    document.getElementById('tab-' + tabName).classList.remove('hidden');
    document.getElementById('btn-' + tabName).classList.add('active');
}

// --- CORE LOGIC ---
let currentUser = null;

// Auto Login Check
window.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

function checkSession() {
    const activeEmail = localStorage.getItem(SESSION_KEY);
    if (activeEmail) {
        const db = getDB();
        const user = db[activeEmail];
        if (user) {
            currentUser = { email: activeEmail, ...user };
            loadDashboard();
            document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
            document.getElementById('screen-dash').style.display = 'block';
            document.getElementById('screen-dash').classList.add('active-screen');
            switchTab('home');
            return;
        }
    }
    switchScreen('screen-login');
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();

    if(!email || !pass) { showToast("Enter credentials", "error"); return; }

    // Admin Vault Check
    const admin = typeof SECURE_VAULT !== 'undefined' ? SECURE_VAULT.find(a => atob(a.e) === email && atob(a.p) === pass) : null;
    
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
    localStorage.setItem(SESSION_KEY, email);
    currentUser = { email, ...data };
    loadDashboard();
    switchScreen('screen-dash');
    switchTab('home');
    showToast("Welcome Back!");
}

function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    document.getElementById('login-pass').value = '';
    switchScreen('screen-login');
}

// --- MASTERCARD GENERATOR (Luhn Algorithm) ---
function generateCard(name) {
    const prefix = 51 + Math.floor(Math.random() * 5);
    let num = prefix.toString();
    while(num.length < 15) num += Math.floor(Math.random()*10);
    
    let sum=0, d=false;
    for(let i=num.length-1; i>=0; i--){
        let n=parseInt(num[i]);
        if(d){if((n*=2)>9)n-=9;}
        sum+=n; d=!d;
    }
    const fullNum = num + ((sum*9)%10);

    const currentYear = new Date().getFullYear() % 100;
    const expYear = currentYear + Math.floor(Math.random() * 4) + 2;
    let expMonth = Math.floor(Math.random() * 12) + 1;
    if(expMonth < 10) expMonth = '0' + expMonth;

    return {
        number: fullNum,
        holder: name.toUpperCase(),
        exp: `${expMonth}/${expYear}`,
        cvv: Math.floor(Math.random() * 899 + 100)
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
    if(!confirm("Generate new Mastercard?")) return;
    const newCard = generateCard(currentUser.name);
    const db = getDB();
    db[currentUser.email].card = newCard;
    saveDB(db);
    currentUser.card = newCard;
    loadDashboard();
    showToast("New Mastercard Issued");
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

// --- BILLING ADDRESS GENERATOR ---
function pasteFromClip() {
    navigator.clipboard.readText().then(text => {
        document.getElementById('paste-card-input').value = text;
        showToast("Pasted!");
    }).catch(err => {
        showToast("Permission Denied", "error");
    });
}

function generateBillingAddress() {
    let rawInput = document.getElementById('paste-card-input').value;
    let cleanInput = rawInput.replace(/\D/g, '');

    // Auto-select if empty
    if (cleanInput.length === 0) {
        if (currentUser && currentUser.card) {
            cleanInput = currentUser.card.number;
            document.getElementById('paste-card-input').value = cleanInput.match(/.{1,4}/g).join(' ');
            showToast("Auto-selected Active Card!");
        } else {
            showToast("No Card Found!", "error");
            return;
        }
    }

    if(cleanInput.length < 13) {
        showToast("Invalid Card Format", "error");
        return;
    }

    const streets = ["Maple Ave", "Oak St", "Washington Blvd", "Lakeview Dr", "Sunset Blvd", "Broadway", "Highland Park"];
    const cities = [
        {c:"New York", s:"NY", z:"10001"},
        {c:"Los Angeles", s:"CA", z:"90001"},
        {c:"Miami", s:"FL", z:"33101"},
        {c:"Chicago", s:"IL", z:"60601"},
        {c:"Houston", s:"TX", z:"77001"},
        {c:"Phoenix", s:"AZ", z:"85001"}
    ];
    
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomStreet = Math.floor(Math.random() * 9000 + 100) + " " + streets[Math.floor(Math.random() * streets.length)];
    const randomPhone = "+1 (" + Math.floor(Math.random() * 800 + 200) + ") " + Math.floor(Math.random() * 800 + 100) + "-" + Math.floor(Math.random() * 9000 + 1000);

    document.getElementById('res-street').innerText = randomStreet;
    document.getElementById('res-city').innerText = randomCity.c;
    document.getElementById('res-state').innerText = randomCity.s;
    document.getElementById('res-zip').innerText = randomCity.z;
    document.getElementById('res-phone').innerText = randomPhone;

    const resBox = document.getElementById('address-result');
    resBox.classList.remove('hidden');
    resBox.scrollIntoView({ behavior: 'smooth' });
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
