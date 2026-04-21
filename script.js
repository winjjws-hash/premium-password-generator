const resultEl = document.getElementById('password-output');
const lengthEl = document.getElementById('length-slider');
const lengthValEl = document.getElementById('length-val');
const lengthWarning = document.getElementById('length-warning');
const uppercaseEl = document.getElementById('uppercase');
const lowercaseEl = document.getElementById('lowercase');
const numbersEl = document.getElementById('numbers');
const symbolsEl = document.getElementById('symbols');
const excludeAmbiguousEl = document.getElementById('exclude-ambiguous');
const generateEl = document.getElementById('generate-btn');
const clipboardEl = document.getElementById('copy-btn');
const strengthMeterEl = document.querySelector('.strength-meter');
const strengthTextEl = document.getElementById('strength-text');
const crackTimeValEl = document.getElementById('crack-time-val');
const toastEl = document.getElementById('toast');
const cardEl = document.getElementById('card');
const bgMesh = document.getElementById('bg-mesh');

// History & Pwned Elements
const historyToggleBtn = document.getElementById('history-toggle-btn');
const historyCloseBtn = document.getElementById('history-close-btn');
const historySidebar = document.getElementById('history-sidebar');
const overlay = document.getElementById('overlay');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

const pwnedBtn = document.getElementById('pwned-btn');
const pwnedVal = document.getElementById('pwned-val');
const pwnedIcon = document.getElementById('pwned-icon');

let passwordHistory = [];

const charset = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    number: '0123456789',
    symbol: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
    ambiguous: 'il1Lo0O'
};

// Cryptographically Secure Random Number Generator
function getSecureRandom() {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
}

