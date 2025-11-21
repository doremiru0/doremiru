// ================= Retina対応キャンバス =================
function setupHiDPICanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  const cssW = 3000;
  const cssH = 1500;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// ================= 五線描画 =================
function drawStaffs(ctx, staffs = {}, activeStaffId = null) {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  for (const id in staffs) {
    const staff = staffs[id];

    if (!staff.isVisible) continue;

    const { y0, x0, spacing, lines, clef } = staff;
    const isActive = (staff.id === activeStaffId);

    ctx.save();
    ctx.translate(x0, y0);

    ctx.strokeStyle = isActive ? "#3b82f6" : "#e6e8eb"; // (Blue-500, White)
    ctx.globalAlpha = isActive ? 1.0 : 0.7; // 非アクティブは少し透明に

    ctx.font = "16px system-ui, -apple-system, Arial";
    ctx.fillStyle = isActive ? "#3b82f6" : "#e6e8eb"; // (Blue-500, White)

    const clefSymbol = (clef === 'G') ? '𝄞' : '𝄢';
    const labelText = `ID:${id} (${clefSymbol})`;

    ctx.fillText(labelText, 0, -18);

    ctx.lineWidth = 1;
    for (let i = 0; i < lines; i++) {
      const y = i * spacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      const lineEndX = width + 20000;
      ctx.lineTo(lineEndX, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

// ================= 音名ユーティリティ =================
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const SOLFEGE = { C: "ド", D: "レ", E: "ミ", F: "ファ", G: "ソ", A: "ラ", B: "シ" };

function stepToLetterOct(n, clef = 'G') {
  const baseLetterIndex = (clef === 'G') ? 4 : 3;
  const baseOct = (clef === 'G') ? 4 : 3;

  const idxFromC = (baseLetterIndex + n) % 7;
  const wrapped = (baseLetterIndex + n) - idxFromC;
  const letter = LETTERS[(idxFromC + 7) % 7];
  return { letter, octave: baseOct + octaveBoundaryAdjust(baseLetterIndex, baseOct, n) };
}
function octaveBoundaryAdjust(baseIndex, baseOct, n) {
  if (n === 0) return 0;
  let count = 0, idx = baseIndex;
  const dir = Math.sign(n), steps = Math.abs(n);
  for (let i = 0; i < steps; i++) {
    const next = (idx + dir + 7) % 7;
    if (dir > 0 && idx === 6 && next === 0) count += 1;
    if (dir < 0 && idx === 0 && next === 6) count -= 1;
    idx = next;
  }
  return count;
}

function yToStep(y, y0, spacing, clef = 'G') {
  let baseLineY;
  if (clef === 'G') {
    baseLineY = y0 + 3 * spacing;
  } else {
    baseLineY = y0 + 1 * spacing;
  }
  const nFloat = (baseLineY - y) / (spacing / 2);
  return Math.round(nFloat);
}

function stepToY(n, y0, spacing, clef = 'G') {
  let baseLineY;
  if (clef === 'G') {
    baseLineY = y0 + 3 * spacing;
  } else {
    baseLineY = y0 + 1 * spacing;
  }
  return baseLineY - (n * (spacing / 2));
}

// オクターブ表示機能を削除
function formatNoteLabel(letter, octave, style) {
  const noteName = (style === "letter") ? letter : SOLFEGE[letter];
  return noteName;
}

const MAX_STEP_RANGE = 17; // 基準音 (n=0) から上下 17

// ================= スライダー +/- ボタン処理 =================
function setupStepButtons() {
  document.querySelectorAll('.btn-step').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      const stepDirection = parseInt(button.dataset.step, 10);

      const targetSlider = document.getElementById(targetId);
      if (!targetSlider) return;

      const step = parseFloat(targetSlider.step);
      const min = parseFloat(targetSlider.min);
      const max = parseFloat(targetSlider.max);
      let currentValue = parseFloat(targetSlider.value);

      let newValue = currentValue + (step * stepDirection);

      // min/max の範囲内に収める
      newValue = Math.max(min, Math.min(max, newValue));

      // 浮動小数点数による誤差を補正 (stepが0.05など)
      const stepString = step.toString();
      const decimalPlaces = stepString.includes('.') ? stepString.split('.')[1].length : 0;

      // toFixed で文字列にした後、再度 parseFloat で数値に戻す
      newValue = parseFloat(newValue.toFixed(decimalPlaces));

      if (targetSlider.value != newValue) {
        targetSlider.value = newValue;
        targetSlider.dispatchEvent(new Event('input', { bubbles: true }));
        targetSlider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

// ================= DOM取得 =================
const canvas = document.getElementById("stage");
const scoreImg = document.getElementById("scoreImg");
const stageWrap = document.getElementById("stageWrap");

const drawModeBtn = document.getElementById("drawModeBtn");
const moveModeBtn = document.getElementById("moveModeBtn");
const eraseModeBtn = document.getElementById("eraseModeBtn");
const imgMoveModeBtn = document.getElementById("imgMoveModeBtn");
const imgMoveModeEl = document.getElementById("imgMoveMode");

const mainFab = document.getElementById("mainFab");
const modeSwitcher = document.querySelector(".mode-switcher");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

let ctx = setupHiDPICanvas(canvas);

// UI
const spacingEl = document.getElementById("spacing");
const spacingOut = document.getElementById("spacingOut");
const yOffsetEl = document.getElementById("yOffset");
const yOffsetOut = document.getElementById("yOffsetOut");
const xOffsetEl = document.getElementById("xOffset");
const xOffsetOut = document.getElementById("xOffsetOut");
const clearActiveMarkersBtn = document.getElementById("clearActiveMarkersBtn");
const fileEl = document.getElementById("file");
const fitBtn = document.getElementById("fitBtn");
const scaleSlider = document.getElementById("scaleSlider");
const scaleOut = document.getElementById("scaleOut");
const canvasOpacitySlider = document.getElementById("canvasOpacitySlider");
const canvasOpacityOut = document.getElementById("canvasOpacityOut");
const eraseModeEl = document.getElementById("eraseMode");
const staffMoveModeEl = document.getElementById("staffMoveMode");
const markersResetBtn = document.getElementById("markersResetBtn");

const staffVisible1 = document.getElementById("staffVisible1");
const staffVisible2 = document.getElementById("staffVisible2");
const staffVisible3 = document.getElementById("staffVisible3");
const staffVisible4 = document.getElementById("staffVisible4");
const staffVisibleCheckboxes = [null, staffVisible1, staffVisible2, staffVisible3, staffVisible4];

// ================= データ構造 =================
let staffs = {};
let activeStaffId = null;

function createNewStaff(id, defaultX = 24, defaultY = 80, isVisible = true, clef = 'G') {
  const newStaff = {
    id: id,
    x0: defaultX,
    y0: defaultY,
    spacing: 17,
    lines: 5,
    markers: [],
    isVisible: isVisible,
    clef: clef
  };
  staffs[id] = newStaff;
  return newStaff;
}

function getActiveStaff() {
  return activeStaffId ? staffs[activeStaffId] : null;
}
// ==============================================

// ================= 履歴管理 (Undo/Redo) =================
let historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

function saveState() {
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  const currentState = {
    staffs: JSON.parse(JSON.stringify(staffs)),
    activeStaffId: activeStaffId,
    imgState: JSON.parse(JSON.stringify(imgState))
  };
  historyStack.push(currentState);
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  }
  historyIndex = historyStack.length - 1;
  updateHistoryButtons();
}

function restoreState(stateToRestore) {
  staffs = JSON.parse(JSON.stringify(stateToRestore.staffs));
  activeStaffId = stateToRestore.activeStaffId;

  const newImgState = JSON.parse(JSON.stringify(stateToRestore.imgState));
  imgState.tx = newImgState.tx;
  imgState.ty = newImgState.ty;
  imgState.scale = newImgState.scale;
  applyImgTransform();

  const maxY = Math.max(600, ...Object.values(staffs).map(s => s.y0));
  yOffsetEl.max = maxY + 100;

  updateStaffControlsFromState();
  updateSlidersForActiveStaff();

  render();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  const stateToRestore = historyStack[historyIndex];
  restoreState(stateToRestore);
  updateHistoryButtons();
}

function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  const stateToRestore = historyStack[historyIndex];
  restoreState(stateToRestore);
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoBtn.disabled = (historyIndex <= 0);
  redoBtn.disabled = (historyIndex >= historyStack.length - 1);
  undoBtn.style.opacity = undoBtn.disabled ? 0.4 : 1;
  undoBtn.style.pointerEvents = undoBtn.disabled ? 'none' : 'auto';
  redoBtn.style.opacity = redoBtn.disabled ? 0.4 : 1;
  redoBtn.style.pointerEvents = redoBtn.disabled ? 'none' : 'auto';
}


// ================= 画像トランスフォーム =================
const imgState = { tx: 0, ty: 0, scale: 1, minScale: 0.2, maxScale: 4 };
let isStaffDragging = false;
let isImgDragging = false;
let lastDragX = 0;
let lastDragY = 0;

function applyImgTransform() {
  scoreImg.style.transform = `translate(${imgState.tx}px, ${imgState.ty}px) scale(${imgState.scale})`;
  scaleSlider.value = imgState.scale;
  scaleOut.value = Number(imgState.scale).toFixed(2);
}
function fitImageToCanvas() {
  const imgW = scoreImg.naturalWidth || scoreImg.width;
  const imgH = scoreImg.naturalHeight || scoreImg.height;
  const wrapRect = stageWrap.getBoundingClientRect();
  const margin = 60;
  const scaleW = (wrapRect.width - margin) / imgW;
  const scaleH = (wrapRect.height - margin) / imgH;
  const s = Math.max(Math.min(scaleW, scaleH), imgState.minScale);
  imgState.scale = Math.min(s, imgState.maxScale);
  imgState.tx = 0;
  imgState.ty = 0;
  applyImgTransform();
}

// ================= マーカー関連 =================
let hoverIndex = -1;
let hoverStaffId = null;
let previewMarker = null;
let mouseMoveTimer = null;
const PREVIEW_DELAY = 300;

function addMarker(x, y) {
  const activeStaff = getActiveStaff();
  if (!activeStaff || !activeStaff.isVisible) return;

  const { y0, spacing, markers, clef } = activeStaff;

  const n = yToStep(y, y0, spacing, clef);

  if (Math.abs(n) > MAX_STEP_RANGE) {
    return; // 許容範囲外ならマーカーを追加しない
  }

  const { letter, octave } = stepToLetterOct(n, clef);
  const y_snapped = stepToY(n, y0, spacing, clef);

  markers.push({ x: x, y: y_snapped, n, letter, octave });

  render();
  saveState();
}

function removeNearestMarker(x, y, maxDist = 14) {
  let bestStaff = null;
  let bestMarkerIndex = -1;
  let bestD = Infinity;

  for (const id in staffs) {
    const staff = staffs[id];
    if (!staff.isVisible) continue;

    for (let i = 0; i < staff.markers.length; i++) {
      const m = staff.markers[i];
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bestD) {
        bestD = d;
        bestStaff = staff;
        bestMarkerIndex = i;
      }
    }
  }

  if (bestStaff && bestMarkerIndex > -1 && bestD <= maxDist) {
    bestStaff.markers.splice(bestMarkerIndex, 1);
    hoverIndex = -1;
    hoverStaffId = null;
    render();
    saveState();
  }
}

function getCanvasXY(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);
  return { x, y };
}

// ================= モードクリック処理 =================
canvas.addEventListener("click", (e) => {
  if (staffMoveModeEl.checked || imgMoveModeEl.checked) return;

  clearTimeout(mouseMoveTimer);
  previewMarker = null;

  const { x, y } = getCanvasXY(e);

  if (eraseModeEl.checked) {
    removeNearestMarker(x, y);
    return;
  }

  addMarker(x, y);
});

canvas.addEventListener("mousemove", (e) => {
  if (isStaffDragging || isImgDragging) return;

  clearTimeout(mouseMoveTimer);

  let needsRender = (hoverIndex !== -1 || previewMarker !== null);
  hoverIndex = -1;
  hoverStaffId = null;
  previewMarker = null;

  const isAddMode = !eraseModeEl.checked && !staffMoveModeEl.checked && !imgMoveModeEl.checked;
  const isEraseMode = eraseModeEl.checked && !staffMoveModeEl.checked && !imgMoveModeEl.checked;

  if (!isAddMode && !isEraseMode) {
    if (needsRender) render();
    return;
  }

  const { x, y } = getCanvasXY(e);

  if (isEraseMode) {
    let bestStaff = null;
    let bestMarkerIndex = -1;
    let bestD = Infinity;

    for (const id in staffs) {
      const staff = staffs[id];
      if (!staff.isVisible) continue;
      for (let i = 0; i < staff.markers.length; i++) {
        const m = staff.markers[i];
        const d = Math.hypot(m.x - x, m.y - y);
        if (d < bestD) {
          bestD = d;
          bestStaff = staff;
          bestMarkerIndex = i;
        }
      }
    }
    if (bestStaff && bestD < 14) {
      hoverStaffId = bestStaff.id;
      hoverIndex = bestMarkerIndex;
    }
    render();

  } else if (isAddMode) {
    if (needsRender) render();

    mouseMoveTimer = setTimeout(() => {
      const activeStaff = getActiveStaff();

      if (!activeStaff || !activeStaff.isVisible) return;

      const { y0, spacing, clef } = activeStaff;

      const n = yToStep(y, y0, spacing, clef);

      if (Math.abs(n) > MAX_STEP_RANGE) {
        previewMarker = null; // 範囲外ならプレビューしない
        render(); // 残っているかもしれないプレビューを消すために描画
        return;
      }

      const { letter, octave } = stepToLetterOct(n, clef);
      const y_snapped = stepToY(n, y0, spacing, clef);

      previewMarker = { x, y: y_snapped, n, letter, octave };
      render();

    }, PREVIEW_DELAY);
  }
});

canvas.addEventListener("mouseleave", () => {
  clearTimeout(mouseMoveTimer);
  previewMarker = null;

  if (hoverIndex !== -1) {
    hoverIndex = -1;
    hoverStaffId = null;
  }
  render();
});

// ================= 描画処理 =================

function drawMarkers(ctx) {
  const selectedNoteStyle = document.querySelector('input[name="note-style-select"]:checked');
  const style = selectedNoteStyle ? selectedNoteStyle.value : 'solfege';

  ctx.save();
  ctx.textAlign = "right";

  // 1. 既存のマーカーを描画
  for (const id in staffs) {
    const staff = staffs[id];
    if (!staff.isVisible) continue;

    for (let i = 0; i < staff.markers.length; i++) {
      const m = staff.markers[i];
      const label = formatNoteLabel(m.letter, m.octave, style);

      const isHover = (staff.id === hoverStaffId && i === hoverIndex);

      ctx.fillStyle = isHover ? "#ffa500" : "#ffffff";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f1115";

      ctx.lineWidth = 1;
      ctx.stroke();

      const textOffsetX = -10;
      const textOffsetY = 0;
      ctx.textBaseline = "middle";

      ctx.fillStyle = isHover ? "#ffa500" : "#e6e8eb";

      ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
      ctx.fillText(label, m.x + textOffsetX, m.y + textOffsetY);
    }
  }

  // 2. 追加プレビューのマーカーを描画
  if (previewMarker) {
    const m = previewMarker;
    const label = formatNoteLabel(m.letter, m.octave, style);

    const previewColor = "rgba(238, 13, 227, 1)";
    ctx.fillStyle = previewColor;

    ctx.beginPath();
    ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
    ctx.fill();

    const textOffsetX = -10;
    const textOffsetY = 0;
    ctx.textBaseline = "middle";
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system";
    ctx.fillText(label, m.x + textOffsetX, m.y + textOffsetY);
  }

  ctx.restore();
}

function render() {
  drawStaffs(ctx, staffs, activeStaffId);
  drawMarkers(ctx);
}


function updateStaffControlsFromState() {
  // 1. アクティブな五線IDを検証・更新する
  let visibleStaves = [];
  for (const id in staffs) {
    if (staffs[id].isVisible) {
      visibleStaves.push(staffs[id]);
    }
  }

  if (visibleStaves.length === 0) {
    activeStaffId = null;
  } else if (!activeStaffId || !staffs[activeStaffId] || !staffs[activeStaffId].isVisible) {
    // もしアクティブIDが無効なら、最初に見つかった表示中の五線を選択
    activeStaffId = visibleStaves.length > 0 ? visibleStaves[0].id : null;
  }

  // 2. 状態をUIコントロールに反映する
  for (let id = 1; id <= 4; id++) {
    const staff = staffs[id];
    if (!staff) continue;

    const visibleCheck = document.getElementById(`staffVisible${id}`);
    const activeRadio = document.getElementById(`activeStaff${id}`);
    const clefGRadio = document.getElementById(`clefG${id}`);
    const clefFRadio = document.getElementById(`clefF${id}`);

    visibleCheck.checked = staff.isVisible;
    activeRadio.checked = (staff.id === activeStaffId);

    // activeRadio.disabled = !staff.isVisible; (削除)

    if (staff.clef === 'G') {
      clefGRadio.checked = true;
    } else {
      clefFRadio.checked = true;
    }
    // 他のコントロールは、表示状態に基づいて無効化する
    clefGRadio.disabled = !staff.isVisible;
    clefFRadio.disabled = !staff.isVisible;
  }
}

function updateSlidersForActiveStaff() {
  const activeStaff = getActiveStaff();

  if (!activeStaff || !activeStaff.isVisible) {
    spacingEl.disabled = true;
    xOffsetEl.disabled = true;
    yOffsetEl.disabled = true;
    clearActiveMarkersBtn.disabled = true;

    spacingOut.value = "---";
    xOffsetOut.value = "---";
    yOffsetOut.value = "---";
    return;
  }

  spacingEl.disabled = false;
  xOffsetEl.disabled = false;
  yOffsetEl.disabled = false;
  clearActiveMarkersBtn.disabled = false;

  spacingEl.value = activeStaff.spacing;
  spacingOut.value = Number(activeStaff.spacing).toFixed(1);

  xOffsetEl.value = activeStaff.x0;

  xOffsetOut.value = activeStaff.x0;
  yOffsetEl.value = activeStaff.y0;
  yOffsetOut.value = activeStaff.y0;
}


window.addEventListener("resize", () => { ctx = setupHiDPICanvas(canvas); render(); });

// ================= ファイル / UI処理 =================
fileEl.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { scoreImg.src = reader.result; };
  reader.readAsDataURL(file);
});
scoreImg.addEventListener("load", () => requestAnimationFrame(fitImageToCanvas));

