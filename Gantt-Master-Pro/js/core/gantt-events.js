/**
 * js/core/gantt-events.js - Maus-Interaktion, Drag-and-Drop & Initialisierung
 * FIX: ReferenceError behoben (switchView, updateNav und navTime wieder vollständig integriert).
 */
var startX = 0, startY = 0;

function handleMouseDown(e) {
    const rect = e.target.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top; 
    const engine = viewMode === 'TOUR' ? TourEngine : StandardEngine, fTechs = getFilteredTechs();
    const isT = (viewMode === 'TOUR'); 
    
    let cY = startY - UI.topM + scrollTop; 
    mouseDownTime = Date.now();
    isDragging = isNew = isResizingStart = isResizingEnd = false;

    let resIdx = fTechs.findIndex((r, i) => cY >= getY(i) && cY < getY(i + 1 || 9999));
    
    if (startX < UI.headerW && startY > UI.topM && fTechs[resIdx]) { 
        let globalIdx = techs.findIndex(t => t.id === fTechs[resIdx].id);
        if (globalIdx > -1 && typeof openResModal === 'function') openResModal(globalIdx); 
        return; 
    }

    let found = tasks.find(t => {
        let rIdx = fTechs.findIndex(r => r.id === t.resId); if(rIdx === -1) return false;
        let x1 = (viewMode === 'HOUR' || isT) ? engine.dateToX(t.start) : engine.dateToX(new Date(t.start).setHours(0,0,0,0));
        let x2 = (viewMode === 'HOUR' || isT) ? engine.dateToX(t.end) : engine.dateToX(new Date(t.end).setHours(23,59,59,999));
        let rowY = getY(rIdx) + (t.slot * UI.rowH);
        return (startX >= x1 && startX <= x2 && cY >= rowY && cY <= rowY + UI.rowH);
    });

    if (e.shiftKey && fTechs[resIdx] && startX > UI.headerW) { 
        let cleanStart = engine.xToDate(startX);
        let sD = applyResourceTimeVorgabe(cleanStart, fTechs[resIdx].id);
        let eD = applyResourceEndTimeVorgabe(cleanStart, fTechs[resIdx].id);
        
        activeTask = { id: Date.now(), start: sD, end: eD, resId: fTechs[resIdx].id, label: "Neu", type: Object.keys(configKeys) };
        tasks.push(activeTask); isNew = true; isResizingEnd = (viewMode === 'HOUR');
    } else if (found) {
        activeTask = found;
        if (e.ctrlKey) { 
            let c = JSON.parse(JSON.stringify(found)); c.id = Date.now(); c.start = new Date(found.start); c.end = new Date(found.end); tasks.push(c); activeTask = c; isDragging = true;
        } else { 
            let x1 = engine.dateToX(activeTask.start), x2 = engine.dateToX(activeTask.end), pct = (startX - x1) / (x2 - x1);
            if (pct < 0.2 && viewMode === 'HOUR') isResizingStart = true; 
            else if (pct > 0.8 && viewMode === 'HOUR') isResizingEnd = true; 
            else isDragging = true;
        }
        activeTask.dragOffset = startX - engine.dateToX(activeTask.start);
        activeTask.origStart = new Date(activeTask.start);
    }
    if (typeof draw === 'function') draw();
}

function handleMouseMove(e) {
    if(!activeTask) return;
    const rect = e.target.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top, engine = viewMode === 'TOUR' ? TourEngine : StandardEngine, fTechs = getFilteredTechs();
    let cY = my - UI.topM + scrollTop;

    if (!isDragging && !isResizingStart && !isResizingEnd && Math.abs(mx - startX) < 4 && Math.abs(my - (startY + scrollTop)) < 4) return;

    if (viewMode === 'HOUR' || viewMode === 'TOUR') {
        if (isResizingEnd || isNew) activeTask.end = engine.xToDate(mx);
        else if (isResizingStart) activeTask.start = engine.xToDate(mx);
        else if (isDragging) {
            let dur = activeTask.end - activeTask.start;
            activeTask.start = engine.xToDate(mx - activeTask.dragOffset);
            activeTask.end = new Date(activeTask.start.getTime() + dur);
        }
    } else {
        if (isDragging) {
            let currentTargetDay = engine.xToDate(mx);
            let dayDiff = Math.round((currentTargetDay - activeTask.origStart) / 86400000);
            
            let rIdx = fTechs.findIndex((r, i) => cY >= getY(i) && cY < getY(i+1 || 9999));
            if (fTechs[rIdx]) {
                activeTask.resId = fTechs[rIdx].id;
                let newStart = new Date(activeTask.origStart.getTime() + dayDiff * 86400000);
                let dur = activeTask.end - activeTask.start;
                
                activeTask.start = applyResourceTimeVorgabe(newStart, fTechs[rIdx].id);
                activeTask.end = new Date(activeTask.start.getTime() + dur);
            }
        }
    }
    if (typeof draw === 'function') draw();
}

window.addEventListener('mouseup', (e) => {
    if (!activeTask) return;
    const canvas = (viewMode === 'TOUR') ? cTour : cStd;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const isStaticClick = (Math.abs(mx - startX) < 6 && Math.abs(my - startY) < 6);

    if (isStaticClick || isNew || (Date.now() - mouseDownTime < 250)) {
        if (typeof openTaskModal === 'function') openTaskModal(activeTask);
    }
    activeTask = null; isDragging = isNew = isResizingStart = isResizingEnd = false; 
    saveData(); if (typeof draw === 'function') draw();
});

