// タスクメモパッド（自分用）
// 「タスク管理 - Tasks」の列構成に合わせてエクスポートする

const STORAGE_KEY = "task_pad_v2";

let tasks = [];

// ---- ユーティリティ ----
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${y}-${m}-${day}`;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      tasks = [];
      return;
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      tasks = data;
    } else {
      tasks = [];
    }
  } catch (e) {
    console.warn("ロードに失敗:", e);
    tasks = [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn("セーブに失敗:", e);
  }
}

// ---- 描画 ----
function renderTasks() {
  const listEl = document.getElementById("taskList");
  listEl.innerHTML = "";

  const filterVal = document.getElementById("filterCategory").value;

  const sorted = [...tasks].sort((a, b) => {
    if (a.date === b.date) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    return (a.date || "").localeCompare(b.date || "");
  });

  const filtered = sorted.filter((t) => {
    if (filterVal === "未転記") return !t.done;
    if (filterVal === "転記済") return !!t.done;
    return true;
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "まだタスクがありません。上のフォームから追加してください。";
    listEl.appendChild(empty);
    return;
  }

  filtered.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";
    if (task.done) item.classList.add("done");

    const header = document.createElement("div");
    header.className = "task-header";

    const titleDiv = document.createElement("div");
    titleDiv.className = "task-title-main";
    titleDiv.textContent = task.title || "(無題)";

    const badges = document.createElement("div");
    badges.className = "task-badges";

    const catSpan = document.createElement("div");
    catSpan.className = "task-category";
    catSpan.textContent = task.category || "その他";
    badges.appendChild(catSpan);

    if (task.date) {
      const dateSpan = document.createElement("div");
      dateSpan.className = "task-date";
      dateSpan.textContent = task.date;
      badges.appendChild(dateSpan);
    }

    if (task.priority) {
      const pSpan = document.createElement("div");
      pSpan.className = "task-priority";
      pSpan.textContent = `優先度 ${task.priority}`;
      badges.appendChild(pSpan);
    }

    if (task.status) {
      const sSpan = document.createElement("div");
      sSpan.className = "task-status";
      sSpan.textContent = task.status;
      badges.appendChild(sSpan);
    }

    header.appendChild(titleDiv);
    header.appendChild(badges);
    item.appendChild(header);

    if (task.memo && task.memo.trim() !== "") {
      const memoDiv = document.createElement("div");
      memoDiv.className = "task-memo";
      memoDiv.textContent = task.memo;
      item.appendChild(memoDiv);
    }

    const footer = document.createElement("div");
    footer.className = "task-footer";

    const doneLabel = document.createElement("label");
    const doneCheckbox = document.createElement("input");
    doneCheckbox.type = "checkbox";
    doneCheckbox.checked = !!task.done;
    doneCheckbox.addEventListener("change", () => {
      task.done = doneCheckbox.checked;
      saveTasks();
      renderTasks();
    });
    const doneText = document.createElement("span");
    doneText.textContent = "転記済";

    doneLabel.appendChild(doneCheckbox);
    doneLabel.appendChild(doneText);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      const ok = window.confirm("このタスクを削除しますか？");
      if (!ok) return;
      tasks = tasks.filter((t) => t.id !== task.id);
      saveTasks();
      renderTasks();
    });

    footer.appendChild(doneLabel);
    footer.appendChild(delBtn);

    item.appendChild(footer);

    listEl.appendChild(item);
  });
}

// ---- イベント処理 ----
function handleFormSubmit(ev) {
  ev.preventDefault();
  const title = document.getElementById("title").value.trim();
  const category = document.getElementById("category").value || "その他";
  const date = document.getElementById("date").value || "";
  const priority = document.getElementById("priority").value || "";
  const status = document.getElementById("status").value || "未着手";
  const memo = document.getElementById("memo").value.trim();

  if (!title && !memo) {
    window.alert("タスク名かメモのどちらかは入力してください。");
    return;
  }

  const now = Date.now();

  const task = {
    id: now.toString() + "_" + Math.floor(Math.random() * 1000),
    title,
    category,
    date,
    priority,
    status,
    memo,
    done: false,
    createdAt: now
  };

  tasks.push(task);
  saveTasks();

  document.getElementById("title").value = "";
  document.getElementById("memo").value = "";

  renderTasks();
}

function handleClearForm() {
  document.getElementById("title").value = "";
  document.getElementById("memo").value = "";
}

// 「タスク管理 - Tasks」に合わせたエクスポート
// 列順：タスク名, カテゴリ, 予定日, 優先度, 状態, メモ
function buildExportText(onlyUndone = false) {
  const header = "タスク名\tカテゴリ\t予定日\t優先度\t状態\tメモ";
  const lines = [header];

  const sorted = [...tasks].sort((a, b) => {
    if (a.date === b.date) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    return (a.date || "").localeCompare(b.date || "");
  });

  sorted.forEach((t) => {
    if (onlyUndone && t.done) return;
    const title = (t.title || "").replace(/\n/g, " ");
    const cat = t.category || "";
    const date = t.date || "";
    const priority = t.priority || "";
    const status = t.status || "";
    const memo = (t.memo || "").replace(/\n/g, " ");
    lines.push([title, cat, date, priority, status, memo].join("\t"));
  });

  const text = lines.join("\n");
  const textArea = document.getElementById("exportText");
  textArea.value = text;
  textArea.focus();
  textArea.select();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function handleDeleteAll() {
  const ok = window.confirm("すべてのタスクを削除しますか？\nこの端末のデータが消えます。");
  if (!ok) return;
  tasks = [];
  saveTasks();
  renderTasks();
}

// ---- 初期化 ----
document.addEventListener("DOMContentLoaded", () => {
  // 日付初期値
  const dateInput = document.getElementById("date");
  dateInput.value = todayIso();

  loadTasks();
  renderTasks();

  document.getElementById("taskForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("clearFormBtn").addEventListener("click", handleClearForm);
  document.getElementById("filterCategory").addEventListener("change", renderTasks);
  document.getElementById("copyAllBtn").addEventListener("click", () => buildExportText(false));
  document.getElementById("copyUndoneBtn").addEventListener("click", () => buildExportText(true));
  document.getElementById("deleteAllBtn").addEventListener("click", handleDeleteAll);
});