// Fisher-Yates array shuffle using CSPRNG
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(getSecureRandom() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 3D Card Hover Effect
cardEl.addEventListener('mousemove', (e) => {
    const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    cardEl.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
});

cardEl.addEventListener('mouseleave', () => {
    cardEl.style.transform = `rotateY(0deg) rotateX(0deg)`;
});

function updateSliderBackground(slider) {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${value}%, rgba(255,255,255,0.05) ${value}%, rgba(255,255,255,0.05) 100%)`;
}

lengthEl.addEventListener('input', (e) => {
    lengthValEl.innerText = e.target.value;
    updateSliderBackground(e.target);
    generatePasswordAndDisplay(false, false); 
});

updateSliderBackground(lengthEl);

clipboardEl.addEventListener('click', () => {
    copyToClipboard(resultEl.value, clipboardEl.querySelector('i'));
});

function copyToClipboard(text, iconElement) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast();
        if(iconElement) {
            const originalClass = iconElement.className;
            iconElement.className = 'fas fa-check';
            setTimeout(() => { iconElement.className = originalClass; }, 2000);
        }
    });
}

generateEl.addEventListener('click', () => {
    generatePasswordAndDisplay(true, true); 
    
    bgMesh.style.transform = 'scale(1.05)';
    setTimeout(() => {
        bgMesh.style.transform = 'scale(1)';
    }, 300);
});

[uppercaseEl, lowercaseEl, numbersEl, symbolsEl].forEach(el => {
    el.addEventListener('change', (e) => {
        const checkedCount = [uppercaseEl, lowercaseEl, numbersEl, symbolsEl].filter(cb => cb.checked).length;
        if (checkedCount === 0) {
            e.target.checked = true;
            showErrorToast("At least one type must be selected!");
            return;
        }
        generatePasswordAndDisplay(false, false);
    });
});
excludeAmbiguousEl.addEventListener('change', () => generatePasswordAndDisplay(false, false));

function resetPwnedStatus() {
    pwnedVal.innerText = "Check Now";
    pwnedVal.style.color = "var(--text-main)";
    pwnedIcon.className = 'fas fa-shield-alt stat-icon';
    pwnedIcon.style.color = "var(--secondary)";
}

function generatePasswordAndDisplay(saveHistory = false, animate = false) {
    resetPwnedStatus();
    
    const length = +lengthEl.value;
    const hasLower = lowercaseEl.checked;
    const hasUpper = uppercaseEl.checked;
    const hasNumber = numbersEl.checked;
    const hasSymbol = symbolsEl.checked;
    const excludeAmbiguous = excludeAmbiguousEl.checked;

    if (length < 12) {
        lengthWarning.style.display = 'inline-block';
    } else {
        lengthWarning.style.display = 'none';
    }

    let pool = '';
    if (hasLower) pool += charset.lower;
    if (hasUpper) pool += charset.upper;
    if (hasNumber) pool += charset.number;
    if (hasSymbol) pool += charset.symbol;

    if (excludeAmbiguous) {
        let regex = new RegExp(`[${charset.ambiguous}]`, 'g');
        pool = pool.replace(regex, '');
    }

    if (pool === '') {
        return;
    }

    let guaranteedChars = [];
    if(hasLower) guaranteedChars.push(getRandomChar(excludeAmbiguous ? charset.lower.replace(new RegExp(`[${charset.ambiguous}]`,'g'),'') : charset.lower));
    if(hasUpper) guaranteedChars.push(getRandomChar(excludeAmbiguous ? charset.upper.replace(new RegExp(`[${charset.ambiguous}]`,'g'),'') : charset.upper));
    if(hasNumber) guaranteedChars.push(getRandomChar(excludeAmbiguous ? charset.number.replace(new RegExp(`[${charset.ambiguous}]`,'g'),'') : charset.number));
    if(hasSymbol) guaranteedChars.push(getRandomChar(excludeAmbiguous ? charset.symbol.replace(new RegExp(`[${charset.ambiguous}]`,'g'),'') : charset.symbol));
    
    guaranteedChars = guaranteedChars.filter(c => c);

    let generatedPassword = '';
    for (let i = 0; i < length - guaranteedChars.length; i++) {
        generatedPassword += pool[Math.floor(getSecureRandom() * pool.length)];
    }

    generatedPassword += guaranteedChars.join('');
    
    // True Cryptographic Shuffle
    generatedPassword = shuffleArray(generatedPassword.split('')).join('');

    if (animate) {
        animateDecryption(generatedPassword);
    } else {
        resultEl.value = generatedPassword;
        adjustFontSize(generatedPassword.length);
    }
    
    updateStrength(pool.length, length);
    
    if (saveHistory) {
        addToHistory(generatedPassword);
    }
}

function adjustFontSize(len) {
    if (len > 48) resultEl.style.fontSize = '1.0rem';
    else if (len > 32) resultEl.style.fontSize = '1.15rem';
    else if (len > 24) resultEl.style.fontSize = '1.3rem';
    else resultEl.style.fontSize = '1.5rem';
}

function animateDecryption(finalPassword) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let iterations = 0;
    const maxIterations = finalPassword.length > 30 ? 2 : 3; 
    
    adjustFontSize(finalPassword.length);
    
    clearInterval(window.decodeInterval);
    window.decodeInterval = setInterval(() => {
        resultEl.value = finalPassword.split('').map((letter, index) => {
            if (index < iterations) {
                return finalPassword[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        
        iterations += 1/maxIterations;
        
        if (iterations >= finalPassword.length) {
            clearInterval(window.decodeInterval);
            resultEl.value = finalPassword;
        }
    }, 20);
}

function getRandomChar(str) {
    if(!str) return null;
    return str[Math.floor(getSecureRandom() * str.length)];
}

function updateStrength(poolSize, length) {
    if(poolSize === 0) {
        strengthMeterEl.setAttribute('data-strength', '1');
        strengthTextEl.innerText = 'Weak';
        crackTimeValEl.innerText = 'Instant';
        return;
    }

    // Entropy calculation
    const entropy = length * (Math.log(poolSize) / Math.log(2));
    
    let strength = 1;
    if (entropy > 40) strength = 2; // ~Medium
    if (entropy > 60) strength = 3; // ~Strong
    if (entropy > 90) strength = 4; // ~Godlike

    strengthMeterEl.setAttribute('data-strength', strength);
    
    const strengthLabels = { 1: 'Weak', 2: 'Medium', 3: 'Strong', 4: 'Godlike' };
    strengthTextEl.innerText = strengthLabels[strength];

    const guessesPerSecond = 1e11; 
    const combinations = Math.pow(poolSize, length);
    const secondsToCrack = combinations / guessesPerSecond;

    crackTimeValEl.innerText = formatTime(secondsToCrack);
    
    const root = document.documentElement;
    if(strength === 1) { root.style.setProperty('--primary', '#ef4444'); root.style.setProperty('--primary-glow', 'rgba(239, 68, 68, 0.15)'); }
    else if(strength === 2) { root.style.setProperty('--primary', '#f59e0b'); root.style.setProperty('--primary-glow', 'rgba(245, 158, 11, 0.15)'); }
    else if(strength === 3) { root.style.setProperty('--primary', '#10b981'); root.style.setProperty('--primary-glow', 'rgba(16, 185, 129, 0.15)'); }
    else { root.style.setProperty('--primary', '#8b5cf6'); root.style.setProperty('--primary-glow', 'rgba(139, 92, 246, 0.15)'); }
}

function formatTime(seconds) {
    if (!isFinite(seconds) || seconds > 1e20) return "Trillions of Yrs";
    if (seconds < 1) return "Instant";
    if (seconds < 60) return `${Math.floor(seconds)} Secs`;
    
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.floor(minutes)} Mins`;
    
    const hours = minutes / 60;
    if (hours < 24) return `${Math.floor(hours)} Hours`;
    
    const days = hours / 24;
    if (days < 365) return `${Math.floor(days)} Days`;
    
    const years = days / 365;
    if (years < 1000) return `${Math.floor(years)} Years`;
    if (years < 1000000) return `${Math.floor(years/1000)}k Yrs`;
    if (years < 1000000000) return `${Math.floor(years/1000000)}m Yrs`;
    if (years < 1000000000000) return `${Math.floor(years/1000000000)}bn Yrs`;
    
    return "Trillions of Yrs";
}