function handleDrop(e) {
    e.preventDefault();
    const otId = e.dataTransfer.getData("text/plain"), ot = orderTasks.find(x => x.id === otId);
    if(!ot) return;

    const rect = e.target.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top + scrollTop, engine = (viewMode==='TOUR'?TourEngine:StandardEngine), fTechs = getFilteredTechs();
    let rIdx = fTechs.findIndex((r, i) => (my - UI.topM) >= getY(i) && (my - UI.topM) < getY(i+1 || 9999));
    if (rIdx === -1 || mx < UI.headerW) return;

    let resObj = fTechs[rIdx];
    let sD = engine.xToDate(mx);
    
    sD = applyResourceTimeVorgabe(sD, resObj.id);
    let eD = applyResourceEndTimeVorgabe(sD, resObj.id);

    if (ot.hoursPerDay && resObj.hoursPerDay && parseFloat(resObj.hoursPerDay) < parseFloat(ot.hoursPerDay)) {
        alert(`⚠️ KAPAZITÄTS-KONFLIKT BEI DER DISPOSITION:\n\nDer ausgewählte Mitarbeiter "${resObj.name}" verfügt vertraglich nur über ein Arbeitszeitprofil von ${resObj.hoursPerDay}h/Tag.\n\nDer eingeplante Auftragsvorgang verlangt jedoch eine Soll-Struktur von ${ot.hoursPerDay}h/Tag.\n\nDies führt bei einer Realisierung über mehrere Wochen zu einem kritischen Deadline-Verzug!`);
    }

    tasks.push({ id: Date.now(), orderId: ot.orderId, orderTaskId: ot.id, resId: resObj.id, start: sD, end: eD, label: ot.label, type: Object.keys(configKeys) });
    ot.status = 'scheduled'; saveData(); closeModal(); 
    if(typeof refreshInboardWorklist === 'function') refreshInboardWorklist();
    if(typeof draw === 'function') draw();
}

// =========================================================================
// CRITICAL FIX: RE-INTEGRATION DER ANSICHTS- UND NAVI-FUNKTIONEN
// =========================================================================
function switchView(m) {
    viewMode = m; const isT = (m === 'TOUR');
    cStd.style.display = isT ? 'none' : 'block'; cTour.style.display = isT ? 'block' : 'none';
    
    if(document.getElementById('lbl-year')) document.getElementById('lbl-year').classList.toggle('active-view', m === 'MONTH');
    if(document.getElementById('lbl-month')) document.getElementById('lbl-month').classList.toggle('active-view', m === 'DAY');
    if(document.getElementById('lbl-tour')) document.getElementById('lbl-tour').classList.toggle('active-view', isT);
    
    window.onresize(); updateNav(); draw();
}

function updateNav() {
    const d = document.getElementById('period-display'); if(!d) return;
    d.innerText = (viewMode === 'TOUR') ? "Tour ab " + tourDate.toLocaleDateString() : (viewMode === 'HOUR' ? "Feinplanung Woche" : (viewMode === 'MONTH' ? "Jahr " + currentYear : i18n[lang].months[currentMonth] + " " + currentYear));
}

function navTime(delta) {
    if(viewMode==='TOUR') tourDate.setDate(tourDate.getDate() + delta);
    else if(viewMode==='MONTH') currentYear += delta;
    else { currentMonth += delta; if(currentMonth>11){currentMonth=0; currentYear++;} if(currentMonth<0){currentMonth=11; currentYear--;} }
    updateNav(); draw();
}

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

function addResourceTop() { techs.unshift({ id: Date.now(), name: "Neu", type: Object.keys(resTypes)[0] || "", parentId: null, regionId: "" }); saveData(); draw(); }

window.onload = () => {
    cStd = document.getElementById('canvasStandard'); cTour = document.getElementById('canvasTour'); spacer = document.getElementById('scroll-spacer');
    window.onresize = () => { if(cStd){ cStd.width = cTour.width = window.innerWidth; cStd.height = cTour.height = window.innerHeight; if(typeof draw === 'function') draw(); } };
    document.getElementById('view-container').onscroll = (e) => { scrollTop = e.target.scrollTop; if(typeof draw === 'function') draw(); };
    
    [cStd, cTour].forEach(c => { if(c) { 
        c.addEventListener('mousedown', handleMouseDown); 
        c.addEventListener('mousemove', handleMouseMove);
        c.addEventListener('dragover', e => e.preventDefault()); 
        c.addEventListener('drop', handleDrop);
    } });
    
    const splitter = document.getElementById('gantt-splitter');
    const wlPanel = document.getElementById('bottom-worklist-panel');
    let isResizingWL = false;
    if(splitter && wlPanel) {
        splitter.addEventListener('mousedown', (e) => { isResizingWL = true; splitter.classList.add('dragging'); e.preventDefault(); });
        window.addEventListener('mousemove', (e) => {
            if (!isResizingWL) return;
            let newHeight = window.innerHeight - e.clientY;
            if (newHeight > 80 && newHeight < window.innerHeight * 0.7) { wlPanel.style.height = newHeight + 'px'; window.onresize(); }
        });
        window.addEventListener('mouseup', () => { if (isResizingWL) { isResizingWL = false; splitter.classList.remove('dragging'); } });
    }
    window.onresize(); 
    switchView('MONTH'); // Initialisiert die App fehlerfrei im Jahresmodus
    if(typeof refreshInboardWorklist === 'function') refreshInboardWorklist();
};
