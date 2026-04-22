// ===================== CONFIG =====================
const NAMES = {
  jonas:  { display: 'Jonas',  emoji: '⭐', relation: 'Jij!',     color: '#ff4757' },
  esther: { display: 'Esther', emoji: '👩', relation: 'Mama',     color: '#fd79a8' },
  koen:   { display: 'Koen',   emoji: '👨', relation: 'Papa',     color: '#0984e3' },
  vera:   { display: 'Vera',   emoji: '👧', relation: 'Zusje',    color: '#a29bfe' },
  floris: { display: 'Floris', emoji: '👶', relation: 'Broertje', color: '#00b894' },
};

// Letters we have MP3 files for
const ALL_LETTERS = ['A','E','F','H','I','J','K','L','N','O','R','S','T','V'];
const BALLOON_COLORS = ['#ff6b6b','#fdcb6e','#6c5ce7','#00b894','#0984e3','#fd79a8','#e17055','#00cec9'];

let currentName = 'jonas';
let currentGame = 'schrijven';

// ===================== SCREEN =====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===================== AUDIO =====================
const synth = window.speechSynthesis;

function playAudio(key, fallback = '') {
  const audio = new Audio(`assets/${key}.mp3`);
  audio.play().catch(() => {
    if (!fallback) return;
    if (synth.speaking) synth.cancel();
    const u = new SpeechSynthesisUtterance(fallback);
    u.lang = 'nl-NL';
    u.rate = 0.9;
    synth.speak(u);
  });
  return audio;
}

function playTone(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'cheer') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtValue(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {}
}

function fireConfetti(color) {
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: [color, '#ffd700', '#ffffff'] });
}

function fireEndConfetti(color) {
  const end = Date.now() + 3000;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: [color, '#ffd700'] });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: [color, '#ffd700'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===================== FULLSCREEN =====================
document.getElementById('fullscreen-btn').addEventListener('click', () => {
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  if (fn) fn.call(el).catch(() => {});
});

// ===================== NAME SELECTION =====================
document.querySelectorAll('.name-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentName = btn.dataset.name;
    const nd = NAMES[currentName];
    document.documentElement.style.setProperty('--primary-color', nd.color);
    document.getElementById('chosen-emoji').textContent = nd.emoji;
    playAudio(`name_${currentName}`, `We schrijven de naam ${nd.display}!`);
    try {
      const el = document.documentElement;
      const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
      if (fn) fn.call(el).catch(() => {});
    } catch (e) {}
    showScreen('gamemode-screen');
  });
});

document.getElementById('back-to-names-btn').addEventListener('click', () => showScreen('name-screen'));

// ===================== GAME MODE SELECTION =====================
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentGame = btn.dataset.mode;
    if      (currentGame === 'schrijven') startWriting();
    else if (currentGame === 'memory')    startMemory();
    else if (currentGame === 'trein')     startTrain();
    else if (currentGame === 'raad')      startRaad();
    else if (currentGame === 'ballon')    startBallon();
  });
});

document.getElementById('back-game-btn').addEventListener('click',   () => showScreen('gamemode-screen'));
document.getElementById('back-memory-btn').addEventListener('click',  () => showScreen('gamemode-screen'));
document.getElementById('back-train-btn').addEventListener('click',   () => showScreen('gamemode-screen'));
document.getElementById('back-raad-btn').addEventListener('click',    () => showScreen('gamemode-screen'));
document.getElementById('back-ballon-btn').addEventListener('click',  () => showScreen('gamemode-screen'));

// ===================== END SCREEN =====================
function showEndScreen() {
  const nd = NAMES[currentName];
  document.getElementById('end-title').textContent = `${nd.display}! ${nd.emoji}`;
  document.getElementById('winner-emoji').textContent = nd.emoji;
  showScreen('end-screen');
  playAudio(`congrats_${currentName}`, `Gefeliciteerd! Je hebt ${nd.display} gespeld!`);
  fireEndConfetti(nd.color);
}

document.getElementById('restart-btn').addEventListener('click', () => {
  if      (currentGame === 'schrijven') startWriting();
  else if (currentGame === 'memory')    startMemory();
  else if (currentGame === 'trein')     startTrain();
  else if (currentGame === 'raad')      startRaad();
  else if (currentGame === 'ballon')    startBallon();
});

document.getElementById('other-name-btn').addEventListener('click', () => showScreen('name-screen'));

