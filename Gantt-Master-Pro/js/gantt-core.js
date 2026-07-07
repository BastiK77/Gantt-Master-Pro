/**
 * js/gantt-core.js - Enterprise Scheduling Engine (ULTIMATE FULL VERSION)
 * Features: Dynamische Balken-Templates, Custom Wochenenden, Ganztägige Tour-Balken, Snap-15, Deep-Filter
 * Interaktionen: Klick-Toleranz (Modal), Bidirektionales Resize, Strg-Clone, Shift-Create, Team-Linien
 * UI-Erweiterung: Integrierte Untere Worklist mit flexiblem Resizable Splitter
 */
var cStd, cTour, spacer, mouseDownTime;
var isDragging = false, isNew = false, isResizingStart = false, isResizingEnd = false;
var activeTask = null;

// Startkoordinaten für die Klick-Toleranz (Deadzone)
var startX = 0, startY = 0;

// Splitter Variablen
var isResizingSplitter = false;
var currentSplitterY = window.innerHeight - 250; // Standardhöhe 250px für die untere Liste

// BETRIEBSKALENDER & STRINGS AUS LOCALSTORAGE LADEN / INITIALISIEREN
var globalHolidays = JSON.parse(localStorage.getItem('gantt_holidays')) || {
    '2026-01-01': { label: "Neujahr", regionId: "r1" },
    '2026-05-01': { label: "Tag der Arbeit", regionId: "r1" },
    '2026-12-25': { label: "1. Weihnachtstag", regionId: "r1" }
};
var globalVacations = JSON.parse(localStorage.getItem('gantt_vacations')) || [
    { start: '2026-07-01', end: '2026-08-15', label: "Sommerferien", regionId: "r2" }
];

// Konfigurierbare arbeitsfreie Wochentage (0 = Sonntag, 6 = Samstag etc.)
var configWorkingWeekends = JSON.parse(localStorage.getItem('gantt_cfg_weekends')) || [0, 6];

// Dynamische Balkenbeschriftungs-Templates pro Ansicht
var configTextTemplates = JSON.parse(localStorage.getItem('gantt_cfg_templates')) || {
    'MONTH': '{orderNr}',
    'DAY': '{label}',
    'TOUR': '{start} - {label} ({city})'
};