fitBtn.addEventListener("click", () => {
  fitImageToCanvas();
  saveState();
});

scaleSlider.addEventListener("input", () => {
  const newScale = Number(scaleSlider.value);
  imgState.scale = newScale;
  scaleOut.value = newScale.toFixed(2);
  applyImgTransform();
});
scaleSlider.addEventListener("change", () => saveState());

canvasOpacitySlider.addEventListener("input", () => {
  const opacity = canvasOpacitySlider.value;
  canvasOpacityOut.value = Number(opacity).toFixed(2);
  canvas.style.backgroundColor = `rgba(24, 28, 36, ${opacity})`;
});

spacingEl.addEventListener("input", () => {
  const activeStaff = getActiveStaff();
  if (!activeStaff) return;
  const newSpacing = Number(spacingEl.value);
  activeStaff.spacing = newSpacing;
  spacingOut.value = newSpacing.toFixed(1);

  const clef = activeStaff.clef;
  let baseLineY;
  if (clef === 'G') {
    baseLineY = activeStaff.y0 + 3 * newSpacing;
  } else {
    baseLineY = activeStaff.y0 + 1 * newSpacing;
  }

  for (const marker of activeStaff.markers) {
    const newY = baseLineY - (marker.n * (newSpacing / 2));
    marker.y = newY;
  }
  render();
});
spacingEl.addEventListener("change", () => saveState());

