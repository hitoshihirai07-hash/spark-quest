// スパーククエスト（仮）
// シンプルな1人用育成RPG風ミニゲーム

const TOTAL_FLOORS = 30;
const MAX_LEVEL = 40;
const SAVE_KEY = "spark_quest_save_v1";

let stages = [];
let player = null;
let currentFloor = 1;
let maxFloorReached = 1;

// -------- ユーティリティ --------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// -------- ステージ生成 --------
function generateStages() {
  const arr = [];
  for (let f = 1; f <= TOTAL_FLOORS; f++) {
    const recommendedLevel = Math.round(
      1 + (MAX_LEVEL - 1) * (f - 1) / (TOTAL_FLOORS - 1)
    );

    // プレイヤーの想定ステータス（目安）
    const expectedHP = 30 + 5 * recommendedLevel;
    const expectedAtk = 8 + 2 * recommendedLevel;
    const expectedDef = 4 + 1.5 * recommendedLevel;

    // だいたい3〜4手で倒せるくらいのHP
    const enemyHP = Math.round(expectedAtk * 3.5);

    // 大体5〜7発くらい耐えられるようなダメージを逆算
    const targetHitsToDie = 6;
    const approxDamageToPlayer = expectedHP / targetHitsToDie;
    const enemyAtk = Math.round(approxDamageToPlayer + expectedDef * 0.4);

    const enemyDef = Math.round(expectedDef * 0.9);

    const rewardExp = 5 + Math.round(recommendedLevel * 2.2);
    const rewardGold = 8 + Math.round(recommendedLevel * 2.6);

    arr.push({
      floor: f,
      name: `第${f}層`,
      recommendedLevel,
      enemyHP,
      enemyAtk,
      enemyDef,
      rewardExp,
      rewardGold
    });
  }
  return arr;
}

// -------- プレイヤー関連 --------
function createNewPlayer() {
  return {
    level: 1,
    exp: 0,
    expToNext: 12,
    maxHP: 30,
    attack: 8,
    defense: 4,
    speed: 7,
    gold: 0
  };
}

function gainExp(amount) {
  player.exp += amount;
  appendLog(`EXPを${amount}獲得した。`, "system");
  while (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    levelUp();
  }
}

function levelUp() {
  player.level += 1;
  // レベルアップに必要な経験値は少しずつ増加
  player.expToNext = Math.round(12 + player.level * 4.5);

  // 合計3〜6ポイントをランダムに振り分ける
  const totalPoints = randInt(3, 6);
  const stats = ["maxHP", "attack", "defense", "speed"];
  for (let i = 0; i < totalPoints; i++) {
    const idx = randInt(0, stats.length - 1);
    player[stats[idx]] += 1;
  }

  appendLog(
    `レベルが${player.level}になった！（合計${totalPoints}ポイント成長）`,
    "system"
  );
}

// -------- 戦闘関連 --------
function calcDamage(attackerAtk, defenderDef) {
  const base = attackerAtk - defenderDef * 0.4;
  const variance = randInt(-2, 2);
  const raw = Math.round(base + variance);
  return Math.max(1, raw);
}