/** 1. ERWEITERTE KALENDER- & GEBIETS-LOGIK (REKURSIV) **/
function getWeekNumber(d) {
    let date = new Date(d.getTime());
    if (lang === 'us') {
        let onejan = new Date(date.getFullYear(), 0, 1);
        return Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    }
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getAllChildRegionIds(parentIds) {
    let results = [...parentIds];
    if (!regions) return results;
    let children = regions.filter(r => parentIds.includes(r.parentId)).map(r => r.id);
    if (children.length > 0) results = results.concat(getAllChildRegionIds(children));
    return results;
}

function getFilteredTechs() {
    if (!activeRegionFilters || activeRegionFilters.length === 0) return techs || [];
    const allAllowedIds = getAllChildRegionIds(activeRegionFilters);
    return (techs || []).filter(t => allAllowedIds.includes(t.regionId));
}

function isNonWorkingDay(date, resObj) {
    if (!resObj) return false;
    if (resObj.type !== 'worker') return false; 

    const dateStr = date.toISOString().split('T')[0];
    const allowedRegions = getAllChildRegionIds([resObj.regionId]);

    if (globalHolidays[dateStr]) {
        if (allowedRegions.includes(globalHolidays[dateStr].regionId) || globalHolidays[dateStr].regionId === "r1") return true;
    }
    for (let vac of globalVacations) {
        if (dateStr >= vac.start && dateStr <= vac.end) {
            if (allowedRegions.includes(vac.regionId)) return true;
        }
    }
    if (configWorkingWeekends.includes(date.getDay())) return true;

    return false;
}

function snapToGrid(date) {
    const interval = 15 * 60 * 1000; 
    return new Date(Math.round(date.getTime() / interval) * interval);
}

/** 2. TEXT-TEMPLATE ENGINE FÜR BALKEN **/
function buildTaskLabel(t) {
    let template = configTextTemplates[viewMode] || "{label}";
    
    let orderObj = orders.find(o => o.id == t.orderId) || {};
    let taskObj = orderTasks.find(ot => ot.id == t.orderTaskId) || {};
    let locObj = addresses.find(a => a.id == taskObj.locationId) || {};
    let jobObj = typeof resourceJobs !== 'undefined' ? resourceJobs.find(j => j.id == taskObj.requiredJobId) : null;

    let timeStart = t.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let timeEnd = t.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let result = template
        .replace(/{label}/g, t.label || taskObj.label || "Einsatz")
        .replace(/{orderNr}/g, orderObj.orderNr || "Keine Nr.")
        .replace(/{pos}/g, taskObj.pos || "0000")
        .replace(/{city}/g, locObj.city || "Kein Ort")
        .replace(/{start}/g, timeStart)
        .replace(/{end}/g, timeEnd)
        .replace(/{job}/g, jobObj ? jobObj.name : "Kein Skill");

    return result;
}

/** 3. COORDINATE TRANSFORM ENGINES **/
const StandardEngine = {
    getRange: () => ({ 
        start: viewMode === 'MONTH' ? new Date(currentYear, 0, 1) : new Date(currentYear, currentMonth, 1),
        end: viewMode === 'MONTH' ? new Date(currentYear, 11, 31, 23, 59) : new Date(currentYear, currentMonth + 1, 0, 23, 59)
    }),
    dateToX: (d) => {
        const { start } = StandardEngine.getRange();
        const units = viewMode === 'MONTH' ? 12 : new Date(currentYear, currentMonth + 1, 0).getDate();
        const factor = viewMode === 'MONTH' ? 30.44 : 1;
        return UI.headerW + ((d - start) / 86400000 / factor) * ((cStd.width - UI.headerW) / units);
    },
    xToDate: (x) => {
        const { start } = StandardEngine.getRange();
        const units = viewMode === 'MONTH' ? 12 : new Date(currentYear, currentMonth + 1, 0).getDate();
        const factor = viewMode === 'MONTH' ? 30.44 : 1;
        return snapToGrid(new Date(start.getTime() + (x - UI.headerW) / ((cStd.width - UI.headerW) / units) * factor * 86400000));
    }
};

const TourEngine = {
    getRange: () => ({ start: tourDate, end: new Date(tourDate.getTime() + 3 * 86400000) }),
    dateToX: (d) => UI.headerW + ((new Date(d) - tourDate.getTime()) / 86400000) * ((cTour.width - UI.headerW) / 3),
    xToDate: (x) => snapToGrid(new Date(tourDate.getTime() + ((x - UI.headerW) / ((cTour.width - UI.headerW) / 3)) * 86400000))
};

/** 4. STACKING SYSTEM **/
function calculateStacking() {
    const isT = (viewMode === 'TOUR'), engine = isT ? TourEngine : StandardEngine;
    const { start: vS, end: vE } = engine.getRange();
    const fTechs = getFilteredTechs();
    if(!fTechs) return;

    fTechs.forEach(r => r.slots = 1);
    tasks.forEach(t => t.slot = 0);

    fTechs.forEach(res => {
        let resTasks = tasks.filter(t => t.resId === res.id && t.end >= vS && t.start <= vE).sort((a,b) => a.start - b.start);
        let slots = [];
        resTasks.forEach(t => {
            let placed = false;
            let sComp = isT ? t.start.getTime() : new Date(t.start).setHours(0,0,0,0);
            for(let i=0; i<slots.length; i++) {
                if (slots[i] <= sComp) { t.slot = i; slots[i] = t.end.getTime(); placed = true; break; }
            }
            if(!placed) { t.slot = slots.length; slots.push(t.end.getTime()); }
        });
        res.slots = Math.max(1, slots.length);
    });
}
function getY(idx) { const fTechs = getFilteredTechs(); let y = 0; for(let i=0; i<idx; i++) y += (fTechs[i].slots || 1) * UI.rowH; return y; }

/** 5. CANVAS RENDERING ENGINE **/
function draw() {
    if (!cStd || !cTour) return;
    const fTechs = getFilteredTechs();
    calculateStacking();

    const isT = (viewMode === 'TOUR'), canvas = isT ? cTour : cStd, ctx = canvas.getContext('2d'), engine = isT ? TourEngine : StandardEngine;
    const units = isT ? 3 : (viewMode === 'MONTH' ? 12 : new Date(currentYear, currentMonth + 1, 0).getDate());
    const unitW = (canvas.width - UI.headerW) / units, totalH = getY(fTechs.length);
    
    if(spacer) spacer.style.height = (totalH + UI.topM) + "px";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(0, UI.topM - scrollTop);
    
    // Raster-Zeichnen & Betriebskalender
    for(let i=0; i<=units; i++) {
        let x = UI.headerW + i * unitW;
        let d = isT ? new Date(tourDate.getTime() + i*86400000) : new Date(currentYear, currentMonth, i+1);
        
        if(i < units && viewMode !== 'MONTH') {
            fTechs.forEach((res, rIdx) => {
                if (isNonWorkingDay(d, res)) {
                    ctx.fillStyle = "rgba(231, 76, 60, 0.04)"; 
                    ctx.fillRect(x, getY(rIdx), unitW, (res.slots || 1) * UI.rowH);
                }
            });
        }
        ctx.strokeStyle = "#eee"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalH); ctx.stroke();
    }

    // Ressourcen & horizontale Trennlinien (Gitternetz)
    fTechs.forEach((res, i) => {
        let y = getY(i), h = res.slots * UI.rowH;
        ctx.fillStyle = (resTypes[res.type]?.color || "#fafafa"); ctx.fillRect(0, y, UI.headerW, h);
        ctx.strokeStyle = "#ddd"; ctx.strokeRect(0, y, UI.headerW, h); 
        ctx.strokeStyle = "#e0e0e0"; ctx.beginPath(); ctx.moveTo(UI.headerW, y+h); ctx.lineTo(canvas.width, y+h); ctx.stroke();
        
        // Hierarchische Team-Verbindungslinien zeichnen
        if(res.parentId) {
            ctx.strokeStyle = "#bdc3c7"; ctx.lineWidth = 1.5; ctx.beginPath();
            ctx.moveTo(25, y - 20); ctx.lineTo(25, y + 22); ctx.lineTo(40, y + 22); ctx.stroke();
            ctx.lineWidth = 1;
        }
        ctx.fillStyle = "#333"; ctx.font = res.parentId ? "12px sans-serif" : "bold 13px sans-serif";
        ctx.fillText(res.name, res.parentId ? 45 : 15, y + 28);
    });

    // Balken (Einsätze) zeichnen
    tasks.forEach(t => {
        let rIdx = fTechs.findIndex(r => r.id === t.resId); if(rIdx===-1) return;
        
        let x1 = isT ? engine.dateToX(new Date(t.start).setHours(0,0,0,0)) : engine.dateToX(t.start);
        let x2 = isT ? engine.dateToX(new Date(t.end).setHours(23,59,59,999)) : engine.dateToX(t.end);
        
        let y = getY(rIdx) + (t.slot * UI.rowH) + 10;
        ctx.fillStyle = (t === activeTask) ? "#e67e22" : (configKeys[t.type]?.color || "#3498db");
        let dX = Math.max(UI.headerW, x1), dW = Math.max(5, x2 - dX);
        if(x1 < canvas.width && x2 > UI.headerW) {
            ctx.fillRect(dX, y, dW, UI.rowH - 20);
            if(dW > 35) {
                ctx.fillStyle = "white"; ctx.font = "bold 11px sans-serif";
                ctx.fillText(buildTaskLabel(t), dX + 8, y + 18); 
            }
        }
    });
    ctx.restore();

    // FIXED TIME-AXIS HEADER (ZWEI ZEILEN: KW-KLAMMER & TAGE)
    ctx.fillStyle = "#2c3e50"; ctx.fillRect(0, 0, canvas.width, UI.topM);
    ctx.fillStyle = "white"; ctx.font = "bold 14px sans-serif"; ctx.fillText(i18n[lang].res, 15, 35);
    
    let lastKW = -1;
    for(let i=0; i<units; i++) {
        let x = UI.headerW + i * unitW, d = isT ? new Date(tourDate.getTime() + i*86400000) : new Date(currentYear, currentMonth, i+1);
        if (viewMode !== 'MONTH') {
            let kw = getWeekNumber(d);
            if (kw !== lastKW) {
                ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x, 2, unitW * (viewMode==='DAY'?7:3), 18);
                ctx.fillStyle = "white"; ctx.font = "bold 10px sans-serif"; ctx.fillText("KW " + kw, x + 5, 14);
                lastKW = kw;
            }
        }
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        if(viewMode === 'MONTH') ctx.fillText(i18n[lang].months[i], x + 10, 38);
        else {
            let dN = new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-US', {weekday:'short'}).format(d);
            ctx.font = "9px sans-serif"; ctx.fillText(dN, x + 8, 35);
            ctx.font = "bold 12px sans-serif"; ctx.fillText(d.getDate() + ".", x + 8, 52);
        }
    }
}