xOffsetEl.addEventListener("input", () => {
  const activeStaff = getActiveStaff();
  if (!activeStaff) return;
  const newX0 = Number(xOffsetEl.value);
  const dx = newX0 - activeStaff.x0;
  activeStaff.x0 = newX0;
  xOffsetOut.value = newX0;
  for (const marker of activeStaff.markers) {
    marker.x += dx;
  }
  render();
});
xOffsetEl.addEventListener("change", () => saveState());

yOffsetEl.addEventListener("input", () => {
  const activeStaff = getActiveStaff();
  if (!activeStaff) return;
  const newY0 = Number(yOffsetEl.value);
  const dy = newY0 - activeStaff.y0;
  activeStaff.y0 = newY0;
  yOffsetOut.value = newY0;
  for (const marker of activeStaff.markers) {
    marker.y += dy;
  }
  render();
});
yOffsetEl.addEventListener("change", () => saveState());


markersResetBtn.addEventListener("click", () => {
  // ここで警告ポップアップを表示します
  const isConfirmed = window.confirm("すべての設定と印をデフォルトに戻しますか?\n（この操作は取り消せません）");

  // ユーザーが「OK」を押した場合 (isConfirmed が true の場合) のみ、リセットを実行します
  if (isConfirmed) {
    initializeApp();
    saveState();
  }
  // 「キャンセル」が押された場合は何もしません
});