// ===================== WRITING GAME =====================
let currentLetterIndex = 0;
let isDrawing = false;
let totalLetterPixels = 0;

const canvas   = document.getElementById('draw-canvas');
const ctx      = canvas.getContext('2d');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');
const progressBar  = document.getElementById('progress');
const heroTracker  = document.getElementById('hero-tracker');

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width  = container.clientWidth;
  canvas.height = container.clientHeight;
  bgCanvas.width  = container.clientWidth;
  bgCanvas.height = container.clientHeight;
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';
  ctx.lineWidth = 35;
  const letter = NAMES[currentName].display[currentLetterIndex];
  if (letter) drawTargetLetter(letter);
}

window.addEventListener('resize', resizeCanvas);

function drawTargetLetter(letter) {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  const fontSize = bgCanvas.clientHeight * 0.5;
  bgCtx.font = `${fontSize}px 'Fredoka One', cursive`;
  bgCtx.textAlign = 'center';
  bgCtx.textBaseline = 'middle';
  bgCtx.fillStyle = '#f0f0f0';
  bgCtx.fillText(letter.toUpperCase(), bgCanvas.width / 2, bgCanvas.height / 2);
  const data = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height).data;
  totalLetterPixels = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 128) totalLetterPixels++;
  }
}

function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

function startWriting() {
  const nd = NAMES[currentName];
  ctx.strokeStyle = nd.color;
  heroTracker.textContent = nd.emoji;
  showScreen('game-screen');
  startWritingLevel(0);
}

function startWritingLevel(index) {
  currentLetterIndex = index;
  const nameStr = NAMES[currentName].display;
  resizeCanvas();
  clearCanvas();
  const perc = (index / nameStr.length) * 100;
  progressBar.style.width = `${perc}%`;
  heroTracker.style.left  = `${perc}%`;
  setTimeout(() => {
    const letter = nameStr[index].toUpperCase();
    playAudio(letter, `De letter ${letter}`);
  }, 800);
}

document.getElementById('clear-btn').addEventListener('click', () => {
  clearCanvas();
  playAudio('oeps', 'Oeps! Weer opnieuw.');
});

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDrawing(e) { isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); e.preventDefault(); }
function draw(e) { if (!isDrawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); e.preventDefault(); }

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  ctx.closePath();
  const drawData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const bgData   = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height).data;
  let covered = 0, outside = 0;
  for (let i = 3; i < bgData.length; i += 16) {
    const inLetter = bgData[i] > 128;
    const isDrawn  = drawData[i] > 128;
    if (isDrawn) { if (inLetter) covered += 4; else outside += 4; }
  }
  if (totalLetterPixels > 0) {
    const coverage  = covered / totalLetterPixels;
    const wildScrib = outside > (covered * 2.5) && outside > (totalLetterPixels * 0.8);
    if (coverage > 0.65)  triggerWritingSuccess();
    else if (wildScrib) { clearCanvas(); playAudio('oeps', 'Oeps! Weer opnieuw.'); }
  }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
window.addEventListener('touchend', stopDrawing);

function triggerWritingSuccess() {
  const nd = NAMES[currentName];
  fireConfetti(nd.color);
  playAudio('well_done', 'Goed zo!');
  const nameStr = nd.display;
  setTimeout(() => {
    if (currentLetterIndex < nameStr.length - 1) startWritingLevel(currentLetterIndex + 1);
    else showEndScreen();
  }, 2000);
}

// ===================== MEMORY GAME =====================
let memoryFlipped = [];
let memoryMatched = 0;
let memoryTotal   = 0;
let memoryLocked  = false;

function startMemory() {
  const nd = NAMES[currentName];
  const uniqueLetters = [...new Set(nd.display.toUpperCase().split(''))];
  const pairs = shuffleArray([...uniqueLetters, ...uniqueLetters]);
  memoryMatched = 0; memoryTotal = uniqueLetters.length;
  memoryFlipped = []; memoryLocked = false;
  document.getElementById('memory-title').textContent = `Memory ${nd.emoji}`;
  const grid = document.getElementById('memory-grid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(4, 1fr)`;
  pairs.forEach(letter => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.letter = letter;
    card.style.setProperty('--card-color', nd.color);
    card.innerHTML = `<div class="card-inner"><div class="card-front">🌟</div><div class="card-back">${letter}</div></div>`;
    card.addEventListener('click', () => handleCardFlip(card));
    grid.appendChild(card);
  });
  showScreen('memory-screen');
  playAudio('memory_intro', 'Zoek de kaarten die bij elkaar horen!');
}