/** 6. EVENT-GESTEUERTE INTERAKTION (MAUS LOGIK) **/
function handleMouseDown(e) {
    const rect = e.target.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top + scrollTop;
    const engine = viewMode === 'TOUR' ? TourEngine : StandardEngine, fTechs = getFilteredTechs();
    const isT = (viewMode === 'TOUR'); 
    let cY = startY - UI.topM; 
    mouseDownTime = Date.now();
    isDragging = isNew = isResizingStart = isResizingEnd = false;

    let resIdx = fTechs.findIndex((r, i) => cY >= getY(i) && cY < getY(i+1 || 9999));
    if (startX < UI.headerW && startY > UI.topM && fTechs[resIdx]) { openResModal(techs.findIndex(t => t.id === fTechs[resIdx].id)); return; }

    let found = tasks.find(t => {
        let rIdx = fTechs.findIndex(r => r.id === t.resId); if(rIdx===-1) return false;
        let x1 = isT ? engine.dateToX(new Date(t.start).setHours(0,0,0,0)) : engine.dateToX(t.start);
        let x2 = isT ? engine.dateToX(new Date(t.end).setHours(23,59,59,999)) : engine.dateToX(t.end);
        return (startX >= x1 && startX <= x2 && cY >= getY(rIdx) + (t.slot * UI.rowH) && cY <= getY(rIdx) + (t.slot * UI.rowH) + UI.rowH);
    });

    if (e.shiftKey && fTechs[resIdx] && startX > UI.headerW) { 
        activeTask = { id: Date.now(), start: engine.xToDate(startX), end: new Date(engine.xToDate(startX).getTime() + 7200000), resId: fTechs[resIdx].id, label: "Neu", type: Object.keys(configKeys)[0] };
        tasks.push(activeTask); isNew = true; isResizingEnd = true;
    } else if (found) {
        activeTask = found;
        if (e.ctrlKey) { 
            let c = JSON.parse(JSON.stringify(found)); c.id = Date.now(); c.start = new Date(found.start); c.end = new Date(found.end); tasks.push(c); activeTask = c; isDragging = true;
        } else { 
            let x1 = engine.dateToX(activeTask.start), x2 = engine.dateToX(activeTask.end), pct = (startX - x1) / (x2 - x1);
            if (pct < 0.2 && viewMode !== 'TOUR') isResizingStart = true; 
            else if (pct > 0.8 && viewMode !== 'TOUR') isResizingEnd = true; 
            else isDragging = true;
        }
        activeTask.dragOffset = startX - (isT ? engine.dateToX(new Date(activeTask.start).setHours(0,0,0,0)) : engine.dateToX(activeTask.start));
    }
    draw();
}