clearActiveMarkersBtn.addEventListener("click", () => {
  const activeStaff = getActiveStaff();
  if (activeStaff) {
    activeStaff.markers = [];
    render();
    saveState();
  }
});

function setStaffVisibility(id, isVisible) {
  if (staffs[id]) {
    staffs[id].isVisible = isVisible;
    updateStaffControlsFromState();
    updateSlidersForActiveStaff();
    render();
    saveState();
  }
}

staffVisible1.addEventListener("change", () => setStaffVisibility(1, staffVisible1.checked));
staffVisible2.addEventListener("change", () => setStaffVisibility(2, staffVisible2.checked));
staffVisible3.addEventListener("change", () => setStaffVisibility(3, staffVisible3.checked));
staffVisible4.addEventListener("change", () => setStaffVisibility(4, staffVisible4.checked));


function addStaffControlListeners() {
  // 1. 「操作対象」ラジオボタンのリスナー
  document.querySelectorAll('input[name="active-staff-select"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        const newId = Number(radio.value);
        const staff = staffs[newId];

        // 1. 自動で表示するロジック
        if (staff && !staff.isVisible) {
          // データとチェックボックスを強制的にオンにする
          staff.isVisible = true;
          const visibilityCheckbox = document.getElementById(`staffVisible${newId}`);
          if (visibilityCheckbox) {
            visibilityCheckbox.checked = true;
          }

          activeStaffId = newId;

          // UIコントロール（スライダーや記号ボタン）の
          // disabled状態を更新し、スライダーに値をセットする
          updateStaffControlsFromState();
          updateSlidersForActiveStaff();
          render();
          saveState();
        }
        // 2. (元から表示されていて) 単にアクティブIDを切り替えるロジック
        else if (newId && newId !== activeStaffId) {
          activeStaffId = newId;
          updateSlidersForActiveStaff();
          render();
          saveState();
        }
      }
    });
  });


  // 2. 「音部記号」ラジオボタンのリスナー
  document.querySelectorAll('input[name^="clef-select-"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        const id = Number(radio.name.split('-')[2]);
        const newClef = radio.value;
        const staff = staffs[id];

        if (!staff || staff.clef === newClef) return;

        staff.clef = newClef;

        const y0 = staff.y0;
        const spacing = staff.spacing;
        for (const marker of staff.markers) {
          const newN = yToStep(marker.y, y0, spacing, newClef);
          const { letter, octave } = stepToLetterOct(newN, newClef);
          marker.n = newN;
          marker.letter = letter;
          marker.octave = octave;
        }

        render();
        saveState();
      }
    });
  });
}

