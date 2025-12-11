// タスクメモパッド（自分用）
// 電車などでサッと書いてあとでスプレッドシートに貼る用

const STORAGE_KEY = "task_pad_v1";

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
    empty.textContent = "まだメモがありません。上のフォームから追加してください。";
    listEl.appendChild(empty);
    return;
  }

  filtered.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";
    if (task.done) item.classList.add("done");

    const header = document.createElement("div");
    header.className = "task-header";

    const dateSpan = document.createElement("div");
    dateSpan.className = "task-date";
    dateSpan.textContent = task.date || "(日付なし)";

    const categorySpan = document.createElement("div");
    categorySpan.className = "task-category";
    categorySpan.textContent = task.category || "その他";

    header.appendChild(dateSpan);
    header.appendChild(categorySpan);
    item.appendChild(header);

    const titleDiv = document.createElement("div");
    titleDiv.className = "task-title";
    titleDiv.textContent = task.title || "(無題)";
    item.appendChild(titleDiv);

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
      const ok = window.confirm("このメモを削除しますか？");
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
  const date = document.getElementById("date").value || todayIso();
  const category = document.getElementById("category").value || "その他";
  const title = document.getElementById("title").value.trim();
  const memo = document.getElementById("memo").value.trim();

  if (!title && !memo) {
    window.alert("タイトルかメモのどちらかは入力してください。");
    return;
  }

  const now = Date.now();

  const task = {
    id: now.toString() + "_" + Math.floor(Math.random() * 1000),
    date,
    category,
    title,
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

function buildExportText(onlyUndone = false) {
  const header = "日付\t種別\tタイトル\tメモ\t転記済";
  const lines = [header];

  const sorted = [...tasks].sort((a, b) => {
    if (a.date === b.date) {
      return (a.createdAt || 0) - (b.createdAt || 0);
    }
    return (a.date || "").localeCompare(b.date || "");
  });

  sorted.forEach((t) => {
    if (onlyUndone && t.done) return;
    const date = t.date || "";
    const cat = t.category || "";
    const title = (t.title || "").replace(/\n/g, " ");
    const memo = (t.memo || "").replace(/\n/g, " ");
    const done = t.done ? "済" : "";
    lines.push([date, cat, title, memo, done].join("\t"));
  });

  const text = lines.join("\n");
  const textArea = document.getElementById("exportText");
  textArea.value = text;
  textArea.focus();
  textArea.select();

  // クリップボード対応ブラウザならそのままコピーも試みる
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

function handleDeleteAll() {
  const ok = window.confirm("すべてのメモを削除しますか？\nこの端末のデータが消えます。");
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