function handleCardFlip(card) {
  if (memoryLocked) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  card.classList.add('flipped');
  memoryFlipped.push(card);
  if (memoryFlipped.length === 2) {
    memoryLocked = true;
    const [a, b] = memoryFlipped;
    if (a.dataset.letter === b.dataset.letter) {
      setTimeout(() => {
        a.classList.add('matched'); b.classList.add('matched');
        playAudio('memory_match', 'Goed gevonden!');
        memoryMatched++;
        memoryFlipped = []; memoryLocked = false;
        if (memoryMatched >= memoryTotal) setTimeout(showEndScreen, 1200);
      }, 400);
    } else {
      setTimeout(() => {
        a.classList.remove('flipped'); b.classList.remove('flipped');
        playAudio('oeps', 'Oeps!');
        memoryFlipped = []; memoryLocked = false;
      }, 900);
    }
  }
}

// ===================== TRAIN GAME =====================
let trainProgress = 0;
let trainTarget   = [];

function startTrain() {
  const nd = NAMES[currentName];
  trainTarget = nd.display.toUpperCase().split('');
  trainProgress = 0;
  document.getElementById('train-title').textContent = `Letter Trein ${nd.emoji}`;
  const targetEl = document.getElementById('train-target');
  targetEl.innerHTML = trainTarget.map((l, i) => `<span class="target-letter" id="tletter-${i}">${l}</span>`).join('');
  const track = document.getElementById('train-track');
  track.innerHTML = `<span class="train-loco">🚂</span>` +
    trainTarget.map((_, i) => `<div class="train-car" id="car-${i}"></div>`).join('');
  const shuffled = shuffleArray([...trainTarget]);
  const pool = document.getElementById('letter-pool');
  pool.innerHTML = shuffled.map((l, i) =>
    `<div class="letter-tile" data-letter="${l}" data-pool-idx="${i}" style="--brand-color: ${nd.color}">${l}</div>`
  ).join('');
  document.querySelectorAll('.letter-tile').forEach(tile => tile.addEventListener('click', () => handleTrainTile(tile)));
  highlightNextCar();
  showScreen('train-screen');
  playAudio('train_intro', 'Tik de letters in de goede volgorde!');
}

function highlightNextCar() {
  document.querySelectorAll('.train-car').forEach((c, i) => c.classList.toggle('next-car', i === trainProgress));
}

function handleTrainTile(tile) {
  if (tile.classList.contains('used')) return;
  const letter = tile.dataset.letter;
  const expected = trainTarget[trainProgress];
  if (letter === expected) {
    tile.classList.add('used');
    const car = document.getElementById(`car-${trainProgress}`);
    car.textContent = letter; car.classList.add('filled'); car.classList.remove('next-car');
    playAudio(letter, letter);
    trainProgress++;
    if (trainProgress >= trainTarget.length) {
      setTimeout(() => { playAudio('train_win', 'Geweldig!'); setTimeout(showEndScreen, 1600); }, 400);
    } else {
      highlightNextCar();
    }
  } else {
    tile.classList.add('shake');
    playAudio('oeps', 'Oeps!');
    setTimeout(() => tile.classList.remove('shake'), 600);
  }
}

// ===================== RAAD DE LETTER =====================
let raadRounds = [];
let raadCurrent = 0;
let raadCurrentLetter = '';

function startRaad() {
  const nd = NAMES[currentName];
  const nameLetters = [...new Set(nd.display.toUpperCase().split(''))];
  raadRounds  = shuffleArray(nameLetters);
  raadCurrent = 0;
  document.getElementById('raad-title').textContent = `Raad de Letter ${nd.emoji}`;
  showScreen('raad-screen');
  playAudio('raad_intro', 'Welke letter hoor je?');
  setTimeout(showRaadRound, 1200);
}

