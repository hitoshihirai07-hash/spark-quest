// でんちペット（仮）
// 超ゆるい1体育成。状態は自動減少なしで、ボタンを押したときだけ変化。

const SAVE_KEY = "denchi_pet_v1";

let pet = {
  mood: 70,     // なつき
  hunger: 70,   // おなか
  energy: 70    // げんき
};

// ------- ユーティリティ -------
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function loadPet() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.mood === "number") pet.mood = data.mood;
    if (typeof data.hunger === "number") pet.hunger = data.hunger;
    if (typeof data.energy === "number") pet.energy = data.energy;
  } catch (e) {
    console.warn("ロードに失敗:", e);
  }
}

function savePet() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(pet));
  } catch (e) {
    console.warn("セーブに失敗:", e);
  }
}

function appendLog(text, type = "system") {
  const logEl = document.getElementById("log");
  if (!logEl) return;
  const line = document.createElement("div");
  line.className = "log-line " + type;
  line.textContent = text;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// ------- UI更新 -------
function updateBars() {
  const moodPct = clamp(pet.mood, 0, 100);
  const hungerPct = clamp(pet.hunger, 0, 100);
  const energyPct = clamp(pet.energy, 0, 100);

  const barMood = document.getElementById("barMood");
  const barHunger = document.getElementById("barHunger");
  const barEnergy = document.getElementById("barEnergy");

  barMood.style.width = moodPct + "%";
  barHunger.style.width = hungerPct + "%";
  barEnergy.style.width = energyPct + "%";

  document.getElementById("valMood").textContent = moodPct;
  document.getElementById("valHunger").textContent = hungerPct;
  document.getElementById("valEnergy").textContent = energyPct;

  updatePetImageAndMessage();
}

function updatePetImageAndMessage() {
  const imgEl = document.getElementById("petImage");
  const msgEl = document.getElementById("statusMessage");

  const mood = clamp(pet.mood, 0, 100);
  const hunger = clamp(pet.hunger, 0, 100);
  const energy = clamp(pet.energy, 0, 100);

  let img = "img/denchi_normal.png";
  let msg = "";

  if (energy > 70 && mood > 70 && hunger > 40) {
    img = "img/denchi_happy.png";
    msg = "とてもごきげんで、ピカピカ元気そうだ。";
  } else if (energy < 30 || hunger < 30) {
    img = "img/denchi_tired.png";
    if (hunger < 30 && energy < 30) {
      msg = "おなかもげんきも足りないみたいだ…。何かしてあげよう。";
    } else if (hunger < 30) {
      msg = "おなかがすいているようだ。おやつが欲しそうにしている。";
    } else {
      msg = "ちょっとお疲れ気味。やすませてあげたほうがよさそう。";
    }
  } else if (mood < 40) {
    img = "img/denchi_normal.png";
    msg = "少しさみしそうにしている。なでてほしそうだ。";
  } else {
    img = "img/denchi_normal.png";
    msg = "のんびりしている。特に不満はなさそうだ。";
  }

  imgEl.src = img;
  msgEl.textContent = msg;
}

// ------- アクション処理 -------
function doPet() {
  // なでる：なつき↑、げんき↓少し
  pet.mood = clamp(pet.mood + 15, 0, 100);
  pet.energy = clamp(pet.energy - 5, 0, 100);
  appendLog("なでてあげた。うれしそうにしている。", "action");
  afterAction();
}

function doSnack() {
  // おやつ：おなか↑、なつき↑少し
  pet.hunger = clamp(pet.hunger + 20, 0, 100);
  pet.mood = clamp(pet.mood + 5, 0, 100);
  appendLog("おやつをあげた。もぐもぐ食べている。", "action");
  afterAction();
}

function doRest() {
  // やすませる：げんき↑、おなか↓少し
  pet.energy = clamp(pet.energy + 20, 0, 100);
  pet.hunger = clamp(pet.hunger - 8, 0, 100);
  appendLog("少し休ませた。すこしスッキリしたようだ。", "action");
  afterAction();
}

function afterAction() {
  updateBars();
  savePet();
}

// ------- 初期化 -------
function setupEvents() {
  document.getElementById("btnPet").addEventListener("click", doPet);
  document.getElementById("btnSnack").addEventListener("click", doSnack);
  document.getElementById("btnRest").addEventListener("click", doRest);
}

document.addEventListener("DOMContentLoaded", () => {
  loadPet();
  setupEvents();
  updateBars();
  appendLog("でんちペットとの生活が始まった。気が向いたときだけお世話してあげよう。", "system");
});
