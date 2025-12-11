// スパーク系ミニRPG（仮）
// 1体の雷系モンスターで塔を登るターン制RPG

const TOTAL_FLOORS = 30;
const MAX_LEVEL = 40;
const SAVE_KEY = "spark_quest_v2";

let stages = [];
let player = null;
let currentFloor = 1;
let maxFloorReached = 1;

let battle = null; // { floor, stage, playerHP, enemyHP, turn }

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
  player.expToNext = Math.round(12 + player.level * 4.5);

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
function calcDamage(attackerAtk, defenderDef, power, varianceRange = 2) {
  const base = attackerAtk * power - defenderDef * 0.4;
  const variance = randInt(-varianceRange, varianceRange);
  const raw = Math.round(base + variance);
  return Math.max(1, raw);
}

function startBattle() {
  if (battle) {
    appendLog("すでに戦闘中です。", "system");
    return;
  }
  const stage = stages.find(s => s.floor === currentFloor);
  if (!stage) return;

  battle = {
    floor: currentFloor,
    stage,
    playerHP: player.maxHP,
    enemyHP: stage.enemyHP,
    turn: 1,
    guardThisTurn: false
  };

  appendLog(`=== ${stage.name} に挑戦した！ ===`, "system");
  if (player.level < stage.recommendedLevel) {
    appendLog(
      `※ 推奨レベル(${stage.recommendedLevel})より低い状態で挑んでいるようだ…`,
      "system"
    );
  }

  updateBattleUI();
  updateCommandState();
}

function endBattle() {
  battle = null;
  updateBattleUI();
  updateCommandState();
}

function playerUseMove(moveId) {
  if (!battle) {
    appendLog("まずは「この階層に挑戦する」を押してください。", "system");
    return;
  }

  const stage = battle.stage;
  const enemySpeed = Math.round(stage.enemyAtk * 0.15);
  const playerFirst =
    player.speed > enemySpeed ||
    (player.speed === enemySpeed && Math.random() < 0.5);

  let logPrefix = `-- ターン${battle.turn} --`;
  appendLog(logPrefix, "system");

  let moveName = "";
  let power = 1.0;
  let varianceRange = 2;
  battle.guardThisTurn = false;

  if (moveId === "tackle") {
    moveName = "たいあたり";
    power = 1.0;
    varianceRange = 1;
  } else if (moveId === "spark") {
    moveName = "スパーク";
    power = 1.2;
    varianceRange = 3;
  } else if (moveId === "guard") {
    moveName = "ガード";
    power = 0;
    varianceRange = 0;
    battle.guardThisTurn = true;
  }

  const doPlayerAttack = () => {
    if (moveId === "guard") {
      appendLog("主人公は身をかためて様子をうかがっている…", "player");
      return;
    }
    const dmg = calcDamage(player.attack, stage.enemyDef, power, varianceRange);
    battle.enemyHP = Math.max(0, battle.enemyHP - dmg);
    appendLog(`主人公の${moveName}！ 敵に${dmg}ダメージ。`, "player");
  };

  const doEnemyAttack = () => {
    const baseDamage = calcDamage(
      stage.enemyAtk,
      player.defense,
      1.0,
      2
    );
    const dmg = battle.guardThisTurn
      ? Math.max(1, Math.round(baseDamage * 0.5))
      : baseDamage;
    battle.playerHP = Math.max(0, battle.playerHP - dmg);
    if (battle.guardThisTurn) {
      appendLog(`敵の攻撃！ ガードして${dmg}ダメージにおさえた。`, "enemy");
    } else {
      appendLog(`敵の攻撃！ ${dmg}のダメージを受けた。`, "enemy");
    }
  };

  if (playerFirst) {
    doPlayerAttack();
    if (battle.enemyHP <= 0) {
      appendLog("敵を倒した！", "player");
      finishVictory(stage);
      return;
    }
    doEnemyAttack();
    if (battle.playerHP <= 0) {
      appendLog("力尽きてしまった…", "enemy");
      finishDefeat(stage);
      return;
    }
  } else {
    doEnemyAttack();
    if (battle.playerHP <= 0) {
      appendLog("力尽きてしまった…", "enemy");
      finishDefeat(stage);
      return;
    }
    doPlayerAttack();
    if (battle.enemyHP <= 0) {
      appendLog("敵を倒した！", "player");
      finishVictory(stage);
      return;
    }
  }

  battle.turn += 1;
  updateBattleUI();
  saveGame();
}

