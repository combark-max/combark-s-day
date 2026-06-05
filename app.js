const STORAGE_KEY = "haru-jogak.entries";
const PASSWORD_KEY = "haru-jogak.password";
const GOALS_KEY = "haru-jogak.goals";
const MAX_PHOTOS = 10;
const PHOTO_MAX_SIZE = 900;
const PHOTO_QUALITY = 0.72;

const moodLabels = {
  calm: "행복",
  happy: "감사",
  tired: "평온",
  sad: "우울",
  proud: "화남",
};

const els = {
  recordsView: document.querySelector("#recordsView"),
  dailyQuote: document.querySelector("#dailyQuote"),
  calendarView: document.querySelector("#calendarView"),
  statsView: document.querySelector("#statsView"),
  settingsView: document.querySelector("#settingsView"),
  detailView: document.querySelector("#detailView"),
  editorView: document.querySelector("#editorView"),
  navButtons: document.querySelectorAll(".nav-button"),
  back: document.querySelector("#backButton"),
  date: document.querySelector("#entryDate"),
  mood: document.querySelector("#entryMood"),
  title: document.querySelector("#entryTitle"),
  body: document.querySelector("#entryBody"),
  save: document.querySelector("#saveButton"),
  remove: document.querySelector("#deleteButton"),
  fresh: document.querySelector("#newEntryButton"),
  voice: document.querySelector("#voiceButton"),
  photoInput: document.querySelector("#photoInput"),
  photoGrid: document.querySelector("#photoGrid"),
  photoCount: document.querySelector("#photoCount"),
  status: document.querySelector("#saveStatus"),
  list: document.querySelector("#entryList"),
  count: document.querySelector("#entryCount"),
  calendarTitle: document.querySelector("#calendarTitle"),
  todayClock: document.querySelector("#todayClock"),
  calendarMonth: document.querySelector("#calendarMonth"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevMonth: document.querySelector("#prevMonthButton"),
  nextMonth: document.querySelector("#nextMonthButton"),
  statsGrid: document.querySelector("#statsGrid"),
  moodStats: document.querySelector("#moodStats"),
  statsSearchInput: document.querySelector("#statsSearchInput"),
  statsSearchResults: document.querySelector("#statsSearchResults"),
  goalTextInput: document.querySelector("#goalTextInput"),
  goalDateInput: document.querySelector("#goalDateInput"),
  goalDateButton: document.querySelector("#goalDateButton"),
  addGoal: document.querySelector("#addGoalButton"),
  goalList: document.querySelector("#goalList"),
  goalCount: document.querySelector("#goalCount"),
  detailDate: document.querySelector("#detailDate"),
  detailMood: document.querySelector("#detailMood"),
  detailTitle: document.querySelector("#detailTitle"),
  detailBody: document.querySelector("#detailBody"),
  detailPhotos: document.querySelector("#detailPhotos"),
  detailEdit: document.querySelector("#detailEditButton"),
  detailClose: document.querySelector("#detailCloseButton"),
  backup: document.querySelector("#backupButton"),
  restoreInput: document.querySelector("#restoreInput"),
  settingsStatus: document.querySelector("#settingsStatus"),
  passwordInput: document.querySelector("#passwordInput"),
  setPassword: document.querySelector("#setPasswordButton"),
  clearPassword: document.querySelector("#clearPasswordButton"),
  lockScreen: document.querySelector("#lockScreen"),
  unlockInput: document.querySelector("#unlockInput"),
  unlockButton: document.querySelector("#unlockButton"),
  lockKeypad: document.querySelector(".lock-keypad"),
  unlockStatus: document.querySelector("#unlockStatus"),
  photoViewer: document.querySelector("#photoViewer"),
  photoViewerImage: document.querySelector("#photoViewerImage"),
  photoViewerClose: document.querySelector("#photoViewerClose"),
};

let entries = loadEntries();
let goals = loadGoals();
let activeId = null;
let draftPhotos = [];
let saveTimer = null;
let recognition = null;
let isListening = false;
let voiceBaseText = "";
let voiceSessionText = "";
let currentView = "records";
let calendarDate = new Date();
let clockTimer = null;
let applyingHistory = false;

const dailyQuotes = [
  "오늘의 작은 기록이 내일의 길을 밝힙니다.",
  "너의 길을 여호와께 맡기라. 그를 의지하면 그가 이루시리라. - 시편 37:5",
  "하루를 천천히 바라보면 마음이 놓친 선물이 보입니다.",
  "항상 기뻐하라. 쉬지 말고 기도하라. 범사에 감사하라. - 데살로니가전서 5:16-18",
  "오늘의 나를 다정하게 적어두면, 내일의 내가 힘을 얻습니다.",
  "내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라. - 빌립보서 4:13",
  "작은 감사 하나가 하루 전체의 색을 바꿉니다.",
  "두려워하지 말라. 내가 너와 함께 함이라. - 이사야 41:10",
  "기록은 지나간 시간을 붙잡는 일이 아니라 나를 알아가는 일입니다.",
  "사랑은 오래 참고 사랑은 온유하며. - 고린도전서 13:4",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function setDailyQuote() {
  const dateKey = today().replaceAll("-", "");
  const index = Number(dateKey) % dailyQuotes.length;
  els.dailyQuote.textContent = dailyQuotes[index];
}

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return saved.map((entry) => ({ ...entry, photos: Array.isArray(entry.photos) ? entry.photos : [] }));
  } catch {
    return [];
  }
}

