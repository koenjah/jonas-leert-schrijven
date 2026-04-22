const name = "jonas";
let currentLetterIndex = 0;
let selectedHero = "brandweerman";
const heroEmojis = {
    "brandweerman": "🧑‍🚒",
    "ridder": "🛡️",
    "draak": "🐉",
    "robot": "🤖"
};

const screens = {
    intro: document.getElementById('intro-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen')
};

const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const progressBar = document.getElementById('progress');
const heroTracker = document.getElementById('hero-tracker');
const clearBtn = document.getElementById('clear-btn');

let isDrawing = false;
let totalLetterPixels = 0;

// Audio Fallback: Web Speech API
const synth = window.speechSynthesis;
function speak(text) {
    if (synth.speaking) synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'nl-NL';
    utter.rate = 0.9;
    synth.speak(utter);
}

// Setup Canvas Size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    bgCanvas.width = container.clientWidth;
    bgCanvas.height = container.clientHeight;
    
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 35; // Balanced thickness for kids
    
    // We must redraw the letter when resized
    if (name[currentLetterIndex]) {
        drawTargetLetter(name[currentLetterIndex]);
    }
}

function drawTargetLetter(letter) {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    const fontSize = canvas.clientHeight * 0.5;
    bgCtx.font = `${fontSize}px 'Fredoka One', cursive`;
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillStyle = '#f0f0f0';
    bgCtx.fillText(letter, bgCanvas.width / 2, bgCanvas.height / 2);

    // Calculate total opaque pixels
    const bgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height).data;
    totalLetterPixels = 0;
    for (let i = 3; i < bgData.length; i += 4) {
        if (bgData[i] > 128) totalLetterPixels++;
    }
}

window.addEventListener('resize', resizeCanvas);

// Hero Selection
document.querySelectorAll('.hero-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedHero = btn.dataset.hero;
        const color = btn.style.getPropertyValue('--brand-color');
        ctx.strokeStyle = color;
        
        // Apply theme
        document.body.className = `game-theme-${selectedHero}`;
        
        // Try to go fullscreen
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } catch(e) {}

        showScreen('game');
        startLevel(0);
        playInstruction('intro', "Hoi Jonas! Kies je favoriete held om te beginnen.");
    });
});

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenId].classList.add('active');
}

function startLevel(index) {
    currentLetterIndex = index;
    const letter = name[index];
    drawTargetLetter(letter);
    clearCanvas();
    
    // Update progress
    const progressPerc = (index / name.length) * 100;
    progressBar.style.width = `${progressPerc}%`;
    heroTracker.style.left = `${progressPerc}%`;
    heroTracker.textContent = heroEmojis[selectedHero];

    // Play letter sound
    const prompts = {
        'j': "Schrijf nu de letter Jee.",
        'o': "Goed zo! Nu de letter Oh.",
        'n': "Super! Nu de letter En.",
        'a': "Bijna klaar! Nu de letter Ah.",
        's': "De laatste letter! De Es."
    };
    
    setTimeout(() => playInstruction(letter.toUpperCase(), prompts[letter]), 1000);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

clearBtn.addEventListener('click', () => {
    clearCanvas();
    playInstruction('oeps', "Oeps! Weer opnieuw.");
});

// Drawing Logic
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
}

function draw(e) {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    e.preventDefault();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();

    // Check pixel coverage!
    const drawData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const bgData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height).data;
    
    let coveredPixels = 0;
    let outOfBoundsPixels = 0;
    // Step by 16 (every 4th pixel) for performance
    for (let i = 3; i < bgData.length; i += 16) {
        const isLetter = bgData[i] > 128;
        const isDrawn = drawData[i] > 128;
        
        if (isDrawn) {
            if (isLetter) {
                coveredPixels += 4; // approximated since we skipped pixels
            } else {
                outOfBoundsPixels += 4;
            }
        }
    }

    if (totalLetterPixels > 0) {
        const coverage = coveredPixels / totalLetterPixels;
        
        // Ratio based check: if there is way too much random drawing vs good tracing
        const wildScribble = outOfBoundsPixels > (coveredPixels * 2.5) && outOfBoundsPixels > (totalLetterPixels * 0.8);

        if (coverage > 0.65) {
            triggerSuccess();
        } else if (wildScribble) {
            // Scrubbed too wildly outside the lines
            playInstruction('oeps', "Oeps! Weer opnieuw.");
            clearCanvas();
        }
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
window.addEventListener('touchend', stopDrawing);

function triggerSuccess() {
    // Dopamine hits
    confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: [ctx.strokeStyle, '#ffd700', '#ffffff']
    });

    playAudioEffect('cheer');
    playInstruction('well_done', "Geweldig gedaan!");

    // Brief delay before next letter
    setTimeout(() => {
        if (currentLetterIndex < name.length - 1) {
            startLevel(currentLetterIndex + 1);
        } else {
            showEndScreen();
        }
    }, 2000);
}

function showEndScreen() {
    progressBar.style.width = '100%';
    heroTracker.style.left = '100%';
    document.getElementById('winner-hero').textContent = heroEmojis[selectedHero];
    showScreen('end');
    playInstruction('congrats', "Gefeliciteerd Jonas! Je heb je naam geschreven! Je bent een echte held!");
    
    // Continuous confetti for winning
    const end = Date.now() + 3000;
    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ff6b6b', '#ffd700']
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#4ecdc4', '#ffd700']
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

document.getElementById('restart-btn').addEventListener('click', () => {
    showScreen('intro');
});

// Instruction Management
function playInstruction(key, text) {
    const audioFilePath = `assets/${key}.mp3`;
    const audio = new Audio(audioFilePath);
    
    audio.play().catch(() => {
        // Fallback to speech synth if audio file doesn't exist
        console.log(`Audio file ${audioFilePath} not found, using speech synthesis.`);
        speak(text);
    });
}

// Simple Audio Effects using Web Audio API (No files needed)
function playAudioEffect(type) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'cheer') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}