// 新しい「表記」ラジオボタンのリスナー
document.querySelectorAll('input[name="note-style-select"]').forEach(radio => {
  radio.addEventListener('change', render);
});

undoBtn.addEventListener("click", () => undo());
redoBtn.addEventListener("click", () => redo());


// ================= モード連携・排他制御 =================
imgMoveModeEl.addEventListener("change", () => {
  clearTimeout(mouseMoveTimer);
  previewMarker = null;

  const isImgMove = imgMoveModeEl.checked;
  if (isImgMove) {
    canvas.classList.add("is-img-move");
    staffMoveModeEl.checked = false;
    eraseModeEl.checked = false;
  } else {
    canvas.classList.remove("is-img-move");
    canvas.classList.remove("is-grabbing");
    isImgDragging = false;
  }
  render();
});

staffMoveModeEl.addEventListener("change", () => {
  clearTimeout(mouseMoveTimer);
  previewMarker = null;

  const isStaffMove = staffMoveModeEl.checked;
  if (isStaffMove) {
    canvas.classList.add("is-staff-move");
    imgMoveModeEl.checked = false;
    eraseModeEl.checked = false;
  } else {
    canvas.classList.remove("is-staff-move");
    canvas.classList.remove("is-grabbing");
    isStaffDragging = false;
  }
  render();
});