function loadGoals() {
  try {
    return JSON.parse(localStorage.getItem(GOALS_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistGoals() {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

function persist() {
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    els.status.textContent = "저장공간이 부족해요. 사진을 줄여주세요";
    return false;
  }
}

function showView(view, options = {}) {
  const { push = true } = options;
  currentView = view;
  [els.recordsView, els.calendarView, els.statsView, els.settingsView, els.detailView, els.editorView].forEach((item) => {
    item.classList.add("hidden");
  });
  els.back.classList.add("hidden");
  els.fresh.classList.toggle("hidden", view === "settings");
  els.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === view));

  if (view === "calendar") {
    els.calendarView.classList.remove("hidden");
    renderCalendar();
    renderGoals();
  } else if (view === "stats") {
    els.statsView.classList.remove("hidden");
    renderStats();
    renderSearchResults();
  } else if (view === "settings") {
    els.settingsView.classList.remove("hidden");
  } else {
    els.recordsView.classList.remove("hidden");
    renderList();
  }

  if (push) {
    pushAppState({ screen: view });
  }
}

function showEditor(options = {}) {
  const { push = true, mode = activeId ? "entry" : "new" } = options;
  [els.recordsView, els.calendarView, els.statsView, els.settingsView, els.detailView].forEach((item) => {
    item.classList.add("hidden");
  });
  els.editorView.classList.remove("hidden");
  els.back.classList.remove("hidden");
  els.fresh.classList.remove("hidden");
  if (push) {
    pushAppState({ screen: "editor", mode, id: activeId });
  }
}

function showEntryDetail(id, options = {}) {
  const { push = true } = options;
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  activeId = id;
  [els.recordsView, els.calendarView, els.statsView, els.settingsView, els.editorView].forEach((item) => {
    item.classList.add("hidden");
  });
  els.detailView.classList.remove("hidden");
  els.back.classList.remove("hidden");
  els.fresh.classList.remove("hidden");
  els.detailDate.textContent = formatDate(entry.date);
  els.detailMood.textContent = moodLabels[entry.mood] || "기록";
  els.detailTitle.textContent = entry.title || "제목 없는 하루";
  els.detailBody.textContent = entry.body || "내용 없음";
  renderDetailPhotos(entry.photos || []);
  if (push) pushAppState({ screen: "detail", id });
}

function renderDetailPhotos(photos) {
  els.detailPhotos.innerHTML = "";
  photos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<img src="${photo.dataUrl}" alt="${escapeHtml(photo.name || `첨부 사진 ${index + 1}`)}" />`;
    button.addEventListener("click", () => openPhotoViewer(photo));
    els.detailPhotos.append(button);
  });
}

function emptyDraft(options = {}) {
  const { push = true } = options;
  activeId = null;
  draftPhotos = [];
  els.date.value = today();
  els.mood.value = "calm";
  els.title.value = "";
  els.body.value = "";
  els.status.textContent = "새 일기 작성 중";
  renderPhotos();
  showEditor({ push, mode: "new" });
  els.title.focus();
}

function selectEntry(id, options = {}) {
  const { push = true } = options;
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  activeId = id;
  draftPhotos = [...(entry.photos || [])];
  els.date.value = entry.date;
  els.mood.value = entry.mood;
  els.title.value = entry.title;
  els.body.value = entry.body;
  els.status.textContent = "불러옴";
  renderPhotos();
  showEditor({ push, mode: "entry" });
}

function currentDraft() {
  return {
    date: els.date.value || today(),
    mood: els.mood.value,
    title: els.title.value.trim(),
    body: els.body.value.trim(),
    photos: draftPhotos,
  };
}

function saveEntry(options = {}) {
  const { download = false } = options;
  window.clearTimeout(saveTimer);
  const draft = currentDraft();
  if (!draft.title && !draft.body && !draft.photos.length) {
    els.status.textContent = "내용이나 사진을 넣으면 저장돼요";
    return;
  }

  const now = new Date().toISOString();
  if (activeId) {
    entries = entries.map((entry) =>
      entry.id === activeId ? { ...entry, ...draft, updatedAt: now } : entry,
    );
  } else {
    activeId = crypto.randomUUID();
    entries.push({ id: activeId, ...draft, createdAt: now, updatedAt: now });
  }

  if (!persist()) return;
  renderList();
  renderCalendar();
  renderStats();
  els.status.textContent = "저장됨";
  if (download) {
    downloadEntryFiles(entries.find((entry) => entry.id === activeId));
  }
}

function scheduleSave() {
  els.status.textContent = "작성 중...";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveEntry();
  }, 650);
}

function deleteEntry() {
  if (!activeId) {
    emptyDraft();
    return;
  }

  entries = entries.filter((entry) => entry.id !== activeId);
  persist();
  activeId = null;
  showView("records");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function getEntriesByDate() {
  return entries.reduce((map, entry) => {
    map[entry.date] = (map[entry.date] || 0) + 1;
    return map;
  }, {});
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const entryMap = getEntriesByDate();
  const todayValue = today();

  els.calendarMonth.textContent = `${year}년 ${month + 1}월`;
  els.calendarTitle.textContent = "실시간 달력";
  els.calendarGrid.innerHTML = "";

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-day muted";
    els.calendarGrid.append(spacer);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day${value === todayValue ? " today" : ""}${entryMap[value] ? " has-entry" : ""}`;
    button.innerHTML = `<strong>${day}</strong>${entryMap[value] ? `<span>${entryMap[value]}</span>` : ""}`;
    button.addEventListener("click", () => {
      const entry = entries.find((item) => item.date === value);
      if (entry) {
        showEntryDetail(entry.id);
      } else {
        emptyDraft();
        els.date.value = value;
      }
    });
    els.calendarGrid.append(button);
  }
}

function updateClock() {
  const now = new Date();
  els.todayClock.textContent = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

function renderStats() {
  const total = entries.length;
  const photoCount = entries.reduce((sum, entry) => sum + (entry.photos?.length || 0), 0);
  const bodyChars = entries.reduce((sum, entry) => sum + (entry.body?.length || 0), 0);
  const uniqueDays = new Set(entries.map((entry) => entry.date)).size;
  const latest = entries[0]?.date ? formatDate(entries[0].date) : "없음";
  const longest = entries.reduce((max, entry) => Math.max(max, entry.body?.length || 0), 0);

  const cards = [
    ["총 일기", `${total}개`],
    ["기록한 날", `${uniqueDays}일`],
    ["첨부 사진", `${photoCount}장`],
    ["쓴 글자", `${bodyChars}자`],
    ["가장 긴 일기", `${longest}자`],
    ["최근 기록", latest],
  ];

  els.statsGrid.innerHTML = cards
    .map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");

  const moodCounts = Object.keys(moodLabels).reduce((map, mood) => ({ ...map, [mood]: 0 }), {});
  entries.forEach((entry) => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });
  const maxMood = Math.max(...Object.values(moodCounts), 1);

  els.moodStats.innerHTML = Object.entries(moodLabels)
    .map(([mood, label]) => {
      const count = moodCounts[mood] || 0;
      const width = Math.max((count / maxMood) * 100, count ? 10 : 0);
      return `
        <div class="mood-row">
          <span>${label}</span>
          <div><i style="width: ${width}%"></i></div>
          <strong>${count}</strong>
        </div>
      `;
    })
    .join("");
}

function renderSearchResults() {
  const query = els.statsSearchInput.value.trim().toLowerCase();
  els.statsSearchResults.innerHTML = "";
  if (!query) return;

  const words = query.split(/\s+/).filter(Boolean);
  const matches = entries.filter((entry) => {
    const text = `${entry.title} ${entry.body} ${moodLabels[entry.mood] || ""} ${entry.date}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });

  if (!matches.length) {
    els.statsSearchResults.innerHTML = '<p class="search-empty">찾은 일기가 없어요.</p>';
    return;
  }

  matches.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerHTML = `
      <span>${formatDate(entry.date)} · ${moodLabels[entry.mood] || "기록"}</span>
      <strong>${escapeHtml(entry.title || "제목 없는 하루")}</strong>
      <small>${escapeHtml(entry.body || "내용 없음")}</small>
    `;
    button.addEventListener("click", () => showEntryDetail(entry.id));
    els.statsSearchResults.append(button);
  });
}

function addGoal() {
  const text = els.goalTextInput.value.trim();
  const date = els.goalDateInput.value;
  if (!text || !date) return;
  goals.push({ id: crypto.randomUUID(), text, date, done: false });
  goals.sort((a, b) => a.date.localeCompare(b.date));
  persistGoals();
  els.goalTextInput.value = "";
  els.goalDateInput.value = today();
  renderGoals();
}

function renderGoals() {
  els.goalCount.textContent = `${goals.length}개`;
  els.goalList.innerHTML = "";
  if (!goals.length) {
    els.goalList.innerHTML = '<p class="goal-empty">날짜를 정해 첫 목표를 추가해보세요.</p>';
    return;
  }

  goals.forEach((goal) => {
    const item = document.createElement("div");
    item.className = `goal-item${goal.done ? " done" : ""}`;
    item.innerHTML = `
      <button class="goal-check" type="button" aria-label="목표 완료">${goal.done ? "✓" : ""}</button>
      <div><strong>${escapeHtml(goal.text)}</strong><span>${goal.date}</span></div>
      <button class="goal-delete" type="button" aria-label="목표 삭제">×</button>
    `;
    item.querySelector(".goal-check").addEventListener("click", () => {
      goal.done = !goal.done;
      persistGoals();
      renderGoals();
    });
    item.querySelector(".goal-delete").addEventListener("click", () => {
      goals = goals.filter((itemGoal) => itemGoal.id !== goal.id);
      persistGoals();
      renderGoals();
    });
    els.goalList.append(item);
  });
}

function renderList() {
  els.count.textContent = `${entries.length}개`;
  els.list.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = "<strong>아직 기록이 없어요.</strong><span>오른쪽 위 + 버튼으로 첫 일기를 시작해보세요.</span>";
    els.list.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "entry-card";

    const photoBadge = entry.photos?.length ? `<span>사진 ${entry.photos.length}</span>` : "";
    card.innerHTML = `
      <button class="entry-open-button" type="button">
        <span class="card-meta">
          <span>${formatDate(entry.date)}</span>
          <span>${moodLabels[entry.mood] || "기록"}</span>
        </span>
        <span class="card-title">${escapeHtml(entry.title || "제목 없는 하루")}</span>
        <span class="card-preview">${escapeHtml(entry.body || "내용 없음")}</span>
        ${photoBadge ? `<span class="photo-badge">${photoBadge}</span>` : ""}
      </button>
      <button class="entry-delete-button" type="button" aria-label="일기 삭제" title="일기 삭제">×</button>
    `;
    card.querySelector(".entry-open-button").addEventListener("click", () => showEntryDetail(entry.id));
    card.querySelector(".entry-delete-button").addEventListener("click", () => deleteEntryFromList(entry.id));
    els.list.append(card);
  });
}

function deleteEntryFromList(id) {
  entries = entries.filter((entry) => entry.id !== id);
  if (activeId === id) activeId = null;
  persist();
  renderList();
  renderCalendar();
  renderStats();
}

function openPhotoViewer(photo) {
  els.photoViewerImage.src = photo.dataUrl;
  els.photoViewer.classList.remove("hidden");
  pushAppState({ screen: "photo" });
}

function closePhotoViewer(options = {}) {
  const { push = false } = options;
  els.photoViewer.classList.add("hidden");
  els.photoViewerImage.removeAttribute("src");
  if (push) pushAppState({ screen: "editor", mode: activeId ? "entry" : "new", id: activeId });
}

function renderPhotos() {
  els.photoGrid.innerHTML = "";
  els.photoCount.textContent = `${draftPhotos.length} / ${MAX_PHOTOS}`;

  if (!draftPhotos.length) {
    const empty = document.createElement("p");
    empty.className = "photo-empty";
    empty.textContent = "사진을 최대 10개까지 첨부할 수 있어요.";
    els.photoGrid.append(empty);
    return;
  }

  draftPhotos.forEach((photo, index) => {
    const item = document.createElement("div");
    item.className = "photo-item";
    item.innerHTML = `
      <button class="photo-open-button" type="button" aria-label="사진 크게 보기">
        <img src="${photo.dataUrl}" alt="${escapeHtml(photo.name || `첨부 사진 ${index + 1}`)}" />
      </button>
      <button type="button" aria-label="사진 삭제" title="사진 삭제">×</button>
    `;
    item.querySelector(".photo-open-button").addEventListener("click", () => openPhotoViewer(photo));
    item.querySelector('button[title="사진 삭제"]').addEventListener("click", () => {
      draftPhotos.splice(index, 1);
      renderPhotos();
      scheduleSave();
    });
    els.photoGrid.append(item);
  });
}

function pushAppState(state) {
  if (applyingHistory || !history.pushState) return;
  history.pushState(state, "", location.href);
}

function initAppHistory() {
  if (!history.replaceState || !history.pushState) return;
  history.replaceState({ screen: "records" }, "", location.href);
  history.pushState({ screen: "records" }, "", location.href);
  window.addEventListener("popstate", (event) => {
    applyingHistory = true;
    const state = event.state || { screen: "records" };

    if (state.screen !== "photo") {
      closePhotoViewer();
    }

    if (state.screen === "editor") {
      if (state.mode === "entry" && state.id) {
        selectEntry(state.id, { push: false });
      } else {
        emptyDraft({ push: false });
      }
    } else if (state.screen === "detail" && state.id) {
      showEntryDetail(state.id, { push: false });
    } else if (state.screen === "photo") {
      els.photoViewer.classList.remove("hidden");
    } else {
      showView(state.screen || "records", { push: false });
    }

    applyingHistory = false;
    if (state.screen === "records") {
      history.pushState({ screen: "records" }, "", location.href);
    }
  });
}

function addPhotos(files) {
  const slots = MAX_PHOTOS - draftPhotos.length;
  const selected = Array.from(files).slice(0, slots);
  if (!selected.length) {
    els.status.textContent = "사진은 최대 10개까지 가능해요";
    return;
  }

  Promise.all(selected.map(readPhoto)).then((photos) => {
    draftPhotos = [...draftPhotos, ...photos].slice(0, MAX_PHOTOS);
    renderPhotos();
    scheduleSave();
  });
}

function exportBackup() {
  const backup = {
    app: "明‘s life",
    version: 2,
    exportedAt: new Date().toISOString(),
    entries,
    goals,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `haru-jogak-backup-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  els.settingsStatus.textContent = "백업 파일 생성됨";
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const restored = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(restored)) throw new Error("invalid backup");
      entries = restored.map((entry) => ({
        ...entry,
        photos: Array.isArray(entry.photos) ? entry.photos : [],
        updatedAt: entry.updatedAt || new Date().toISOString(),
      }));
      if (Array.isArray(data.goals)) {
        goals = data.goals;
        persistGoals();
      }
      persist();
      renderList();
      renderCalendar();
      renderStats();
      renderGoals();
      els.settingsStatus.textContent = "백업 불러옴";
      showView("records");
    } catch {
      els.settingsStatus.textContent = "백업 파일을 확인해주세요";
    }
  };
  reader.readAsText(file);
}