function handleMouseMove(e) {
    if(!activeTask) return;
    const rect = e.target.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top + scrollTop, engine = viewMode === 'TOUR' ? TourEngine : StandardEngine, fTechs = getFilteredTechs();
    const isT = (viewMode === 'TOUR'); 
    
    // Klick-Toleranz (Deadzone von 4 Pixeln gegen unbeabsichtigtes Draggen)
    if (!isDragging && !isResizingStart && !isResizingEnd && Math.abs(mx - startX) < 4 && Math.abs(my - startY) < 4) {
        return;
    }

    if (isResizingEnd || isNew) { 
        let targetDate = engine.xToDate(mx);
        if (isNew && targetDate < activeTask.start) {
            isResizingStart = true; isResizingEnd = false; isNew = false;
            activeTask.end = new Date(activeTask.start); activeTask.start = targetDate;
        } else {
            activeTask.end = targetDate; 
        }
    }
    else if (isResizingStart) { 
        let targetDate = engine.xToDate(mx);
        if (targetDate > activeTask.end) {
            isResizingEnd = true; isResizingStart = false;
            activeTask.start = new Date(activeTask.end); activeTask.end = targetDate;
        } else {
            activeTask.start = targetDate; 
        }
    }
    else if (isDragging) {
        let dur = activeTask.end - activeTask.start;
        activeTask.start = engine.xToDate(mx - activeTask.dragOffset);
        activeTask.end = new Date(activeTask.start.getTime() + dur);
        let rIdx = fTechs.findIndex((r, i) => (my - UI.topM) >= getY(i) && (my - UI.topM) < getY(i+1 || 9999));
        if (fTechs[rIdx]) activeTask.resId = fTechs[rIdx].id;
    }
    draw();
}