eraseModeEl.addEventListener("change", () => {
  clearTimeout(mouseMoveTimer);
  previewMarker = null;

  const isErase = eraseModeEl.checked;
  if (isErase) {
    staffMoveModeEl.checked = false;
    imgMoveModeEl.checked = false;
    staffMoveModeEl.dispatchEvent(new Event("change"));
    imgMoveModeEl.dispatchEvent(new Event("change"));
  }
  render();
});


// ================= ドラッグ処理 (画像 ＋ 五線) =================
canvas.addEventListener("mousedown", (e) => {
  if (imgMoveModeEl.checked) {
    isImgDragging = true;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    canvas.classList.add("is-grabbing");
    e.preventDefault();
    return;
  }

  // 五線移動モードの判定 (X座標もチェック)
  if (staffMoveModeEl.checked) {
    const activeStaff = getActiveStaff();
    if (!activeStaff) {
      staffMoveModeEl.checked = false;
      staffMoveModeEl.dispatchEvent(new Event("change"));
      return;
    }

    // マウスのX, Y座標が五線の範囲内かチェック
    const { x, y } = getCanvasXY(e);

    // Y座標の範囲
    const staffTop = activeStaff.y0;
    const staffBottom = activeStaff.y0 + (activeStaff.lines - 1) * activeStaff.spacing;

    // X座標の範囲
    const staffLeft = activeStaff.x0;
    const staffRight = canvas.getBoundingClientRect().width; // キャンバスの現在の幅

    // XまたはY座標が五線の範囲外なら、ドラッグを開始しない
    if (y < staffTop || y > staffBottom || x < staffLeft || x > staffRight) {
      return;
    }

    // 範囲内ならドラッグ開始
    isStaffDragging = true;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    canvas.classList.add("is-grabbing");
    e.preventDefault();
    return;
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isImgDragging) {
    const dx = e.clientX - lastDragX;
    const dy = e.clientY - lastDragY;
    lastDragX = e.clientX;
    lastDragY = e.clientY;

    imgState.tx += dx;
    imgState.ty += dy;
    applyImgTransform();
    return;
  }

  if (!isStaffDragging) return;

  const dx = e.clientX - lastDragX;
  const dy = e.clientY - lastDragY;
  lastDragX = e.clientX;
  lastDragY = e.clientY;

  let newX0 = Number(xOffsetEl.value) + dx;
  const minX = Number(xOffsetEl.min);
  const maxX = Number(xOffsetEl.max);
  if (newX0 < minX) newX0 = minX;
  if (newX0 > maxX) newX0 = maxX;
  xOffsetEl.value = newX0;

  let newY0 = Number(yOffsetEl.value) + dy;
  const minY = Number(yOffsetEl.min);
  const maxY = Number(yOffsetEl.max);
  if (newY0 < minY) newY0 = minY;
  if (newY0 > maxY) newY0 = maxY;
  yOffsetEl.value = newY0;

  xOffsetEl.dispatchEvent(new Event("input"));
  yOffsetEl.dispatchEvent(new Event("input"));
});