function performBattle() {
  const stage = stages.find(s => s.floor === currentFloor);
  if (!stage) return;

  appendLog(`=== ${stage.name} に挑戦 ===`, "system");

  let playerHP = player.maxHP;
  let enemyHP = stage.enemyHP;
  let turn = 1;

  // 推奨レベルより低い場合、警告だけ出す
  if (player.level < stage.recommendedLevel) {
    appendLog(
      `※ 推奨レベル(${stage.recommendedLevel})より低い状態で挑んでいるようだ…`,
      "system"
    );
  }

  while (playerHP > 0 && enemyHP > 0 && turn <= 40) {
    appendLog(`-- ターン${turn} --`, "system");

    // 行動順判定（敵すばやさは簡易的に攻撃力から算出）
    const enemySpeed = Math.round(stage.enemyAtk * 0.15);
    const playerGoesFirst =
      player.speed > enemySpeed ||
      (player.speed === enemySpeed && Math.random() < 0.5);

    if (playerGoesFirst) {
      // プレイヤー攻撃
      const dmgToEnemy = calcDamage(player.attack, stage.enemyDef);
      enemyHP = Math.max(0, enemyHP - dmgToEnemy);
      appendLog(`主人公の攻撃！ 敵に${dmgToEnemy}ダメージ。`, "player");

      if (enemyHP <= 0) {
        appendLog("敵を倒した！", "player");
        break;
      }

      // 敵攻撃
      const dmgToPlayer = calcDamage(stage.enemyAtk, player.defense);
      playerHP = Math.max(0, playerHP - dmgToPlayer);
      appendLog(`敵の攻撃！ ${dmgToPlayer}のダメージを受けた。`, "enemy");

      if (playerHP <= 0) {
        appendLog("力尽きてしまった…", "enemy");
        break;
      }
    } else {
      // 敵先攻
      const dmgToPlayer = calcDamage(stage.enemyAtk, player.defense);
      playerHP = Math.max(0, playerHP - dmgToPlayer);
      appendLog(`敵の先制攻撃！ ${dmgToPlayer}のダメージを受けた。`, "enemy");

      if (playerHP <= 0) {
        appendLog("力尽きてしまった…", "enemy");
        break;
      }

      const dmgToEnemy = calcDamage(player.attack, stage.enemyDef);
      enemyHP = Math.max(0, enemyHP - dmgToEnemy);
      appendLog(`主人公の反撃！ 敵に${dmgToEnemy}ダメージ。`, "player");

      if (enemyHP <= 0) {
        appendLog("敵を倒した！", "player");
        break;
      }
    }

    turn++;
  }

  if (playerHP > 0 && enemyHP <= 0) {
    handleVictory(stage);
  } else if (playerHP <= 0) {
    handleDefeat(stage);
  } else {
    // ターン数上限で終了した場合は引き分け扱い（プレイヤー側敗北）
    appendLog("戦いは長引きすぎた…撤退することにした。", "system");
    handleDefeat(stage);
  }

  saveGame();
  updateUI();
}

function handleVictory(stage) {
  appendLog(
    `${stage.name} を突破！ EXP${stage.rewardExp} / ${stage.rewardGold}G を獲得。`,
    "system"
  );
  player.gold += stage.rewardGold;
  gainExp(stage.rewardExp);

  if (currentFloor === maxFloorReached && currentFloor < TOTAL_FLOORS) {
    maxFloorReached += 1;
    currentFloor = maxFloorReached;
    appendLog(
      `新たな階層「第${currentFloor}層」への道が開けた！`,
      "system"
    );
  }
}

function calcReviveCost(level, gold) {
  if (level <= 0) return 0;
  let cost = Math.floor(level * level * 4);
  cost = Math.max(20, cost);
  const maxAffordable = Math.floor(gold * 0.7);
  if (maxAffordable <= 0) return 0;
  if (cost > maxAffordable) cost = maxAffordable;
  return cost;
}

function handleDefeat(stage) {
  appendLog("……敗北してしまった。", "system");

  const cost = calcReviveCost(player.level, player.gold);

  if (cost <= 0) {
    appendLog(
      "ゴールドが足りないため、ダンジョンの入り口に戻るしかない。",
      "system"
    );
    currentFloor = 1;
    return;
  }

  const msg =
    `ダンジョンの入り口に戻るか、${cost}G支払って1つ前の階層からやり直すか選べる。

` +
    `[OK] ${cost}G支払って1つ前の階層から
` +
    `[キャンセル] 入口（1層）に戻る`;

  const useGold = window.confirm(msg);

  if (useGold) {
    if (player.gold >= cost) {
      player.gold -= cost;
      const prevFloor = Math.max(1, stage.floor - 1);
      currentFloor = prevFloor;
      appendLog(
        `${cost}G支払い、${prevFloor}層から仕切り直すことにした。`,
        "system"
      );
    } else {
      appendLog(
        "ゴールドが足りなかったため、入口に戻ることになった。",
        "system"
      );
      currentFloor = 1;
    }
  } else {
    appendLog("入口に戻ることにした。", "system");
    currentFloor = 1;
  }
}