window.addEventListener('mouseup', (e) => {
    if (!activeTask) return;
    
    const rect = cStd ? cStd.getBoundingClientRect() : {left:0, top:0};
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top + scrollTop;
    const clickThreshold = (Math.abs(mx - startX) < 5 && Math.abs(my - startY) < 5);

    if (isNew && activeTask.start >= activeTask.end) {
        activeTask.end = new Date(activeTask.start.getTime() + 2 * 3600000); // Standard 2 Stunden
    }

    // Wenn es ein echter Klick innerhalb der Deadzone war -> Modal unfehlbar triggern!
    if (clickThreshold || isNew || (Date.now() - mouseDownTime < 250)) {
        if(typeof openTaskModal === 'function') openTaskModal(activeTask);
    }
    
    activeTask = null; isDragging = isNew = isResizingStart = isResizingEnd = false; saveData(); draw();
});

function handleDrop(e) {
    e.preventDefault(); document.getElementById('modal-overlay').style.opacity = "1";
    const otId = e.dataTransfer.getData("text/plain"), ot = orderTasks.find(x => x.id === otId);
    if(!ot) return;
    const rect = e.target.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top + scrollTop, engine = (viewMode==='TOUR'?TourEngine:StandardEngine), fTechs = getFilteredTechs();
    let rIdx = fTechs.findIndex((r, i) => (my - UI.topM) >= getY(i) && (my - UI.topM) < getY(i+1 || 9999));
    if (rIdx === -1 || mx < UI.headerW) return;
    let sD = engine.xToDate(mx), eD = new Date(sD.getTime() + (ot.totalHours || 8) * 3600000);
    tasks.push({ id: Date.now(), orderId: ot.orderId, orderTaskId: ot.id, resId: fTechs[rIdx].id, start: sD, end: eD, label: ot.label, type: Object.keys(configKeys)[0] });
    ot.status = 'scheduled'; saveData(); if(typeof renderIntegratedWorklist === 'function') renderIntegratedWorklist(); draw();
}

/** 7. VIEWPORT & DROPDOWN STEUERUNG **/
function toggleFilterDropdown() { 
    const dd = document.getElementById('filter-dropdown'); dd.classList.toggle('show'); 
    if(dd.classList.contains('show')) renderFilterDropdown(); 
}
function renderFilterDropdown() {
    const dd = document.getElementById('filter-dropdown');
    dd.innerHTML = `<div style="padding:5px; border-bottom:1px solid #eee; margin-bottom:5px;"><button class="btn" style="width:100%; height:25px; font-size:10px;" onclick="activeRegionFilters=[]; draw(); renderFilterDropdown();">Alle Filter löschen</button></div>` + renderFilterTree(null, 0);
}
function renderFilterTree(pid, indent) {
    if (!regions) return '';
    return regions.filter(r => r.parentId == pid).map(r => `
        <label class="filter-item" style="padding-left:${indent * 15 + 10}px"><input type="checkbox" ${activeRegionFilters.includes(r.id) ? 'checked' : ''} onchange="toggleRegionFilter('${r.id}')"><span style="${indent === 0 ? 'font-weight:bold;' : ''}">${r.name}</span></label>
        ${renderFilterTree(r.id, indent + 1)}`).join('');
}
function toggleRegionFilter(id) {
    const idx = activeRegionFilters.indexOf(id); if(idx > -1) activeRegionFilters.splice(idx,1); else activeRegionFilters.push(id);
    document.getElementById('filter-label').innerText = activeRegionFilters.length ? activeRegionFilters.length + " Gebiete" : "Alle Regionen";
    draw();
}

function switchView(m) {
    viewMode = m; const isT = (m === 'TOUR');
    cStd.style.display = isT ? 'none' : 'block'; cTour.style.display = isT ? 'block' : 'none';
    document.getElementById('lbl-year').classList.toggle('active-view', m === 'MONTH');
    document.getElementById('lbl-month').classList.toggle('active-view', m === 'DAY');
    document.getElementById('lbl-tour').classList.toggle('active-view', isT);
    window.onresize(); updateNav(); draw();
}