const stopAllDrag = () => {
  if (isStaffDragging) {
    isStaffDragging = false;
    canvas.classList.remove("is-grabbing");
    saveState();
  }
  if (isImgDragging) {
    isImgDragging = false;
    canvas.classList.remove("is-grabbing");
    saveState();
  }
};
canvas.addEventListener("mouseup", stopAllDrag);
canvas.addEventListener("mouseleave", stopAllDrag);

// ================= 初期化 =================
function initializeApp() {
  staffs = {};
  activeStaffId = null;
  historyStack = [];
  historyIndex = -1;

  imgState.tx = 0;
  imgState.ty = 0;
  imgState.scale = 1.0;
  applyImgTransform();

  fitImageToCanvas();

  yOffsetEl.max = 3000;
  xOffsetEl.max = 4500;

  spacingEl.value = 17;
  spacingOut.value = (17).toFixed(1);

  createNewStaff(1, 24, 130, true, 'G');
  createNewStaff(2, 24, 260, false, 'G');
  createNewStaff(3, 24, 390, false, 'G');
  createNewStaff(4, 24, 520, false, 'G');
  activeStaffId = 1;

  canvasOpacitySlider.value = 0.7;
  canvasOpacityOut.value = "0.70";
  canvas.style.backgroundColor = `rgba(24, 28, 36, 0.7)`;

  updateStaffControlsFromState();
  updateSlidersForActiveStaff();

  imgMoveModeEl.checked = false;
  staffMoveModeEl.checked = true; // デフォルトは五線移動
  eraseModeEl.checked = false;

  // ▼▼▼ 変更点 ▼▼▼
  // アプリ起動時に、デフォルトの「五線移動モード」の
  // イベントを強制的に実行し、カーソル（.is-staff-move）を正しく設定する
  staffMoveModeEl.dispatchEvent(new Event("change"));
  // ▲▲▲ 変更ここまで ▲▲▲

  render();
  updateHistoryButtons();
}

