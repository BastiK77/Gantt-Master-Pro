/**
 * js/modals/modal-task.js - Enterprise Einsatz-Zentrale & Rückmelde-Terminal
 * FIX: Übergibt den korrekten Variablen-String 'orderId' an die Großmasken-Schnittstelle.
 */
function openTaskModal(t) {
    if (!t) return;
    editingObj = t;
    isDirty = false;

    let orderObj = orders.find(o => o.id == t.orderId);
    let taskObj = orderTasks.find(ot => ot.id == t.orderTaskId);
    let customerAddr = orderObj ? addresses.find(a => a.id == orderObj.customerId) : null;
    let locationAddr = taskObj ? addresses.find(a => a.id == taskObj.locationId) : null;
    let titleText = orderObj ? `Einsatz-Rückmeldung: ${orderObj.orderNr}` : "Ungeplanter / Freier Einsatz";

    const modalEl = document.getElementById('modal-box').parentElement.querySelector('.modal');
    if(modalEl) modalEl.className = 'modal modal-xl';

    let mySubTasks = taskObj ? subTasks.filter(st => st.orderTaskId == taskObj.id).sort((a,b) => (a.pos||"").localeCompare(b.pos||"")) : [];

    let subTaskRows = mySubTasks.map(st => {
        let eqObj = machines.find(m => m.id == st.equipmentId);
        let GlenMemo = st.memo && st.memo.trim().length > 0;
        
        if (st.actualHours === undefined) st.actualHours = 0;
        if (st.isDone === undefined) st.isDone = false;
        if (st.feedbackText === undefined) st.feedbackText = "";

        return `
            <div class="bc-card" style="margin-bottom: 10px; border-left: 4px solid ${st.isDone ? '#27ae60' : '#f39c12'};">
                <div style="padding: 10px; display: flex; align-items: center; justify-content: space-between; background: #fdfdfd; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                        <input type="checkbox" ${st.isDone ? 'checked' : ''} onchange="isDirty=true; updateSubTaskFeedback('${st.id}', 'isDone', this.checked); openTaskModal(editingObj);" style="width: 20px; height: 20px; cursor: pointer; margin: 0;">
                        <span style="font-weight: bold; color: #555; width: 45px;">${st.pos}</span>
                        <span style="font-size: 15px; font-weight: 600; color: ${st.isDone ? '#27ae60' : '#2c3e50'};">${st.label}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="badge" style="background: #16a085; font-size: 11px; padding: 6px 10px;">⚙️ ${eqObj ? eqObj.mNr : 'Kein Equipment'}</span>
                        <div class="st-hours-group" style="height: 34px; background: #fff;">
                            <label style="margin:0; font-size:11px; color:#27ae60;">Ist-h:</label>
                            <input type="text" inputmode="decimal" value="${st.actualHours}" onchange="isDirty=true; updateSubTaskFeedback('${st.id}', 'actualHours', parseFloat(this.value) || 0);" style="width: 45px; border: none; background: transparent; font-weight: bold; text-align: center; color: #27ae60; height: 100%;">
                        </div>
                    </div>
                </div>
                <div style="padding: 10px; background: #fff; display: flex; flex-direction: column; gap: 8px;">
                    ${GlenMemo ? `<details style="background: #f8f9fa; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e5e7;"><summary style="font-size: 12px; color: #0078d4; font-weight: bold; cursor: pointer; user-select: none;">📋 Technische Arbeitsanweisung einblenden</summary><div style="margin-top: 6px; font-size: 13px; color: #555; white-space: pre-wrap; padding-left: 10px; border-left: 2px solid #0078d4;">${st.memo}</div></details>` : ''}
                    <div>
                        <label style="font-size: 10px; color: #7f8c8d; margin-bottom: 2px;">Befundbericht / Techniker-Rückmeldetext</label>
                        <textarea placeholder="Geben Sie hier Ihren technischen Befund ein..." onchange="isDirty=true; updateSubTaskFeedback('${st.id}', 'feedbackText', this.value);" style="width: 100%; height: 45px; padding: 8px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 13px; resize: vertical; box-sizing: border-box;">${st.feedbackText || ''}</textarea>
                    </div>
                </div>
            </div>`;
    }).join('');

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header"><button type="button" class="tab-btn active">📅 ${titleText}</button></div>
        <div class="modal-body active" style="background:#f4f7f6; padding:25px; display:flex; flex-direction:column; gap:20px;">
            <div class="bc-card" style="background: #fff;">
                <div class="bc-card-header">🔗 Projekt- & Auftragszuordnung</div>
                <div class="bc-card-body">
                    <div style="display:flex; gap:15px; align-items:flex-end;">
                        <div style="flex:1;">
                            <label>Zugeordneter Service-Auftrag (Proj.-Nr.)</label>
                            <div class="input-with-lookup">
                                <input type="text" id="t-order-disp" value="${orderObj ? `${orderObj.orderNr} - ${orderObj.label}` : 'Keine Zuordnung (Freier Einsatz)'}" readonly>
                                <button type="button" class="btn-lookup" onclick="lookupTaskOrderAssociation('${t.id}')">🔍</button>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <!-- FIX: Nutzt jetzt fehlerfrei orderObj.id anstelle der falschen Variablenkette -->
                            ${orderObj ? `<button type="button" class="btn btn-order" onclick="jumpDirectToOrder('${orderObj.id}')" style="height:38px;">📝 Auftrag öffnen</button>` : ''}
                            <button type="button" class="btn btn-add" style="background:#2980b9; height:38px;" onclick="openAdHocOrderCreation('${t.id}')">⚡ Neuer Auftrag (Großmaske)</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid-2">
                <div class="bc-card" style="margin-bottom:0;"><div class="bc-card-header">🏢 Rechnungsempfänger (Debitor)</div><div class="bc-card-body" style="background:#fafafa; min-height:85px; font-size:13px; line-height:1.4;">${customerAddr ? `<b>${customerAddr.company || 'Firma'}</b> (${customerAddr.addrNr})<br>${customerAddr.street || ''}<br>${customerAddr.zip || ''} ${customerAddr.city || ''}` : '<span style="color:#999; font-style:italic;">Kein Auftraggeber verknüpft</span>'}</div></div>
                <div class="bc-card" style="margin-bottom:0;"><div class="bc-card-header">📍 Einsatzadresse (Vorgangs-Standort)</div><div class="bc-card-body" style="background:#fafafa; min-height:85px; font-size:13px; line-height:1.4;">${locationAddr ? `<b>${locationAddr.city || ''}</b> (${locationAddr.addrNr})<br>${locationAddr.street || ''}<br>${locationAddr.zip || ''} ${locationAddr.city || ''}` : '<span style="color:#999; font-style:italic;">Kein spezifischer Einsatzort hinterlegt</span>'}</div></div>
            </div>
            <div class="bc-card">
                <div class="bc-card-header">Einsatzparameter & Terminierung</div>
                <div class="bc-card-body" oninput="isDirty=true">
                    <div class="grid-2">
                        <div><label>Einsatzbezeichnung (Gantt-Text)</label><input type="text" id="t-label" value="${t.label || (taskObj ? taskObj.label : '')}"></div>
                        <div><label>Planungskennung (Balkenfarbe)</label><select id="t-type">${Object.entries(configKeys).map(([k,v]) => `<option value="${k}" ${t.type == k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
                    </div>
                    <div class="grid-2" style="margin-top:15px;">
                        <div><label>Arbeitsbeginn</label><input type="datetime-local" id="t-start" value="${formatDateToLocalInput(t.start)}"></div>
                        <div><label>Arbeitsende</label><input type="datetime-local" id="t-end" value="${formatDateToLocalInput(t.end)}"></div>
                    </div>
                </div>
            </div>
            <div class="bc-card" style="flex: 1; display: flex; flex-direction: column; min-height: 220px;">
                <div class="bc-card-header" style="display:flex; justify-content:space-between; align-items:center;"><span>Technisches Rückmelde-Protokoll</span><span style="font-size:11px; color:#27ae60; font-weight:bold; background:#e8f5e9; padding:2px 8px; border-radius:4px;">Löschen gesperrt</span></div>
                <div class="bc-card-body" style="flex:1; overflow-y:auto; background:#f8f9fa; padding:15px;">${subTaskRows || `<div style="text-align:center; padding:30px; color:#7f8c8d;">Diesem Vorgang sind keine technischen Untervorgänge hinterlegt.</div>`}</div>
            </div>
        </div>
        <div class="footer">
            <button type="button" class="btn btn-danger" style="margin-right:auto;" onclick="deleteTaskFromGantt('${t.id}')">Einsatz stornieren</button>
            <button type="button" class="btn btn-add" onclick="saveTaskModalData('${t.id}')">💾 Rückmeldung speichern</button>
            <button type="button" class="btn" onclick="safeCloseModal()">Abbrechen</button>
        </div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function jumpDirectToOrder(orderId) {
    if (typeof openOrderEdit === 'function') {
        closeModal(); 
        setTimeout(() => { openOrderEdit(orderId, 'details'); }, 60);
    }
}

function openAdHocOrderCreation(taskId) {
    let t = tasks.find(x => x.id == taskId);
    if (!t) return;
    closeModal(); 
    setTimeout(() => {
        if (typeof openOrderEdit === 'function') {
            openOrderEdit(null, 'details');
            window.activeAdHocGanttTask = t;
        }
    }, 60);
}

function lookupTaskOrderAssociation(taskId) {
    let t = tasks.find(x => x.id == taskId);
    if (!t) return;
    let data = orders.map(o => ({ id: o.id, code: o.orderNr, display: o.label, info: "Zuweisen" }));
    if(typeof openLookup === 'function') {
        openLookup("Auftrag verknüpfen", data, (orderId) => {
            let firstOt = orderTasks.find(ot => ot.orderId == orderId);
            t.orderId = orderId;
            if(firstOt) {
                t.orderTaskId = firstOt.id;
                t.label = firstOt.label;
                firstOt.status = 'scheduled';
            }
            saveData(); openTaskModal(t); 
        });
    }
}

function updateSubTaskFeedback(subTaskId, field, value) {
    let st = subTasks.find(x => x.id == subTaskId);
    if (st) {
        st[field] = value;
        localStorage.setItem('gantt_subtasks', JSON.stringify(subTasks));
    }
}

function saveTaskModalData(id) {
    let t = tasks.find(x => x.id == id);
    if (!t) return;
    t.label = document.getElementById('t-label').value;
    t.type = document.getElementById('t-type').value;
    t.start = new Date(document.getElementById('t-start').value);
    t.end = new Date(document.getElementById('t-end').value);
    if (t.orderTaskId) {
        let ot = orderTasks.find(x => x.id == t.orderTaskId);
        if (ot) ot.startDate = document.getElementById('t-start').value.split('T');
    }
    saveData(); isDirty = false; closeModal();
    if (typeof draw === 'function') draw();
}

function deleteTaskFromGantt(id) {
    let t = tasks.find(x => x.id == id);
    if (!t) return;
    if (confirm("Einsatz stornieren?")) {
        if (t.orderTaskId) {
            let ot = orderTasks.find(x => x.id == t.orderTaskId);
            if (ot) ot.status = 'backlog'; 
        }
        tasks = tasks.filter(x => x.id != id);
        saveData(); closeModal();
        if (typeof draw === 'function') draw();
    }
}

function formatDateToLocalInput(date) {
    if (!date) return "";
    let d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
}