function updateNav() {
    const d = document.getElementById('period-display'); if(!d) return;
    d.innerText = (viewMode === 'TOUR') ? "Tour ab " + tourDate.toLocaleDateString() : (viewMode === 'MONTH' ? "Jahr " + currentYear : i18n[lang].months[currentMonth] + " " + currentYear);
}

function navTime(delta) {
    if(viewMode==='TOUR') tourDate.setDate(tourDate.getDate() + delta);
    else if(viewMode==='MONTH') currentYear += delta;
    else { currentMonth += delta; if(currentMonth>11){currentMonth=0; currentYear++;} if(currentMonth<0){currentMonth=11; currentYear--;} }
    updateNav(); draw();
}

function addResourceTop() { techs.unshift({ id: Date.now(), name: "Neu", type: Object.keys(resTypes)[0], parentId: null, regionId: "" }); saveData(); draw(); }
function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; document.getElementById('lookup-overlay').style.display = 'none'; isDirty = false; }
function safeCloseModal() { if(isDirty && !confirm("Verwerfen?")) return; closeModal(); }

/** 8. NATIVE UNTERE-WORKLIST & SPLITTER SPLIT-LOGIK **/
function initSplitterLayout() {
    const container = document.getElementById('view-container');
    
    // Prüfen ob die HTML-Elemente für die integrierte Worklist existieren, andernfalls erzeugen
    if(!document.getElementById('gantt-splitter')) {
        let splitter = document.createElement('div');
        splitter.id = 'gantt-splitter';
        splitter.style.cssText = "height:6px; background:#bdc3c7; cursor:row-resize; z-index:1001; border-top:1px solid #95a5a6;";
        
        let bottomPanel = document.createElement('div');
        bottomPanel.id = 'gantt-bottom-panel';
        bottomPanel.style.cssText = "background:#fff; overflow-y:auto; z-index:1000; border-top:1px solid #d2d5d7;";
        
        container.parentNode.insertBefore(splitter, container.nextSibling);
        splitter.parentNode.insertBefore(bottomPanel, splitter.nextSibling);
        
        // Drag-Events für den Splitter registrieren
        splitter.addEventListener('mousedown', (e) => { isResizingSplitter = true; e.preventDefault(); });
        
        window.addEventListener('mousemove', (e) => {
            if(!isResizingSplitter) return;
            let topNavH = 65;
            currentSplitterY = Math.max(150, Math.min(window.innerHeight - 100, e.clientY));
            resizeLayoutComponents();
        });
        
        window.addEventListener('mouseup', () => { if(isResizingSplitter) { isResizingSplitter = false; window.onresize(); } });
    }
    resizeLayoutComponents();
    renderIntegratedWorklist();
}

function resizeLayoutComponents() {
    const container = document.getElementById('view-container');
    const bottomPanel = document.getElementById('gantt-bottom-panel');
    let topNavH = 65;
    
    let containerH = currentSplitterY - topNavH;
    let bottomH = window.innerHeight - currentSplitterY - 6;
    
    container.style.height = containerH + "px";
    if(bottomPanel) bottomPanel.style.height = bottomH + "px";
}

function renderIntegratedWorklist() {
    const panel = document.getElementById('gantt-bottom-panel');
    if(!panel) return;
    
    const backlog = orderTasks.filter(ot => ot.isInWorklist && ot.status !== 'scheduled');
    
    let rows = backlog.map(ot => {
        const o = orders.find(x => x.id == ot.orderId);
        const loc = addresses.find(x => x.id == ot.locationId);
        const reg = regions.find(r => r.id == ot.regionId);
        return `
            <tr draggable="true" ondragstart="e => { e.dataTransfer.setData('text/plain', '${ot.id}'); e.dataTransfer.effectAllowed = 'move'; }" style="cursor:grab;">
                <td style="width:30px; text-align:center; color:#3498db; font-weight:bold;">☰</td>
                <td><b>${o ? o.orderNr : 'Neu'}</b></td>
                <td><b>${ot.label}</b></td>
                <td>${loc ? loc.city : '-'} ${reg ? `<span style="font-size:10px; color:#7f8c8d;">📍 ${reg.name}</span>` : ''}</td>
                <td style="text-align:center; font-weight