function showRaadRound() {
  if (raadCurrent >= raadRounds.length) { showEndScreen(); return; }

  raadCurrentLetter = raadRounds[raadCurrent];
  const nd = NAMES[currentName];

  // Progress
  document.getElementById('raad-progress').style.width = `${(raadCurrent / raadRounds.length) * 100}%`;

  // 4 options: 1 correct + 3 distractors from ALL_LETTERS
  const distractors = shuffleArray(ALL_LETTERS.filter(l => l !== raadCurrentLetter)).slice(0, 3);
  const options = shuffleArray([raadCurrentLetter, ...distractors]);

  const grid = document.getElementById('raad-options');
  grid.innerHTML = '';
  options.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'raad-card';
    btn.textContent = letter;
    btn.style.setProperty('--card-color', nd.color);
    btn.addEventListener('click', () => handleRaadAnswer(btn, letter));
    grid.appendChild(btn);
  });

  setTimeout(() => playAudio(raadCurrentLetter, `De letter ${raadCurrentLetter}`), 500);
}

function handleRaadAnswer(btn, chosen) {
  const grid = document.getElementById('raad-options');
  grid.querySelectorAll('.raad-card').forEach(b => b.style.pointerEvents = 'none');

  if (chosen === raadCurrentLetter) {
    btn.classList.add('raad-correct');
    fireConfetti(NAMES[currentName].color);
    playAudio('well_done', 'Goed zo!');
    raadCurrent++;
    setTimeout(showRaadRound, 1300);
  } else {
    btn.classList.add('raad-wrong');
    playAudio('oeps', 'Oeps!');
    setTimeout(() => {
      btn.classList.remove('raad-wrong');
      grid.querySelectorAll('.raad-card').forEach(b => b.style.pointerEvents = '');
      playAudio(raadCurrentLetter, `De letter ${raadCurrentLetter}`);
    }, 900);
  }
}

document.getElementById('replay-btn').addEventListener('click', () => {
  if (raadCurrentLetter) playAudio(raadCurrentLetter, `De letter ${raadCurrentLetter}`);
});

// ===================== BALLONNEN =====================
let ballonRounds  = [];
let ballonCurrent = 0;

function startBallon() {
  const nd = NAMES[currentName];
  const nameLetters = [...new Set(nd.display.toUpperCase().split(''))];
  ballonRounds  = shuffleArray([...nameLetters]);
  ballonCurrent = 0;

  // Fill to 6 balloons: name letters + distractors
  const needed     = Math.max(6, nameLetters.length);
  const distractors = shuffleArray(ALL_LETTERS.filter(l => !nameLetters.includes(l)))
    .slice(0, needed - nameLetters.length);
  const allDisplay = shuffleArray([...nameLetters, ...distractors]);

  document.getElementById('ballon-title').textContent = `Ballonnen ${nd.emoji}`;

  const container = document.getElementById('ballon-container');
  container.innerHTML = '';
  allDisplay.forEach((letter, i) => {
    const balloon = document.createElement('div');
    balloon.className = 'balloon';
    balloon.dataset.letter = letter;
    balloon.textContent = letter;
    balloon.style.background = BALLOON_COLORS[i % BALLOON_COLORS.length];
    balloon.style.setProperty('--speed', `${2.2 + (i % 4) * 0.4}s`);
    balloon.style.setProperty('--delay',  `${(i % 3) * 0.3}s`);
    balloon.addEventListener('click', () => handleBalloonPop(balloon));
    container.appendChild(balloon);
  });

  showScreen('ballon-screen');
  playAudio('ballon_intro', 'Knap de ballon met de goede letter!');
  setTimeout(askBalloon, 1400);
}

function askBalloon() {
  if (ballonCurrent >= ballonRounds.length) { setTimeout(showEndScreen, 600); return; }
  const target  = ballonRounds[ballonCurrent];
  const display = document.getElementById('ballon-target');
  display.classList.remove('bounce-in');
  void display.offsetWidth; // reflow to restart animation
  display.classList.add('bounce-in');
  display.textContent = `Knap de ${target}! 👆`;
  setTimeout(() => playAudio(target, `De letter ${target}`), 200);
}

function handleBalloonPop(balloon) {
  if (balloon.classList.contains('balloon-popped')) return;
  const letter = balloon.dataset.letter;
  const target = ballonRounds[ballonCurrent];

  if (letter === target) {
    balloon.classList.add('balloon-popped');
    fireConfetti(NAMES[currentName].color);
    playAudio('well_done', 'Goed zo!');
    ballonCurrent++;
    setTimeout(askBalloon, 1000);
  } else {
    balloon.classList.add('balloon-wrong');
    playAudio('oeps', 'Oeps!');
    setTimeout(() => balloon.classList.remove('balloon-wrong'), 600);
  }
}
