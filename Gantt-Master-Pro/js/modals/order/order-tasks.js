/**
 * js/modals/order/order-tasks.js - Gliederung der Haupteinsätze (Vorgangsebene)
 * ARCHITEKTUR-RETIREMENT: Vollständig unverkürzt mit Zeitzonen-Splitting & Weitwinkel-Pos.
 */
function renderOrderDetails(o, myTasks) {
    let custObj = addresses.find(a => a.id == o.customerId);
    return `
        <!-- FASTTAB: KOPFDATEN / AUFTRAGGEBER -->
        <div class="bc-card">
            <div class="bc-card-header">Kopfdaten & Debitor</div>
            <div class="bc-card-body" oninput="isDirty=true">
                <div class="grid-2">
                    <div>
                        <label>Auftragsnummer (SAP/BC-ID)</label>
                        <input id="o-nr" value="${o.orderNr}">
                    </div>
                    <div>
                        <label>Projekt- / Auftragsbezeichnung</label>
                        <input id="o-label" value="${o.label}">
                    </div>
                </div>
                <div class="grid-2" style="margin-top:15px;">
                    <div>
                        <label>Rechnungsempfänger (Debitor-Stamm)</label>
                        <div class="input-with-lookup">
                            <input id="o-customer-disp" value="${custObj ? `${custObj.company || ''} (${custObj.addrNr}) - ${custObj.city}` : ''}" readonly placeholder="Klicken Sie auf das Lupen-Symbol zur Debitor-Auswahl...">
                            <input type="hidden" id="o-customer-id" value="${o.customerId || ''}">
                            <button type="button" class="btn-lookup" onclick="lookupCustomerForOrder('${o.id}')">🔍</button>
                        </div>
                    </div>
                    <div>
                        <label>Prioritätsstufe</label>
                        <select id="o-priority" onchange="isDirty=true; orders.find(x=>x.id=='${o.id}').priority=this.value;">
                            <option value="Normal" ${o.priority=='Normal'?'selected':''}>Normalenbereitstellung</option>
                            <option value="Hoch" ${o.priority=='Hoch'?'selected':''}>⚠️ Eskalation / Hoch</option>
                            <option value="Kritisch" ${o.priority=='Kritisch'?'selected':''}>🚨 Stillstand / Kritisch</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- FASTTAB: VORGANGS-TABELLE -->
        <div class="bc-card">
            <div class="bc-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Vorgangsplanung & Kapazitätsbedarf</span>
                <button class="btn btn-add" style="height:30px; font-size:12px; padding:0 12px;" onclick="addOrderTaskWithDefaults('${o.id}')">+ Neuen Planungs-Vorgang anhängen</button>
            </div>
            <div class="bc-card-body" style="padding:0;">
                <table class="bc-table" style="table-layout: fixed; width: 100%;">
                    <thead>
                        <tr>
                            <th style="width:65px; text-align:center;">Pos</th>
                            <th style="width:310px;">Vorgangsdaten / Einsatzort</th>
                            <th>Untervorgänge (Detailliertes Terminal-Protokoll & Ist-Rückmeldung)</th>
                            <th style="width:40px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${myTasks.map(ot => renderTaskRow(ot)).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

function renderTaskRow(ot) {
    let loc = addresses.find(a => a.id == ot.locationId);
    let mySubTasks = subTasks.filter(st => st.orderTaskId == ot.id).sort((a,b) => (a.pos||"").localeCompare(b.pos||""));
    
    const totalSoll = mySubTasks.reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
    const totalIst = mySubTasks.reduce((sum, s) => sum + (parseFloat(s.actualHours) || 0), 0);
    ot.totalHours = totalSoll;

    // Statusberechnung für Farb-Signal
    let statusClass = "btn-status-draft";
    let statusLabel = "📥 An Worklist";
    if (ot.status === 'scheduled') { statusClass = "btn-status-scheduled"; statusLabel = "✅ Geplant"; }
    else if (ot.isInWorklist) { statusClass = "btn-status-worklist"; statusLabel = "⏳ In Worklist"; }

    // ZEITZONEN-FORMAT-SCHUTZ: Spaltet kombinierte Strings auf und filtert die reine Datumskomponente aus
    let cleanDateValue = "";
    if (ot.startDate) {
        let dateStr = String(ot.startDate);
        cleanDateValue = dateStr.includes(',') ? dateStr.split(',')[0] : dateStr;
    }

    return `
        <tr style="background:#fdfdfd; border-bottom:1px solid #eef0f1;">
            <td style="text-align:center; vertical-align:top; padding-top:15px;">
                <input type="text" value="${ot.pos}" onchange="updateOrderTaskField('${ot.id}','pos',this.value)" style="text-align:center; font-weight:bold; color:#555;">
            </td>
            <td style="vertical-align:top; padding:12px;">
                <div class="task-col-info" style="display:flex; flex-direction:column; gap:6px;">
                    <input type="text" value="${ot.label}" onchange="updateOrderTaskField('${ot.id}','label',this.value)" style="font-weight:bold; font-size:14px; color:#2c3e50;" placeholder="Einsatz-Titel...">
                    
                    <div class="input-with-lookup">
                        <input style="font-size:11px; height:28px;" value="${loc ? `${loc.city} (${loc.addrNr})` : ''}" readonly placeholder="Einsatzort wählen...">
                        <button type="button" class="btn-lookup" style="height:28px; padding:0 8px;" onclick="lookupTaskLocationField('${ot.id}')">🔍</button>
                    </div>

                    <div style="display:flex; gap:5px; align-items:center; margin-top:3px;">
                        <span style="font-size:11px; color:#666;">Startvorgabe:</span>
                        <input type="date" value="${cleanDateValue}" onchange="updateOrderTaskField('${ot.id}','startDate',this.value)" style="height:26px; font-size:11px; padding:2px 5px; width:120px;">
                    </div>

                    <div class="task-row-meta" style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; background:#f8f9fa; padding:5px; border-radius:4px;">
                        <span style="font-size:11px;">Soll: <b style="color:#0078d4;">${totalSoll}h</b> | Ist: <b style="color:#27ae60;">${totalIst}h</b></span>
                        <button type="button" class="btn ${statusClass}" style="font-size:10px; height:24px; padding:0 8px; font-weight:bold;" onclick="toggleWorklistStatusField('${ot.id}')">${statusLabel}</button>
                    </div>
                </div>
            </td>
            <td style="vertical-align:top; padding:12px; background:#fafafa;">
                <div style="display:flex; flex-direction:column; gap:5px;">
                    ${mySubTasks.map(st => typeof renderSubTaskMiniRow === 'function' ? renderSubTaskMiniRow(st, ot.locationId) : '').join('')}
                </div>
                <button type="button" class="btn" style="height:26px; font-size:10px; background:#fff; border:1px solid #bdc3c7; color:#555; margin-top:6px;" onclick="addSubTaskWithDefaultsField('${ot.id}')">+ Untervorgang hinzufügen</button>
            </td>
            <td style="text-align:center; vertical-align:top; padding-top:15px;">
                <button type="button" onclick="deleteOrderTaskField('${ot.id}','${ot.orderId}')" style="border:none; background:none; cursor:pointer; font-size:16px; color:#e74c3c;" title="Vorgang löschen">🗑️</button>
            </td>
        </tr>`;
}