async function digestPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function setPassword() {
  const value = els.passwordInput.value.trim();
  if (value.length < 4) {
    els.settingsStatus.textContent = "비밀번호는 4자 이상";
    return;
  }
  localStorage.setItem(PASSWORD_KEY, await digestPassword(value));
  els.passwordInput.value = "";
  els.settingsStatus.textContent = "비밀번호 설정됨";
}

function clearPassword() {
  localStorage.removeItem(PASSWORD_KEY);
  els.passwordInput.value = "";
  els.settingsStatus.textContent = "비밀번호 해제됨";
}

function checkLock() {
  if (!localStorage.getItem(PASSWORD_KEY)) return;
  els.lockScreen.classList.remove("hidden");
  els.unlockInput.value = "";
  els.unlockStatus.textContent = "";
}

async function unlockApp() {
  const saved = localStorage.getItem(PASSWORD_KEY);
  const typed = await digestPassword(els.unlockInput.value);
  if (typed === saved) {
    els.lockScreen.classList.add("hidden");
    els.unlockInput.value = "";
    els.unlockStatus.textContent = "";
  } else {
    els.unlockStatus.textContent = "비밀번호가 맞지 않아요";
    els.unlockInput.value = "";
  }
}

function pressUnlockKey(key) {
  if (els.unlockInput.value.length >= 20) return;
  els.unlockInput.value += key;
  els.unlockStatus.textContent = "";
}

