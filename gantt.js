/** 1. DATEN & PERSISTENZ **/
let lang = localStorage.getItem('gantt_lang') || 'de';
let tempLang = lang;

const i18n = {
    de: { year: "Jahr", month: "Monat", tour: "Tour", res: "RESSOURCEN", add: "Ressource", save: "Speichern", delete: "Löschen", done: "Fertig", config: "Konfig", t_label: "Kennungen", t_res: "Ressourcentypen", t_sys: "System", t_addr: "Adressen", name: "Bezeichnung", start: "Beginn", end: "Ende",
          help_title: "Hilfe", h_mouse: "• <b>Linksklick</b>: Details öffnen", h_shift: "• <b>Shift + Ziehen</b>: Neu", h_strg: "• <b>Strg + Ziehen</b>: Kopie", h_resize: "• <b>Rand ziehen</b>: Resize (nicht in Tour)", h_team: "• <b>Teams</b>: Ressourcen im Modal unterordnen.",
          months: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'] },
    en: { year: "Year", month: "Month", tour: "Tour", res: "RESOURCES", add: "Resource", save: "Save", delete: "Delete", done: "Done", config: "Config", t_label: "Labels", t_res: "Resource Types", t_sys: "System", t_addr: "Addresses", name: "Label", start: "Start", end: "End",
          help_title: "Help", h_mouse: "• <b>Left Click</b>: Open details", h_shift: "• <b>Shift + Drag</b>: Create new", h_strg: "• <b>Ctrl + Drag</b>: Copy", h_resize: "• <b>Drag edges</b>: Resize (not in Tour)", h_team: "• <b>Teams</b>: Nest resources in modal.",
          months: ['January','February','March','April','May','June','July','August','September','October','November','December'] }
};

let configKeys = JSON.parse(localStorage.getItem('gantt_config_keys')) || { projekt: { label: "Projekt", color: "#3498db" }, wartung: { label: "Wartung", color: "#95a5a6" } };
let resTypes = JSON.parse(localStorage.getItem('gantt_res_types')) || { worker: { label: "Mitarbeiter", color: "#ffffff" }, vehicle: { label: "Fahrzeug", color: "#e1f5fe" } };
let countries = JSON.parse(localStorage.getItem('gantt_countries')) || ["Deutschland", "Österreich", "Schweiz"];
let addresses = JSON.parse(localStorage.getItem('gantt_addresses')) || [];
let techs = JSON.parse(localStorage.getItem('gantt_techs')) || [{ id: 1, name: "TEAM 1", type: "worker", parentId: null }];
let tasks = (JSON.parse(localStorage.getItem('gantt_tasks')) || []).map(t => ({ ...t, start: new Date(t.start), end: new Date(t.end) }));

function saveData() {
    lang = tempLang;
    localStorage.setItem('gantt_config_keys', JSON.stringify(configKeys));
    localStorage.setItem('gantt_res_types', JSON.stringify(resTypes));
    localStorage.setItem('gantt_techs', JSON.stringify(techs));
    localStorage.setItem('gantt_tasks', JSON.stringify(tasks));
    localStorage.setItem('gantt_addresses', JSON.stringify(addresses));
    localStorage.setItem('gantt_countries', JSON.stringify(countries));
    localStorage.setItem('gantt_lang', lang);
}

/** 2. ENGINES **/
const UI = { headerW: 240, rowH: 45, topM: 60 };
let viewMode = 'MONTH', currentYear = new Date().getFullYear(), currentMonth = new Date().getMonth(), tourDate = new Date();
tourDate.setHours(0,0,0,0);
let scrollTop = 0, activeTask = null, isNew = false, isDragging = false, isResizingEnd = false, isResizingStart = false, mouseDownTime = 0;

const cStd = document.getElementById('canvasStandard'), cTour = document.getElementById('canvasTour'), spacer = document.getElementById('scroll-spacer');

const StandardEngine = {
    dateToX: (date) => {
        const units = viewMode === 'MONTH' ? 12 : new Date(currentYear, currentMonth + 1, 0).getDate();
        const dStart = viewMode === 'MONTH' ? new Date(currentYear, 0, 1) : new Date(currentYear, currentMonth, 1);
        return UI.headerW + ((date - dStart) / 86400000 / (viewMode === 'MONTH' ? 30.44 : 1)) * ((cStd.width - UI.headerW) / units);
    },
    xToDate: (x) => {
        const units = viewMode === 'MONTH' ? 12 : 31;
        const dStart = viewMode === 'MONTH' ? new Date(currentYear, 0, 1) : new Date(currentYear, currentMonth, 1);
        return new Date(dStart.getTime() + (x - UI.headerW) / ((cStd.width - UI.headerW) / units) * (viewMode === 'MONTH' ? 30.44 : 1) * 86400000);
    }
};

const TourEngine = {
    dateToX: (date, isEnd = false) => {
        const unitW = (cTour.width - UI.headerW) / 3;
        let d = new Date(date); if (isEnd) d.setHours(23,59,59); else d.setHours(0,0,0,0);
        return UI.headerW + ((d - tourDate.getTime()) / 86400000) * unitW;
    },
    xToDate: (x) => {
        const days = (x - UI.headerW) / ((cTour.width - UI.headerW) / 3);
        return new Date(tourDate.getTime() + days * 86400000);
    }
};

/** 3. DRAW LOGIC **/
function calculateStacking() {
    const isTour = viewMode === 'TOUR';
    techs.forEach(res => res.slots = 1);
    tasks.forEach(t => t.slot = 0);
    techs.forEach((res) => {
        let resTasks = tasks.filter(t => t.resId === res.id).sort((a,b) => a.start - b.start);
        let slots = [];
        resTasks.forEach(t => {
            let placed = false, startComp = isTour ? new Date(t.start).setHours(0,0,0,0) : t.start.getTime();
            for(let i=0; i<slots.length; i++) {
                if (slots[i] <= startComp) { t.slot = i; slots[i] = isTour ? new Date(t.end).setHours(23,59,59) : t.end.getTime(); placed = true; break; }
            }
            if(!placed) { t.slot = slots.length; slots.push(isTour ? new Date(t.end).setHours(23,59,59) : t.end.getTime()); }
        });
        res.slots = Math.max(1, slots.length);
    });
}

function getY(idx) { let y = 0; for(let i=0; i<idx; i++) y += (techs[i].slots || 1) * UI.rowH; return y; }

function draw() {
    calculateStacking();
    const isTour = viewMode === 'TOUR', activeCanvas = isTour ? cTour : cStd;
    if(!activeCanvas) return;
    const ctx = activeCanvas.getContext('2d'), engine = isTour ? TourEngine : StandardEngine;
    const units = isTour ? 3 : (viewMode === 'MONTH' ? 12 : new Date(currentYear, currentMonth + 1, 0).getDate());
    const unitW = (activeCanvas.width - UI.headerW) / units, totalH = getY(techs.length);
    spacer.style.height = (totalH + UI.topM) + "px";

    ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    ctx.save(); ctx.translate(0, UI.topM - scrollTop);
    
    techs.forEach((res, i) => {
        let y = getY(i), h = res.slots * UI.rowH;
        ctx.fillStyle = resTypes[res.type]?.color || "#fff"; ctx.fillRect(UI.headerW, y, activeCanvas.width - UI.headerW, h);
        ctx.fillStyle = "#fafafa"; ctx.fillRect(0, y, UI.headerW, h);
        ctx.strokeStyle = "#ddd"; ctx.strokeRect(0, y, UI.headerW, h);
    });

    for(let i=0; i<=units; i++) {
        let x = UI.headerW + i * unitW, d = isTour ? new Date(tourDate.getTime() + i*86400000) : new Date(currentYear, currentMonth, i+1);
        if((viewMode === 'DAY' || isTour) && i < units && (d.getDay() === 0 || d.getDay() === 6)) { ctx.fillStyle = "rgba(0,0,0,0.05)"; ctx.fillRect(x, 0, unitW, totalH); }
        ctx.strokeStyle = "#eee"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, totalH); ctx.stroke();
    }

    techs.forEach((res, i) => {
        let y = getY(i), h = res.slots * UI.rowH;
        ctx.strokeStyle = "#eee"; ctx.beginPath(); ctx.moveTo(UI.headerW, y+h); ctx.lineTo(activeCanvas.width, y+h); ctx.stroke();
        if (res.parentId) {
            ctx.strokeStyle = "#3498db"; ctx.lineWidth = 2; ctx.beginPath();
            let pIdx = techs.findIndex(t => t.id === res.parentId);
            if(pIdx!==-1) { ctx.moveTo(20, getY(pIdx)+22); ctx.lineTo(20, y+22); ctx.lineTo(35, y+22); ctx.stroke(); }
            ctx.lineWidth = 1;
        }
        ctx.fillStyle = "#333"; ctx.font = "bold 12px sans-serif"; ctx.fillText(res.name, res.parentId?45:15, y+28);
    });

    tasks.forEach(t => {
        let rIdx = techs.findIndex(r => r.id === t.resId); if(rIdx===-1) return;
        let x1 = engine.dateToX(t.start), x2 = engine.dateToX(t.end, true), y = getY(rIdx) + (t.slot * UI.rowH) + 10;
        ctx.fillStyle = (t === activeTask) ? "#e67e22" : (configKeys[t.type]?.color || "#3498db");
        const drawX = Math.max(UI.headerW, x1), drawW = Math.max(5, x2 - drawX);
        if(x1 < activeCanvas.width && x2 > UI.headerW) {
            ctx.fillRect(drawX, y, drawW, UI.rowH - 20);
            if(drawW > 25) { 
                ctx.fillStyle="white"; ctx.font="bold 10px sans-serif"; 
                let label = isTour ? t.start.getHours() + ":" + t.start.getMinutes().toString().padStart(2,'0') + " | " + t.label : t.label;
                ctx.fillText(label, drawX+5, y+18); 
            }
        }
    });
    ctx.restore();

    ctx.fillStyle = "#2c3e50"; ctx.fillRect(0, 0, activeCanvas.width, UI.topM);
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(UI.headerW, 0, activeCanvas.width - UI.headerW, UI.topM);
    ctx.fillStyle = "white"; ctx.font = "bold 12px sans-serif"; ctx.fillText(i18n[lang].res, 15, 35);
    for(let i=0; i<units; i++) {
        let x = UI.headerW + i * unitW, d = isTour ? new Date(tourDate.getTime() + i*86400000) : new Date(currentYear, currentMonth, i+1);
        ctx.fillStyle = "#7f8c8d"; ctx.strokeStyle = "#ddd"; ctx.strokeRect(x, 0, unitW, UI.topM);
        if (viewMode === 'MONTH') { ctx.font = "bold 11px sans-serif"; ctx.fillText(i18n[lang].months[i], x + 10, 35); }
        else { 
            ctx.font = "9px sans-serif"; ctx.fillText(new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-US', {weekday:'short'}).format(d), x+8, 22);
            ctx.font = "bold 11px sans-serif"; ctx.fillText(d.getDate() + (isTour ? "." + (d.getMonth()+1) + "." : "."), x+8, 42);
        }
    }
}

/** 4. INTERACTION **/
function handleMouseDown(e) {
    const rect = e.target.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top + scrollTop;
    const engine = viewMode === 'TOUR' ? TourEngine : StandardEngine;
    let cY = my - UI.topM; mouseDownTime = Date.now();
    isDragging = isNew = isResizingStart = isResizingEnd = false;
    let resIdx = techs.findIndex((r, i) => cY >= getY(i) && cY < getY(i+1 || 9999));
    if (mx < UI.headerW && my > UI.topM && techs[resIdx]) { openResModal(resIdx); return; }
    if (e.shiftKey && techs[resIdx] && mx > UI.headerW) {
        activeTask = { id: Date.now(), start: engine.xToDate(mx), end: new Date(engine.xToDate(mx).getTime() + 7200000), resId: techs[resIdx].id, label: "Neu", type: Object.keys(configKeys)[0] };
        tasks.push(activeTask); isResizingEnd = isNew = true; draw(); return;
    }
    activeTask = tasks.find(t => {
        let rIdx = techs.findIndex(r => r.id === t.resId); if(rIdx===-1) return false;
        let x1 = engine.dateToX(t.start), x2 = engine.dateToX(t.end, true), y = getY(rIdx) + (t.slot * UI.rowH);
        if (mx >= x1 && mx <= x2 && cY >= y && cY <= y + UI.rowH) {
            let pct = (mx - x1) / (x2 - x1);
            if (viewMode !== 'TOUR' && pct < 0.15) isResizingStart = true; else if (viewMode !== 'TOUR' && pct > 0.85) isResizingEnd = true; else isDragging = true;
            return true;
        }
    });
    if (activeTask) {
        if(e.ctrlKey && isDragging) { let c = JSON.parse(JSON.stringify(activeTask)); c.id = Date.now(); c.start = new Date(c.start); c.end = new Date(c.end); tasks.push(c); activeTask = c; }
        activeTask.dragOffset = mx - engine.dateToX(activeTask.start);
    }
}

function handleMouseMove(e) {
    if(!activeTask) return;
    const rect = e.target.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top + scrollTop;
    const engine = viewMode === 'TOUR' ? TourEngine : StandardEngine;
    if (isResizingEnd) activeTask.end = engine.xToDate(mx);
    else if (isResizingStart) activeTask.start = engine.xToDate(mx);
    else if (isDragging) {
        let dur = activeTask.end - activeTask.start;
        activeTask.start = engine.xToDate(mx - activeTask.dragOffset); activeTask.end = new Date(activeTask.start.getTime() + dur);
        let rIdx = techs.findIndex((r, i) => (my - UI.topM) >= getY(i) && (my - UI.topM) < getY(i+1 || 9999));
        if (techs[rIdx]) activeTask.resId = techs[rIdx].id;
    }
    draw();
}

/** 5. MODALS **/
function openGlobalConfig(tab = 'task') {
    let keysH = Object.entries(configKeys).map(([k, v]) => `<div class="config-row"><input type="text" value="${v.label}" onchange="configKeys['${k}'].label=this.value"><input type="color" value="${v.color}" onchange="configKeys['${k}'].color=this.value"><button class="btn btn-danger" onclick="delete configKeys['${k}']; openGlobalConfig('task');">x</button></div>`).join('');
    let typesH = Object.entries(resTypes).map(([k, v]) => `<div class="config-row"><input type="text" value="${v.label}" onchange="resTypes['${k}'].label=this.value"><input type="color" value="${v.color}" onchange="resTypes['${k}'].color=this.value"><button class="btn btn-danger" onclick="delete resTypes['${k}']; openGlobalConfig('res');">x</button></div>`).join('');
    let ctryH = countries.map((c, i) => `<div class="config-row"><input type="text" value="${c}" onchange="countries[${i}]=this.value"><button class="btn btn-danger" onclick="countries.splice(${i},1); openGlobalConfig('ctry');">x</button></div>`).join('');
    document.getElementById('modal-box').innerHTML = `<div class="tab-header"><button class="tab-btn ${tab==='task'?'active':''}" onclick="openGlobalConfig('task')">${i18n[lang].t_label}</button><button class="tab-btn ${tab==='res'?'active':''}" onclick="openGlobalConfig('res')">${i18n[lang].t_res}</button><button class="tab-btn ${tab==='ctry'?'active':''}" onclick="openGlobalConfig('ctry')">Länder</button><button class="tab-btn ${tab==='sys'?'active':''}" onclick="openGlobalConfig('sys')">${i18n[lang].t_sys}</button></div>
        <div class="modal-body ${tab==='task'?'active':''}"><h4>Kennungen</h4>${keysH}<button class="btn btn-add" onclick="configKeys['id_'+Date.now()]={label:'Neu',color:'#3498db'}; openGlobalConfig('task');">+ Add</button></div>
        <div class="modal-body ${tab==='res'?'active':''}"><h4>Ressourcentypen</h4>${typesH}<button class="btn btn-add" onclick="resTypes['id_'+Date.now()]={label:'Neu',color:'#ffffff'}; openGlobalConfig('res');">+ Add</button></div>
        <div class="modal-body ${tab==='ctry'?'active':''}"><h4>Länder</h4>${ctryH}<button class="btn btn-add" onclick="countries.push('Neu'); openGlobalConfig('ctry');">+ Add</button></div>
        <div class="modal-body ${tab==='sys'?'active':''}"><h4>Language</h4><select onchange="tempLang=this.value;"><option value="de" ${lang==='de'?'selected':''}>Deutsch</option><option value="en" ${lang==='en'?'selected':''}>English</option></select></div>
        <div class="footer"><button class="btn" onclick="saveData(); closeModal(); location.reload();">${i18n[lang].done}</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function openAddressList() {
    let listH = addresses.map(a => `<div class="address-item" onclick="openAddressEdit('${a.id}')"><b>${a.addrNr}</b>: ${a.street}, ${a.city}</div>`).join('');
    document.getElementById('modal-box').innerHTML = `<div class="tab-header"><button class="tab-btn active">${i18n[lang].t_addr}</button></div><div class="modal-body active"><button class="btn btn-add" onclick="openAddressEdit()">+ New</button><hr>${listH || '...'}</div><div class="footer"><button class="btn" onclick="closeModal()">${i18n[lang].done}</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function openAddressEdit(id = null) {
    let a = addresses.find(x => x.id == id) || { id: Date.now(), addrNr: "ADR-"+(addresses.length+1), street: "", zip: "", city: "", country: countries[0], mail: "" };
    document.getElementById('modal-box').innerHTML = `<div class="modal-body active"><h4>Adresse</h4><div class="grid-2"><div><label>Nr</label><input id="a-nr" value="${a.addrNr}"></div><div><label>Mail</label><input id="a-mail" value="${a.mail}"></div></div><label>Strasse</label><input id="a-street" value="${a.street}"><div class="grid-2"><div><label>PLZ</label><input id="a-zip" value="${a.zip}"></div><div><label>Ort</label><input id="a-city" value="${a.city}"></div></div><label>Land</label><select id="a-country">${countries.map(c=>`<option ${a.country==c?'selected':''}>${c}</option>`).join('')}</select></div><div class="footer"><button class="btn btn-danger" onclick="addresses=addresses.filter(x=>x.id!=${a.id});saveData();openAddressList();">Delete</button><button class="btn btn-add" onclick="saveAddr('${a.id}')">Save</button></div>`;
}

function saveAddr(id) {
    let a = { id, addrNr: document.getElementById('a-nr').value, street: document.getElementById('a-street').value, zip: document.getElementById('a-zip').value, city: document.getElementById('a-city').value, country: document.getElementById('a-country').value, mail: document.getElementById('a-mail').value };
    let idx = addresses.findIndex(x => x.id == id); if(idx > -1) addresses[idx] = a; else addresses.push(a); saveData(); openAddressList();
}

function openHelp() {
    const l = i18n[lang];
    document.getElementById('modal-box').innerHTML = `<div class="modal-body active"><h4>${l.help_title}</h4><p>${l.h_mouse}</p><p>${l.h_shift}</p><p>${l.h_strg}</p><p>${l.h_resize}</p><hr><p>${l.h_team}</p></div><div class="footer"><button class="btn" onclick="closeModal()">${l.done}</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function openResModal(idx) {
    editingObj = { ...techs[idx], idx };
    document.getElementById('modal-box').innerHTML = `<div class="modal-body active"><h4>Ressource</h4><label>Name</label><input id="r-name" value="${techs[idx].name}"><label>Typ</label><select id="r-type">${Object.entries(resTypes).map(([k,v])=>`<option value="${k}" ${techs[idx].type===k?'selected':''}>${v.label}</option>`).join('')}</select><label>Team</label><select id="r-parent"><option value="">-</option>${techs.filter(r=>r.id!==techs[idx].id).map(r=>`<option value="${r.id}" ${techs[idx].parentId==r.id?'selected':''}>${r.name}</option>`).join('')}</select></div><div class="footer"><button class="btn btn-danger" onclick="tasks=tasks.filter(t=>t.resId!==techs[${idx}].id); techs.splice(${idx},1); saveData(); closeModal(); draw();">Delete</button><button class="btn btn-add" onclick="saveRes()">Save</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function openTaskModal(t) {
    editingObj=t; const toIso=(d)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    document.getElementById('modal-box').innerHTML = `<div class="modal-body active"><h4>Task</h4><label>Name</label><input id="m-label" value="${t.label}"><label>Type</label><select id="m-type">${Object.entries(configKeys).map(([k,v])=>`<option value="${k}" ${t.type===k?'selected':''}>${v.label}</option>`).join('')}</select><label>Start</label><input type="datetime-local" id="m-start" value="${toIso(t.start)}"><label>End</label><input type="datetime-local" id="m-end" value="${toIso(t.end)}"></div><div class="footer"><button class="btn btn-danger" onclick="tasks=tasks.filter(x=>x!==editingObj);saveData();closeModal();draw();">Delete</button><button class="btn" onclick="saveTask()">Save</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

/** 6. ACTIONS **/
function saveRes() { let r=techs[editingObj.idx]; r.name=document.getElementById('r-name').value; r.type=document.getElementById('r-type').value; r.parentId=document.getElementById('r-parent').value?parseInt(document.getElementById('r-parent').value):null; let sorted=[]; let p=techs.filter(t=>t.parentId===null); p.forEach(x=>{sorted.push(x);techs.filter(c=>c.parentId===x.id).forEach(c=>sorted.push(c));}); techs=sorted; saveData(); closeModal(); draw(); }
function saveTask() { editingObj.label=document.getElementById('m-label').value; editingObj.type=document.getElementById('m-type').value; editingObj.start=new Date(document.getElementById('m-start').value); editingObj.end=new Date(document.getElementById('m-end').value); saveData(); closeModal(); draw(); }
function switchView(m) { viewMode = m; cStd.classList.toggle('active', m !== 'TOUR'); cTour.classList.toggle('active', m === 'TOUR'); updateNav(); draw(); }
function navTime(d) { if(viewMode==='TOUR') tourDate.setDate(tourDate.getDate()+d); else if(viewMode==='MONTH') currentYear+=d; else { currentMonth+=d; if(currentMonth>11){currentMonth=0;currentYear++;} if(currentMonth<0){currentMonth=11;currentYear--;} } updateNav(); draw(); }
function updateNav() { document.getElementById('period-display').innerText = viewMode==='TOUR' ? tourDate.toLocaleDateString(lang==='de'?'de-DE':'en-US') : (viewMode==='MONTH' ? currentYear : i18n[lang].months[currentMonth]+" "+currentYear); document.getElementById('lbl-year').innerText = i18n[lang].year; document.getElementById('lbl-month').innerText = i18n[lang].month; document.getElementById('lbl-tour').innerText = i18n[lang].tour; document.getElementById('lbl-add').innerText = i18n[lang].add + ' 👤+'; document.getElementById('lbl-conf').innerText = '⚙️'; document.getElementById('lbl-year').classList.toggle('active-view', viewMode === 'MONTH'); document.getElementById('lbl-month').classList.toggle('active-view', viewMode === 'DAY'); document.getElementById('lbl-tour').classList.toggle('active-view', viewMode === 'TOUR'); }
function addResourceTop() { techs.unshift({ id: Date.now(), name: "Neu", type: Object.keys(resTypes)[0], parentId: null }); saveData(); draw(); }
function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

/** 7. INIT **/
window.onresize = () => { cStd.width = cTour.width = window.innerWidth; cStd.height = cTour.height = window.innerHeight; draw(); };
document.getElementById('view-container').onscroll = (e) => { scrollTop = e.target.scrollTop; cStd.style.top = cTour.style.top = scrollTop + "px"; draw(); };
[cStd, cTour].forEach(c => { c.addEventListener('mousedown', handleMouseDown); c.addEventListener('mousemove', handleMouseMove); });
window.addEventListener('mouseup', () => { if (activeTask && (Date.now() - mouseDownTime < 200)) openTaskModal(activeTask); activeTask = null; draw(); });
window.onload = () => { window.onresize(); updateNav(); switchView('MONTH'); };
