/**
 * js/modals/modal-order.js - Enterprise Compact (Vorgänge/Untervorgänge)
 */
let lastScrollPos = 0;

function openOrderList() {
    const modalEl = document.getElementById('modal-box').parentElement.querySelector('.modal');
    if(modalEl) modalEl.className = 'modal modal-xl'; 
    let rows = orders.map(o => `
        <tr onclick="openOrderEdit('${o.id}')">
            <td><b>${o.orderNr}</b></td>
            <td>${o.label || ''}</td>
            <td><span class="badge bg-ok">${orderTasks.filter(t => t.orderId == o.id).length} Vorgänge</span></td>
            <td style="text-align:right;">${o.priority || 'Normal'}</td>
        </tr>`).join('');
    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header"><button class="tab-btn active">📋 Service-Aufträge</button></div>
        <div class="modal-body active">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h3 style="margin:0;">Auftragsübersicht</h3>
                <button class="btn btn-add" onclick="openOrderEdit()">+ Neuer Auftrag</button>
            </div>
            <div class="addr-table-container">
                <table class="bc-table">
                    <thead><tr><th>Nr.</th><th>Bezeichnung</th><th>Umfang</th><th style="text-align:right;">Prio</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="4" style="text-align:center;">Keine Aufträge</td></tr>'}</tbody>
                </table>
            </div>
        </div>
        <div class="footer"><button class="btn" onclick="closeModal()">Schließen</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function openOrderEdit(id = null, activeTab = 'details') {
    const o = orders.find(x => x.id == id) || { id: Date.now().toString(), orderNr: "ORD-"+(orders.length+1001), label: "", customerId: "" };
    let myTasks = orderTasks.filter(ot => ot.orderId == o.id).sort((a,b) => (a.pos||"").localeCompare(b.pos||""));
    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header">
            <button class="tab-btn ${activeTab==='details'?'active':''}" onclick="saveScroll(); openOrderEdit('${o.id}', 'details')">🏠 Auftrag</button>
            <button class="tab-btn ${activeTab==='structure'?'active':''}" onclick="saveScroll(); openOrderEdit('${o.id}', 'structure')">📋 Struktur</button>
        </div>
        <div class="modal-body active" style="background:#f4f7f6;">
            ${activeTab === 'details' ? renderOrderDetails(o, myTasks) : renderStructureTable(myTasks)}
        </div>
        <div class="footer">
            <button class="btn btn-danger" onclick="deleteOrder('${o.id}')">Löschen</button>
            <button class="btn btn-add" onclick="saveOrder('${o.id}')">Speichern</button>
            <button class="btn" onclick="safeCloseModal()">Schließen</button>
        </div>`;
    const body = document.querySelector('.modal-body.active');
    if(body) body.scrollTop = lastScrollPos;
}

function renderOrderDetails(o, myTasks) {
    let custObj = addresses.find(a => a.id == o.customerId);
    return `
        <div class="bc-card">
            <div class="bc-card-header">Kopfdaten Auftraggeber</div>
            <div class="bc-card-body" oninput="isDirty=true">
                <div class="grid-2">
                    <div><label>Bezeichnung</label><input id="o-label" value="${o.label}"></div>
                    <div><label>Debitor (Region: ${custObj?.country || '-'})</label>
                         <div class="input-with-lookup"><input id="o-customer-disp" value="${custObj?custObj.addrNr+' '+custObj.city:''}" readonly><input type="hidden" id="o-customer-id" value="${o.customerId}"><button class="btn-lookup" onclick="lookupCustomer()">🔍</button></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="bc-card">
            <div class="bc-card-header" style="display:flex; justify-content:space-between;">
                <span>Vorgangsplanung (Einsätze)</span>
                <button class="btn btn-add" style="height:30px; font-size:12px;" onclick="addOrderTaskWithDefaults('${o.id}')">+ Neuer Vorgang</button>
            </div>
            <div class="bc-card-body" style="padding:0;">
                <table class="bc-table" style="table-layout: fixed; width: 100%;">
                    <thead>
                        <tr>
                            <th style="width:50px;">Pos</th>
                            <th style="width:280px;">Vorgang / Standort / Worklist</th>
                            <th>Untervorgänge (Detaillierte Aufgaben)</th>
                            <th style="width:40px;"></th>
                        </tr>
                    </thead>
                    <tbody>${myTasks.map(ot => renderTaskRow(ot)).join('')}</tbody>
                </table>
            </div>
        </div>`;
}

function renderTaskRow(ot) {
    let loc = addresses.find(a => a.id == ot.locationId);
    let mySubTasks = subTasks.filter(st => st.orderTaskId == ot.id).sort((a,b) => (a.pos||"").localeCompare(b.pos||""));
    const totalSoll = mySubTasks.reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
    const wlClass = ot.isInWorklist ? 'btn-memo-filled' : 'btn-memo-empty';

    return `
        <tr style="background:#fcfcfc;">
            <td><input type="text" value="${ot.pos}" onchange="updateOrderTask('${ot.id}','pos',this.value)" style="width:100%; border:none; background:transparent; font-weight:bold; text-align:center;"></td>
            <td>
                <div class="task-col-info">
                    <input type="text" value="${ot.label}" onchange="updateOrderTask('${ot.id}','label',this.value)" style="font-weight:bold; border:none; background:transparent; font-size:15px; width:100%;">
                    <div class="input-with-lookup">
                        <input style="font-size:11px; height:28px;" value="${loc?loc.city + ' ('+loc.addrNr+')' : 'Standort wählen...'}" readonly>
                        <button class="btn-lookup" style="height:28px; padding:0 6px;" onclick="lookupTaskLocation('${ot.id}')">🔍</button>
                    </div>
                    <div class="task-row-meta">
                        <span>Soll: <b style="color:#0078d4;">${totalSoll}h</b></span>
                        <button class="badge ${wlClass}" style="border:none; cursor:pointer;" onclick="toggleWorklistStatus('${ot.id}')">
                            ${ot.isInWorklist ? '📥 Worklist' : '⭕ Entwurf'}
                        </button>
                    </div>
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <div style="flex:1;"><label>Start-Fenster</label><input type="date" value="${ot.startDate || ''}" onchange="updateOrderTask('${ot.id}','startDate',this.value)" style="height:28px; font-size:11px;"></div>
                    </div>
                </div>
            </td>
            <td>
                ${mySubTasks.map(st => renderSubTaskMini(st, ot.locationId)).join('')}
                <button class="btn" style="height:26px; font-size:11px; background:#eee; color:#444; margin-top:5px;" onclick="addSubTaskWithDefaults('${ot.id}')">+ Untervorgang</button>
            </td>
            <td><button onclick="deleteOrderTask('${ot.id}','${ot.orderId}')" style="border:none; background:none; cursor:pointer; font-size:18px; color:#e74c3c;">🗑️</button></td>
        </tr>`;
}

function renderSubTaskMini(st, locId) {
    let eq = machines.find(m => m.id == st.equipmentId);
    const hasMemo = st.memo && st.memo.trim().length > 0;
    return `
        <div class="subtask-card">
            <span style="font-size:10px; color:#999;">${st.pos}</span>
            <input type="text" placeholder="Aufgabe..." value="${st.label}" onchange="updateSubTask('${st.id}','label',this.value)">
            <div class="st-hours-group">
                <label style="margin:0; font-size:10px;">h:</label>
                <input type="number" step="0.5" value="${st.hours || 0}" onchange="updateSubTask('${st.id}','hours',this.value)" style="width:45px; border:none; background:transparent; text-align:right; font-weight:bold;">
            </div>
            <button class="btn-lookup" style="width:100px; height:32px; font-size:11px;" onclick="lookupSubTaskEq('${st.id}', '${locId}')">${eq ? eq.mNr : '⚙️ Masch.'}</button>
            <button class="btn-memo ${hasMemo?'btn-memo-filled':'btn-memo-empty'}" style="width:32px; height:32px;" onclick="openMemoPopup('${st.id}')">📝</button>
            ${st.pos !== "0010" ? `<button onclick="deleteSubTask('${st.id}','${st.orderTaskId}')" style="border:none; background:none; cursor:pointer; color:#e74c3c;">🗑️</button>` : '<div></div>'}
        </div>`;
}

function toggleWorklistStatus(otId) {
    let ot = orderTasks.find(x => x.id == otId);
    if(ot) { ot.isInWorklist = !ot.isInWorklist; ot.status = ot.isInWorklist ? 'backlog' : 'draft'; saveData(); openOrderEdit(ot.orderId); }
}

function saveScroll() { const body = document.querySelector('.modal-body.active'); if(body) lastScrollPos = body.scrollTop; }
function addOrderTaskWithDefaults(orderId) {
    saveScroll();
    let existing = orderTasks.filter(t => t.orderId == orderId);
    let posStr = ((existing.length + 1) * 10).toString().padStart(4, '0');
    let otId = 'OT' + Date.now();
    orderTasks.push({ id: otId, orderId: orderId, pos: posStr, label: "Neuer Vorgang", locationId: "", totalHours: 0, hoursPerDay: 8, status: 'draft', isInWorklist: false, startDate: "" });
    subTasks.push({ id: 'ST' + Date.now(), orderTaskId: otId, pos: "0010", label: "Basis-Tätigkeit", memo: "", equipmentId: "", hours: 1 });
    saveData(); openOrderEdit(orderId);
}
function addSubTaskWithDefaults(otId) {
    saveScroll();
    let existing = subTasks.filter(s => s.orderTaskId == otId);
    let posStr = ((existing.length + 1) * 10).toString().padStart(4, '0');
    subTasks.push({ id: 'ST' + Date.now(), orderTaskId: otId, pos: posStr, label: "Zusatz", memo: "", equipmentId: "", hours: 0 });
    saveData(); openOrderEdit(orderTasks.find(x=>x.id==otId).orderId);
}
function updateSubTask(id, field, val) {
    let st = subTasks.find(x => x.id == id);
    if(st) { st[field] = (field === 'hours') ? parseFloat(val) : val; saveData(); if(field==='hours') openOrderEdit(orderTasks.find(x=>x.id==st.orderTaskId).orderId); }
}
function updateOrderTask(id, field, val) {
    let ot = orderTasks.find(x => x.id == id);
    if(ot) { ot[field] = (field.includes('hours') || field.includes('Day')) ? parseFloat(val) : val; saveData(); }
}
function lookupCustomer() {
    const data = addresses.filter(a => ["Konzern", "Kunde"].includes(a.type)).map(a => ({ id: a.id, code: a.addrNr, display: a.city, info: a.country || '' }));
    openLookup("Debitor wählen", data, (id, disp, code) => { document.getElementById('o-customer-id').value = id; document.getElementById('o-customer-disp').value = code + " " + disp; isDirty = true; });
}
function lookupTaskLocation(otId) {
    const data = addresses.map(a => ({ id: a.id, code: a.addrNr, display: a.city, info: a.type + " | " + (a.street || '') }));
    openLookup("Einsatzort wählen", data, (id) => { let ot = orderTasks.find(x => x.id == otId); if(ot) { ot.locationId = id; saveData(); openOrderEdit(ot.orderId); } });
}
function lookupSubTaskEq(stId, locId) {
    let data = machines.map(m => ({ id: m.id, code: m.mNr, display: m.label, info: m.addressId == locId ? "📍 Vor Ort" : "" }));
    openLookup("Equipment wählen", data, (id) => { let st = subTasks.find(x => x.id == stId); if(st) { st.equipmentId = id; saveData(); openOrderEdit(orderTasks.find(x=>x.id==st.orderTaskId).orderId); } });
}
function openMemoPopup(stId) {
    let st = subTasks.find(x => x.id == stId);
    openLookup("Langtext bearbeiten", [], () => {}, true);
    document.getElementById('lookup-box').innerHTML = `
        <div class="tab-header"><button class="tab-btn active">📝 Memo: ${st.pos}</button></div>
        <div class="modal-body active">
            <textarea id="temp-memo" style="width:100%; height:300px; padding:15px; border:1