function clearUnlockInput() {
  els.unlockInput.value = els.unlockInput.value.slice(0, -1);
  els.unlockStatus.textContent = "";
}

function downloadEntryFiles(entry) {
  if (!entry) return;
  const baseName = safeFileName(`${entry.date}-${entry.title || "일기"}`);
  const mood = moodLabels[entry.mood] || "기록";
  const text = [
    `날짜: ${entry.date}`,
    `기분: ${mood}`,
    `제목: ${entry.title || "제목 없음"}`,
    "",
    entry.body || "내용 없음",
  ].join("\n");

  downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName}.txt`);
  (entry.photos || []).forEach((photo, index) => {
    window.setTimeout(() => {
      downloadBlob(dataUrlToBlob(photo.dataUrl), `${baseName}-사진-${index + 1}.jpg`);
    }, 250 * (index + 1));
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("canvas unavailable"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          name: file.name.replace(/\.[^.]+$/, ".jpg"),
          dataUrl: canvas.toDataURL("image/jpeg", PHOTO_QUALITY),
        });
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.voice.disabled = true;
    els.voice.title = "이 브라우저는 음성 입력을 지원하지 않아요";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.addEventListener("result", (event) => {
    const finalParts = [];
    for (let index = 0; index < event.results.length; index += 1) {
      if (event.results[index].isFinal) {
        finalParts.push(event.results[index][0].transcript.trim());
      }
    }
    const finalText = cleanVoiceText(finalParts.join(" ").trim());
    if (!finalText) return;
    voiceSessionText = finalText;
    const spacer = voiceBaseText && !voiceBaseText.endsWith("\n") ? " " : "";
    els.body.value = `${voiceBaseText}${spacer}${voiceSessionText}`;
    scheduleSave();
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    els.voice.classList.remove("listening");
    els.voice.setAttribute("aria-label", "음성 입력");
    if (els.status.textContent === "음성 입력 중...") {
      els.status.textContent = "음성 입력 종료";
    }
  });
}

function toggleVoiceInput() {
  if (!recognition) {
    els.status.textContent = "이 브라우저는 음성 입력을 지원하지 않아요";
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  try {
    voiceBaseText = els.body.value;
    voiceSessionText = "";
    recognition.start();
    isListening = true;
    els.voice.classList.add("listening");
    els.voice.setAttribute("aria-label", "음성 입력 중지");
    els.status.textContent = "음성 입력 중...";
  } catch {
    els.status.textContent = "음성 입력을 다시 눌러주세요";
  }
}

function cleanVoiceText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const cleaned = [];
  words.forEach((word) => {
    if (cleaned[cleaned.length - 1] !== word) cleaned.push(word);
  });
  return collapseRepeatedPhrase(cleaned).join(" ");
}

function collapseRepeatedPhrase(words) {
  for (let size = Math.floor(words.length / 2); size >= 1; size -= 1) {
    const first = words.slice(0, size).join(" ");
    const second = words.slice(size, size * 2).join(" ");
    if (first && first === second) {
      return collapseRepeatedPhrase([...words.slice(0, size), ...words.slice(size * 2)]);
    }
  }
  return words;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

[els.date, els.mood, els.title, els.body].forEach((el) => {
  el.addEventListener("input", scheduleSave);
});

els.save.addEventListener("click", () => saveEntry({ download: true }));
els.remove.addEventListener("click", deleteEntry);
els.fresh.addEventListener("click", emptyDraft);
els.back.addEventListener("click", () => history.back());
els.voice.addEventListener("click", toggleVoiceInput);
els.photoViewerClose.addEventListener("click", () => history.back());
els.photoViewer.addEventListener("click", (event) => {
  if (event.target === els.photoViewer) history.back();
});
els.photoInput.addEventListener("change", (event) => {
  addPhotos(event.target.files);
  event.target.value = "";
});
els.detailEdit.addEventListener("click", () => selectEntry(activeId));
els.detailClose.addEventListener("click", () => history.back());
els.statsSearchInput.addEventListener("input", renderSearchResults);
els.addGoal.addEventListener("click", addGoal);
els.goalDateButton.addEventListener("click", () => {
  if (typeof els.goalDateInput.showPicker === "function") {
    els.goalDateInput.showPicker();
  } else {
    els.goalDateInput.focus();
    els.goalDateInput.click();
  }
});
els.goalTextInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addGoal();
});
els.navButtons.forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
els.prevMonth.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});
els.nextMonth.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});
els.backup.addEventListener("click", exportBackup);
els.restoreInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importBackup(file);
  event.target.value = "";
});
els.setPassword.addEventListener("click", setPassword);
els.clearPassword.addEventListener("click", clearPassword);
els.unlockButton.addEventListener("click", unlockApp);
els.lockKeypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.key) {
    pressUnlockKey(button.dataset.key);
  } else if (button.dataset.action === "clear") {
    clearUnlockInput();
  } else if (button.dataset.action === "unlock") {
    unlockApp();
  }
});

setupVoiceInput();
setDailyQuote();
renderList();
renderStats();
els.goalDateInput.value = today();
renderGoals();
updateClock();
clockTimer = window.setInterval(updateClock, 1000);
initAppHistory();
showView("records", { push: false });
checkLock();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {
    els.status.textContent = "오프라인 준비를 건너뜀";
  });
}