function showToast() {
    toastEl.innerHTML = '<i class="fas fa-check-circle"></i> Password copied!';
    toastEl.classList.add('show');
    toastEl.style.borderColor = 'var(--primary)';
    toastEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5), 0 0 20px var(--primary-glow)';
    toastEl.querySelector('i').className = 'fas fa-check-circle';
    toastEl.querySelector('i').style.color = 'var(--primary)';
    setTimeout(() => { toastEl.classList.remove('show'); }, 2500);
}

function showErrorToast(msg) {
    toastEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
    toastEl.classList.add('show');
    toastEl.style.borderColor = 'var(--strength-weak)';
    toastEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(239, 68, 68, 0.4)';
    toastEl.querySelector('i').className = 'fas fa-exclamation-triangle';
    toastEl.querySelector('i').style.color = 'var(--strength-weak)';
    setTimeout(() => { toastEl.classList.remove('show'); }, 2500);
}

// History
function addToHistory(password) {
    if(passwordHistory.includes(password)) return; 
    passwordHistory.unshift(password); 
    if(passwordHistory.length > 15) passwordHistory.pop(); 
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    if (passwordHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No history yet. Generate some passwords!</div>';
        clearHistoryBtn.style.display = 'none';
        return;
    }
    
    clearHistoryBtn.style.display = 'block';

    passwordHistory.forEach((pw, idx) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const displayPw = pw.length > 20 ? pw.substring(0, 18) + '...' : pw;
        
        div.innerHTML = `
            <span class="history-pw" title="${pw}">${displayPw}</span>
            <button class="history-copy" title="Copy" data-idx="${idx}"><i class="far fa-copy"></i></button>
        `;
        historyList.appendChild(div);
    });

    document.querySelectorAll('.history-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-idx');
            copyToClipboard(passwordHistory[idx], e.currentTarget.querySelector('i'));
        });
    });
}

function toggleSidebar() {
    historySidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

historyToggleBtn.addEventListener('click', toggleSidebar);
historyCloseBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

clearHistoryBtn.addEventListener('click', () => {
    passwordHistory = [];
    renderHistory();
});

// Have I Been Pwned API Check Integration (k-Anonymity)
pwnedBtn.addEventListener('click', async () => {
    const password = resultEl.value;
    if(!password) return;
    
    pwnedVal.innerText = "Checking...";
    pwnedIcon.className = 'fas fa-spinner fa-spin stat-icon';
    pwnedIcon.style.color = "var(--secondary)";
    pwnedVal.style.color = "var(--text-main)";
    
    const isPwnedCount = await checkPwned(password);
    
    if(isPwnedCount === -1) {
        pwnedVal.innerText = "Error API";
        pwnedVal.style.color = "var(--strength-medium)";
        pwnedIcon.className = 'fas fa-exclamation-circle stat-icon';
        pwnedIcon.style.color = "var(--strength-medium)";
    } else if(isPwnedCount > 0) {
        pwnedVal.innerText = `Leaked! (${isPwnedCount})`;
        pwnedVal.style.color = "var(--strength-weak)";
        pwnedIcon.className = 'fas fa-times-circle stat-icon';
        pwnedIcon.style.color = "var(--strength-weak)";
    } else {
        pwnedVal.innerText = "Safe (0 leaks)";
        pwnedVal.style.color = "var(--strength-strong)";
        pwnedIcon.className = 'fas fa-check-circle stat-icon';
        pwnedIcon.style.color = "var(--strength-strong)";
    }
});

async function checkPwned(password) {
    try {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        const prefix = hashHex.slice(0, 5);
        const suffix = hashHex.slice(5);

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) return -1;
        
        const text = await response.text();
        const hashes = text.split('\n');
        
        let pwnedCount = 0;
        for (let line of hashes) {
            const [h, count] = line.split(':');
            if (h === suffix) {
                pwnedCount = parseInt(count.trim(), 10);
                break;
            }
        }
        
        return pwnedCount;
    } catch (e) {
        console.error("HIBP API Error:", e);
        return -1; 
    }
}

// Init
generatePasswordAndDisplay(true, true); 