// -------- セーブ／ロード --------
function saveGame() {
  const data = {
    player,
    currentFloor,
    maxFloorReached
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("セーブに失敗:", e);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      player = createNewPlayer();
      currentFloor = 1;
      maxFloorReached = 1;
      appendLog("新しく冒険が始まった。", "system");
      saveGame();
      return;
    }
    const data = JSON.parse(raw);
    player = data.player || createNewPlayer();
    currentFloor = data.currentFloor || 1;
    maxFloorReached = data.maxFloorReached || currentFloor;
    maxFloorReached = clamp(maxFloorReached, 1, TOTAL_FLOORS);
    currentFloor = clamp(currentFloor, 1, maxFloorReached);
    appendLog("前回の続きから再開した。", "system");
  } catch (e) {
    console.warn("ロードに失敗:", e);
    player = createNewPlayer();
    currentFloor = 1;
    maxFloorReached = 1;
  }
}

// -------- UI更新 --------
function updateUI() {
  const stage = stages.find(s => s.floor === currentFloor);

  document.getElementById("level").textContent = player.level;
  document.getElementById("exp").textContent = player.exp;
  document.getElementById("expToNext").textContent = player.expToNext;
  document.getElementById("hp").textContent = player.maxHP;
  document.getElementById("attack").textContent = player.attack;
  document.getElementById("defense").textContent = player.defense;
  document.getElementById("speed").textContent = player.speed;
  document.getElementById("gold").textContent = player.gold;

  document.getElementById("currentFloor").textContent = currentFloor;
  document.getElementById("totalFloors").textContent = TOTAL_FLOORS;
  document.getElementById("maxFloor").textContent = maxFloorReached;

  if (stage) {
    document.getElementById("recommendedLevel").textContent =
      stage.recommendedLevel;
  } else {
    document.getElementById("recommendedLevel").textContent = "-";
  }

  // 階層ナビゲーションボタン
  const prevBtn = document.getElementById("prevFloorBtn");
  const nextBtn = document.getElementById("nextFloorBtn");
  prevBtn.disabled = currentFloor <= 1;
  nextBtn.disabled = currentFloor >= maxFloorReached;
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

// -------- 初期化 --------
function setupEventListeners() {
  document
    .getElementById("exploreBtn")
    .addEventListener("click", () => {
      performBattle();
    });

  document
    .getElementById("resetBtn")
    .addEventListener("click", () => {
      const ok = window.confirm(
        "ゲームを最初からやり直しますか？\n（セーブデータは削除されます）"
      );
      if (!ok) return;
      localStorage.removeItem(SAVE_KEY);
      player = createNewPlayer();
      currentFloor = 1;
      maxFloorReached = 1;
      appendLog("新しく冒険を始めた。", "system");
      saveGame();
      updateUI();
    });

  document
    .getElementById("prevFloorBtn")
    .addEventListener("click", () => {
      if (currentFloor > 1) {
        currentFloor -= 1;
        appendLog(`第${currentFloor}層に戻った。`, "system");
        updateUI();
        saveGame();
      }
    });

  document
    .getElementById("nextFloorBtn")
    .addEventListener("click", () => {
      if (currentFloor < maxFloorReached) {
        currentFloor += 1;
        appendLog(`第${currentFloor}層に進んだ。`, "system");
        updateUI();
        saveGame();
      }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  stages = generateStages();
  loadGame();
  setupEventListeners();
  updateUI();
});