function finishVictory(stage) {
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

  endBattle();
  saveGame();
  updateUI();
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

function finishDefeat(stage) {
  appendLog("……敗北してしまった。", "system");

  const cost = calcReviveCost(player.level, player.gold);

  if (cost <= 0) {
    appendLog(
      "ゴールドが足りないため、ダンジョンの入り口に戻るしかない。",
      "system"
    );
    currentFloor = 1;
    endBattle();
    saveGame();
    updateUI();
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

  endBattle();
  saveGame();
  updateUI();
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
function setHpBar(barEl, textEl, current, max) {
  if (!barEl || !textEl) return;
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
  barEl.style.width = pct + "%";
  textEl.textContent = `${current} / ${max}`;
}

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
    document.getElementById("enemyName").textContent = stage.name + "の敵";
    document.getElementById("enemyLv").textContent = stage.recommendedLevel;
  } else {
    document.getElementById("recommendedLevel").textContent = "-";
    document.getElementById("enemyName").textContent = "敵なし";
    document.getElementById("enemyLv").textContent = "-";
  }

  // 階層ナビゲーションボタン
  const prevBtn = document.getElementById("prevFloorBtn");
  const nextBtn = document.getElementById("nextFloorBtn");
  prevBtn.disabled = currentFloor <= 1 || battle !== null;
  nextBtn.disabled = currentFloor >= maxFloorReached || battle !== null;

  // プレイヤー側バトル表示
  document.getElementById("playerLvBattle").textContent = player.level;

  if (!battle) {
    setHpBar(
      document.getElementById("playerHpBar"),
      document.getElementById("playerHpText"),
      player.maxHP,
      player.maxHP
    );
    if (stage) {
      setHpBar(
        document.getElementById("enemyHpBar"),
        document.getElementById("enemyHpText"),
        stage.enemyHP,
        stage.enemyHP
      );
    } else {
      setHpBar(
        document.getElementById("enemyHpBar"),
        document.getElementById("enemyHpText"),
        0,
        1
      );
    }
  } else {
    setHpBar(
      document.getElementById("playerHpBar"),
      document.getElementById("playerHpText"),
      battle.playerHP,
      player.maxHP
    );
    setHpBar(
      document.getElementById("enemyHpBar"),
      document.getElementById("enemyHpText"),
      battle.enemyHP,
      battle.stage.enemyHP
    );
  }
}

function updateBattleUI() {
  updateUI();
  const commandInfo = document.getElementById("commandInfo");
  if (!battle) {
    commandInfo.textContent = "戦闘中ではありません。「この階層に挑戦する」からバトルを開始できます。";
  } else {
    commandInfo.textContent = `第${battle.floor}層で戦闘中（ターン${battle.turn}）`;
  }
}

function updateCommandState() {
  const inBattle = battle !== null;
  document.getElementById("moveTackle").disabled = !inBattle;
  document.getElementById("moveSpark").disabled = !inBattle;
  document.getElementById("moveGuard").disabled = !inBattle;
  document.getElementById("startBattleBtn").disabled = inBattle;
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
    .getElementById("startBattleBtn")
    .addEventListener("click", () => {
      startBattle();
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
      battle = null;
      appendLog("新しく冒険を始めた。", "system");
      saveGame();
      updateBattleUI();
      updateCommandState();
    });

  document
    .getElementById("prevFloorBtn")
    .addEventListener("click", () => {
      if (battle) return;
      if (currentFloor > 1) {
        currentFloor -= 1;
        appendLog(`第${currentFloor}層に戻った。`, "system");
        updateBattleUI();
        saveGame();
      }
    });

  document
    .getElementById("nextFloorBtn")
    .addEventListener("click", () => {
      if (battle) return;
      if (currentFloor < maxFloorReached) {
        currentFloor += 1;
        appendLog(`第${currentFloor}層に進んだ。`, "system");
        updateBattleUI();
        saveGame();
      }
    });

  document
    .getElementById("moveTackle")
    .addEventListener("click", () => {
      playerUseMove("tackle");
    });

  document
    .getElementById("moveSpark")
    .addEventListener("click", () => {
      playerUseMove("spark");
    });

  document
    .getElementById("moveGuard")
    .addEventListener("click", () => {
      playerUseMove("guard");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  stages = generateStages();
  loadGame();
  setupEventListeners();
  updateBattleUI();
  updateCommandState();
});
