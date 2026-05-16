// game.js - Handles the RPG Game Logic

const CHARACTERS = {
  knight: { name: 'Knight', emoji: '⚔️', hp: 100, maxHp: 100, xp: 0 },
  wizard: { name: 'Wizard', emoji: '🧙‍♂️', hp: 80, maxHp: 80, xp: 0 },
  slime: { name: 'Pet Slime', emoji: '💧', hp: 120, maxHp: 120, xp: 0 }
};

let currentHero = null;
let gameInterval = null;
let isHealing = false;

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const charBtns = document.querySelectorAll('.char-btn');
const startGameBtn = document.getElementById('start-game-btn');

const heroNameEl = document.getElementById('hero-name');
const heroAvatarEl = document.getElementById('hero-avatar');
const heroLevelEl = document.getElementById('hero-level');
const heroXpEl = document.getElementById('hero-xp');
const heroXpMaxEl = document.getElementById('hero-xp-max');
const heroHpTextEl = document.getElementById('hero-hp-text');
const heroHpBarEl = document.getElementById('hero-hp-bar');
const gameLogEl = document.getElementById('game-log');

const healPromptEl = document.getElementById('heal-prompt');
const startHealBtn = document.getElementById('start-heal-btn');
const healProgressBar = document.getElementById('heal-progress-bar');

// Setup Character Selection
let selectedCharKey = null;

charBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    charBtns.forEach(b => b.classList.remove('selected', 'border-yellow-400'));
    btn.classList.add('selected', 'border-yellow-400');
    selectedCharKey = btn.dataset.char;
    startGameBtn.disabled = false;
  });
});

startGameBtn.addEventListener('click', () => {
  if (!selectedCharKey) return;
  if (!window.poseTracker || window.poseTracker.getCurrentPosture() === 'UNKNOWN') {
    alert("Please calibrate your posture first!");
    return;
  }

  startGame(selectedCharKey);
});

function startGame(charKey) {
  currentHero = { ...CHARACTERS[charKey], level: 1 };

  // UI Transition
  setupScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  updateHeroUI();
  logMessage(`Welcome, brave ${currentHero.name}! Keep your back straight to explore.`);

  // Start Game Loop
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameTick, 1000);
}

function updateHeroUI() {
  if (!currentHero) return;

  heroNameEl.textContent = currentHero.name;
  heroAvatarEl.textContent = currentHero.emoji;
  heroLevelEl.textContent = currentHero.level;

  const xpNeeded = currentHero.level * 100;
  heroXpEl.textContent = currentHero.xp;
  heroXpMaxEl.textContent = xpNeeded;

  heroHpTextEl.textContent = `${Math.floor(currentHero.hp)} / ${currentHero.maxHp}`;
  const hpPercent = Math.max(0, (currentHero.hp / currentHero.maxHp) * 100);
  heroHpBarEl.style.width = `${hpPercent}%`;

  if (hpPercent < 30 && currentHero.hp > 0) {
    heroHpBarEl.classList.replace('bg-green-500', 'bg-red-500');
    if (!isHealing) showHealPrompt();
  } else {
    heroHpBarEl.classList.replace('bg-red-500', 'bg-green-500');
    hideHealPrompt();
  }
}

function showHealPrompt() {
  healPromptEl.classList.remove('hidden');
}

function hideHealPrompt() {
  healPromptEl.classList.add('hidden');
}

function logMessage(msg) {
  const div = document.createElement('div');
  div.className = 'mb-1';

  const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
  div.innerHTML = `<span class="text-gray-500">[${time}]</span> ${msg}`;

  gameLogEl.appendChild(div);
  gameLogEl.scrollTop = gameLogEl.scrollHeight;
}

// Game Mechanics
function gameTick() {
  if (!currentHero || isHealing) return;

  const posture = window.poseTracker.getCurrentPosture();

  if (posture === 'GOOD') {
    gainXp(5);
    // Occasionally find items/fight monsters
    if (Math.random() < 0.1) {
      logMessage(`⚔️ Defeated a Goblin! (+10 XP)`);
      gainXp(10);
    }
  } else if (posture === 'SLOUCHING') {
    takeDamage(5);
  }
}

function gainXp(amount) {
  currentHero.xp += amount;
  const xpNeeded = currentHero.level * 100;

  if (currentHero.xp >= xpNeeded) {
    currentHero.xp -= xpNeeded;
    currentHero.level++;
    currentHero.maxHp += 10;
    currentHero.hp = currentHero.maxHp;
    logMessage(`🎉 LEVEL UP! ${currentHero.name} is now level ${currentHero.level}! HP restored.`);
  }
  updateHeroUI();
}

function takeDamage(amount) {
  if (currentHero.hp <= 0) return;

  currentHero.hp -= amount;
  logMessage(`💥 Ouch! Slouching dealt ${amount} damage!`);

  if (currentHero.hp <= 0) {
    currentHero.hp = 0;
    logMessage(`💀 Oh no! ${currentHero.name} has collapsed from poor posture.`);
  }
  updateHeroUI();
}

// Healing Mini-Game
let healInterval = null;
let healProgress = 0;
let stretchTarget = 'LEFT'; // LEFT or RIGHT

startHealBtn.addEventListener('click', () => {
  isHealing = true;
  healProgress = 0;
  stretchTarget = 'LEFT';
  startHealBtn.disabled = true;
  startHealBtn.textContent = 'Look LEFT slowly...';
  logMessage(`🧘‍♂️ Initiated Healing Spell. Follow instructions.`);

  if (healInterval) clearInterval(healInterval);
  healInterval = setInterval(healTick, 100);
});

function healTick() {
  const landmarks = window.poseTracker.getLandmarks();
  if (!landmarks) return;

  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];

  // Calculate horizontal position relative to ears
  const headX = nose.x;

  // Logic to detect turning head left/right based on nose x pos
  // When turning left, nose x gets closer to left ear x.
  // (Note: camera might be mirrored, so we use absolute diffs or general x shifts)
  // Let's use simple x thresholding for now

  if (stretchTarget === 'LEFT' && headX > 0.6) {
    healProgress += 5;
    if (healProgress >= 50) {
      stretchTarget = 'RIGHT';
      startHealBtn.textContent = 'Now look RIGHT slowly...';
      logMessage(`✨ Good! Now look to the right.`);
    }
  } else if (stretchTarget === 'RIGHT' && headX < 0.4) {
    healProgress += 5;
  }

  healProgressBar.style.width = `${healProgress}%`;

  if (healProgress >= 100) {
    clearInterval(healInterval);
    completeHeal();
  }
}

function completeHeal() {
  isHealing = false;
  currentHero.hp = currentHero.maxHp;
  startHealBtn.disabled = false;
  startHealBtn.textContent = 'Begin Stretching';
  healProgressBar.style.width = `0%`;
  updateHeroUI();
  logMessage(`💖 Healing Spell successful! HP fully restored.`);
}

// Global hooks for pose.js
window.game = {
  onGoodPosture: () => {
    if (currentHero && !isHealing && currentHero.hp > 0) {
      logMessage(`✨ Posture corrected. Resuming journey...`);
    }
  },
  onSlouch: () => {
    if (currentHero && !isHealing && currentHero.hp > 0) {
      logMessage(`⚠️ Slouching detected! Correct your posture!`);
    }
  }
};