addStaffControlListeners();
setupStepButtons();

initializeApp();
saveState();


// ================= メニュー開閉処理 =================
const menuToggleBtn = document.getElementById("menuToggleBtn");
const bodyEl = document.body;

menuToggleBtn.addEventListener("click", () => {
  bodyEl.classList.toggle("menu-closed");
});

// ================= モード切替ボタン (画面左下) =================

function updateModeButtonsUI() {
  const isImgMove = imgMoveModeEl.checked;
  const isStaffMove = staffMoveModeEl.checked;
  const isErase = eraseModeEl.checked;
  const isDraw = !isImgMove && !isStaffMove && !isErase;

  imgMoveModeBtn.classList.toggle("active", isImgMove);
  moveModeBtn.classList.toggle("active", isStaffMove);
  eraseModeBtn.classList.toggle("active", isErase);
  drawModeBtn.classList.toggle("active", isDraw);
}

mainFab.addEventListener("click", () => {
  const isOpen = modeSwitcher.classList.toggle("open");
  mainFab.classList.toggle("active-fab-open", isOpen);

  if (isOpen) {
    mainFab.dataset.tooltip = "非表示";
  } else {
    mainFab.dataset.tooltip = "表示";
  }
});

function handleModeButtonClick(callback) {
  callback();
}

imgMoveModeBtn.addEventListener("click", () => {
  handleModeButtonClick(() => {
    imgMoveModeEl.checked = true;
    imgMoveModeEl.dispatchEvent(new Event("change"));
  });
});

moveModeBtn.addEventListener("click", () => {
  handleModeButtonClick(() => {
    staffMoveModeEl.checked = true;
    staffMoveModeEl.dispatchEvent(new Event("change"));
  });
});

drawModeBtn.addEventListener("click", () => {
  handleModeButtonClick(() => {
    imgMoveModeEl.checked = false;
    staffMoveModeEl.checked = false;
    eraseModeEl.checked = false;
    imgMoveModeEl.dispatchEvent(new Event("change"));
    staffMoveModeEl.dispatchEvent(new Event("change"));
    eraseModeEl.dispatchEvent(new Event("change"));
  });
});

eraseModeBtn.addEventListener("click", () => {
  handleModeButtonClick(() => {
    eraseModeEl.checked = true;
    eraseModeEl.dispatchEvent(new Event("change"));
  });
});

imgMoveModeEl.addEventListener("change", updateModeButtonsUI);
staffMoveModeEl.addEventListener("change", updateModeButtonsUI);
eraseModeEl.addEventListener("change", updateModeButtonsUI);

updateModeButtonsUI();

mainFab.click();