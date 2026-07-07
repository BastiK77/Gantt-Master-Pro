/**
 * order-tasks.js - Vorgänge mit hierarchischer Regionswahl
 */

function renderOrderDetails(o, myTasks) {
    let custObj = addresses.find(a => a.id == o.customerId);
    return `
        <div class="bc-card">
            <div class="bc-card-header">Kopfdaten Auftraggeber</div>
            <div class="bc-card-body" oninput="isDirty=true">
                <div class="grid-2">
                    <div><label>Bezeichnung</label><input id="o-label" value="${o.label}"></div>
                    <div><label>Debitor</label>
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
                            <th style="width:55px;">Pos</th>
                            <th style="width:320px;">Vorgang / Gebiet / Status</th>
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
    ot.totalHours = totalSoll;

    let statusClass = "btn-status-draft";
    let statusLabel = "📥 Senden";
    if (ot.status === 'scheduled') { statusClass = "btn-status-scheduled"; statusLabel = "✅ Geplant"; }
    else if (ot.isInWorklist) { statusClass = "btn-status-worklist"; statusLabel = "⏳ Worklist"; }

    return `
        <tr style="background:#fcfcfc;">
            <td><input type="text" value="${ot.pos}" onchange="updateOrderTask('${ot.id}','pos',this.value)" style="width:100%; border:none; background:transparent; font-weight:bold; text-align:center;"></td>
            <td>
                <div class="task-col-info">
                    <input type="text" value="${ot.label}" onchange="updateOrderTask('${ot.id}','label',this.value)" style="font-weight:bold; border:none; background:transparent; font-size:15px; width:100%;">
                    
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <select onchange="updateOrderTask('${ot.id}','regionId',this.value)" style="height:28px; font-size:11px; flex:1;">
                            <option value="">- Zielgebiet wählen -</option>
                            ${renderRegionOptions(null, 0, ot.regionId)}
                        </select>
                    </div>

                    <div class="input-with-lookup" style="margin-top:5px;">
                        <input style="font-size:11px; height:28px;" value="${loc?loc.city + ' ('+loc.addrNr+')' : 'Standort wählen...'}" readonly>
                        <button class="btn-lookup" style="height:28px; padding:0 6px;" onclick="lookupTaskLocation('${ot.id}')">🔍</button>
                    </div>
                    
                    <div class="task-row-meta" style="display:flex; gap:10px; align-items:center; margin-top:5px;">
                        <span>Soll: <b style="color:#0078d4;">${totalSoll}h</b></span>
                        <button class="btn ${statusClass}" style="font-size:10px; height:24px; padding:0 8px;" onclick="toggleWorklistStatus('${ot.id}')">${statusLabel}</button>
                    </div>
                </div>
            </td>
            <td>
                ${mySubTasks.map(st => renderSubTaskMini(st, ot.locationId)).join('')}
                <button class="btn" style="height:26px; font-size:10px; background:#eee; color:#444; margin-top:5px;" onclick="addSubTaskWithDefaults('${ot.id}')">+ Untervorgang</button>
            </td>
            <td><button onclick="deleteOrderTask('${ot.id}','${ot.orderId}')" style="border:none; background:none; cursor:pointer; font-size:18px; color:#e74c3c;">🗑️</button></td>
        </tr>`;
}

// Hilfsfunktion für hierarchische Select-Boxen
function renderRegionOptions(pid, indent, selectedId) {
    return regions.filter(r => r.parentId == pid).map(r => `
        <option value="${r.id}" ${selectedId == r.id ? 'selected' : ''}>
            ${"&nbsp;".repeat(indent * 3)}${indent > 0 ? '└ ' : ''}${r.name}
        </option>
        ${renderRegionOptions(r.id, indent + 1, selectedId)}
    `).join('');
}

function toggleWorklistStatus(otId) {
    let ot = orderTasks.find(x => x.id == otId);
    if(ot) {
        ot.isInWorklist = !ot.isInWorklist;
        ot.status = ot.isInWorklist ? 'backlog' : 'draft';
        saveData(); openOrderEdit(ot.orderId);
    }
}

function addOrderTaskWithDefaults(orderId) {
    saveScroll();
    let existing = orderTasks.filter(t => t.orderId == orderId);
    let posStr = ((existing.length + 1) * 10).toString().padStart(4, '0');
    let otId = 'OT' + Date.now();
    orderTasks.push({ id: otId, orderId: orderId, pos: posStr, label: "Neuer Vorgang", locationId: "", totalHours: 0, hoursPerDay: 8, status: 'draft', isInWorklist: false, regionId: "" });
    subTasks.push({ id: 'ST' + Date.now(), orderTaskId: otId, pos: "0010", label: "Basis-Tätigkeit", memo: "", equipmentId: "", hours: 1 });
    saveData(); openOrderEdit(orderId);
}
