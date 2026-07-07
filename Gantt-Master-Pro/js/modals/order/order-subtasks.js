/**
 * js/modals/order/order-subtasks.js - Erweiterte Terminal-Rückmeldefelder für Untervorgänge
 * Features: Duale Signal-Buttons für Arbeitsanweisung (Rot/Grün) & Befundbericht (Bedingt Grün)
 */

function renderSubTaskMiniRow(st, locId) {
    let eq = machines.find(m => m.id == st.equipmentId);
    const isBase = st.pos === "0010"; 

    // Null-Safe-Initialisierung der Rückmeldedaten
    if (st.isDone === undefined) st.isDone = false;
    if (st.actualHours === undefined) st.actualHours = 0;
    if (st.memo === undefined) st.memo = "";
    if (st.feedbackText === undefined) st.feedbackText = "";

    // Status-Farb-Logik für Button 1: Arbeitsanweisung / Memo ("Was zu tun ist")
    const hasMemo = st.memo && st.memo.trim().length > 0;
    const memoBtnClass = hasMemo ? 'btn-memo-filled' : 'btn-memo-empty';

    // Status-Farb-Logik für Button 2: Befundbericht / Feedback (Nur sichtbar wenn gefüllt!)
    const hasFeedback = st.feedbackText && st.feedbackText.trim().length > 0;

    return `
        <div class="subtask-card" style="grid-template-columns: 35px 30px 1fr 75px 75px 120px 140px 85px 30px; padding:6px; background:#fff; gap:6px;">
            <!-- Spalte 1: Positionsnummer -->
            <span style="font-size:11px; color:#7f8c8d; font-weight:bold; text-align:center;">${st.pos}</span>
            
            <!-- Spalte 2: Checkliste Erledigt-Status -->
            <input type="checkbox" ${st.isDone ? 'checked' : ''} 
                   onchange="isDirty=true; updateSubTaskFieldDirect('${st.id}','isDone',this.checked); openOrderEdit(orderTasks.find(x=>x.id=='${st.orderTaskId}').orderId,'details');" 
                   style="width:16px; height:16px; cursor:pointer; margin:0 auto;">
            
            <!-- Spalte 3: Bezeichnung der Aufgabe -->
            <input type="text" placeholder="Aufgabenstellung..." value="${st.label}" onchange="updateSubTaskFieldDirect('${st.id}','label',this.value)" style="font-weight:600; color:#2c3e50;">
            
            <!-- Spalte 4: SOLL-Stunden (TEXT-INPUT OHNE ARROWS) -->
            <div class="st-hours-group" style="background:#e8f4fd; border-color:#b3d8f4; height:30px; padding:0 4px;">
                <label style="margin:0; font-size:10px; color:#0078d4;">Soll:</label>
                <input type="text" inputmode="decimal" value="${st.hours || 0}" 
                       onchange="isDirty=true; updateSubTaskFieldDirect('${st.id}','hours',parseFloat(this.value)||0); openOrderEdit(orderTasks.find(x=>x.id=='${st.orderTaskId}').orderId,'details');" 
                       style="width:35px; text-align:center; font-weight:bold; color:#0078d4; height:100%; border:none; background:transparent;">
            </div>

            <!-- Spalte 5: IST-Stunden (TEXT-INPUT OHNE ARROWS) -->
            <div class="st-hours-group" style="background:#e8f5e9; border-color:#c8e6c9; height:30px; padding:0 4px;">
                <label style="margin:0; font-size:10px; color:#27ae60;">Ist:</label>
                <input type="text" inputmode="decimal" value="${st.actualHours}" 
                       onchange="isDirty=true; updateSubTaskFieldDirect('${st.id}','actualHours',parseFloat(this.value)||0); openOrderEdit(orderTasks.find(x=>x.id=='${st.orderTaskId}').orderId,'details');" 
                       style="width:35px; text-align:center; font-weight:bold; color:#27ae60; height:100%; border:none; background:transparent;">
            </div>

            <!-- Spalte 6: Equipment-Auswahl -->
            <button type="button" class="btn-lookup" style="height:30px; font-size:11px; width:100%; border-radius:4px; padding:0 4px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" onclick="lookupSubTaskEquipmentField('${st.id}', '${locId}')">
                ${eq ? `⚙️ ${eq.mNr}` : '⚙️ Anlage'}
            </button>

            <!-- Spalte 7: Rückmeldetext / Antwort-Textfeld -->
            <input type="text" placeholder="Befund / Rückmeldetext..." value="${st.feedbackText}" 
                   onchange="isDirty=true; updateSubTaskFieldDirect('${st.id}','feedbackText',this.value); openOrderEdit(orderTasks.find(x=>x.id=='${st.orderTaskId}').orderId,'details');" 
                   style="font-size:11px; border:1px solid #d2d5d7 !important; background:#fff; border-radius:3px; height:30px; padding:2px 6px !important;">

            <!-- Spalte 8: Duale Signal-Schaltflächen (Zustandsanzeige für Memos & Befunde) -->
            <div style="display:flex; gap:4px; justify-content:flex-start; align-items:center; height:30px;">
                <!-- Button 1: Was zu tun ist (Rot wenn leer, Grün wenn gefüllt) -->
                <button type="button" class="btn-memo ${memoBtnClass}" title="Technische Arbeitsanweisung (Soll-Langtext) bearbeiten" 
                        style="width:30px; height:30px; font-size:14px; border-radius:4px;"
                        onclick="openSubTaskMemoPopup('${st.id}')">📋</button>
                
                <!-- Button 2: Befundung (Nur sichtbar und grün, wenn Text hinterlegt wurde) -->
                ${hasFeedback ? `
                    <button type="button" class="btn-memo btn-memo-filled" title="Befundbericht eingesehen" 
                            style="width:30px; height:30px; font-size:14px; border-radius:4px; background:#27ae60; cursor:default;"
                            onclick="openSubTaskFeedbackPopup('${st.id}')">💬</button>
                ` : '<div style="width:30px;"></div>'}
            </div>

            <!-- Spalte 9: Löschschutz kaskadiert -->
            ${!isBase ? `<button type="button" onclick="deleteSubTaskFieldDirect('${st.id}','${st.orderTaskId}')" style="border:none; background:none; cursor:pointer; font-size:14px; color:#e74c3c; text-align:center;">❌</button>` : '<div style="text-align:center; color:#ccc; font-size:11px;">🔒</div>'}
        </div>`;
}

/**
 * Öffnet das Popup zum Bearbeiten der Technischen Arbeitsanweisung (Soll-Langtext)
 */
function openSubTaskMemoPopup(stId) {
    let st = subTasks.find(x => x.id == stId);
    if (!st) return;
    
    if (typeof openLookup === 'function') {
        openLookup("Arbeitsanweisung (Soll-Langtext) bearbeiten", [], () => {}, true);
        document.getElementById('lookup-box').innerHTML = `
            <div class="tab-header"><button type="button" class="tab-btn active">📋 Anweisung zu Position: ${st.pos}</button></div>
            <div class="modal-body active" style="padding:15px;">
                <label>Geben Sie hier die detaillierte Arbeitsanweisung für den Techniker ein:</label>
                <textarea id="temp-order-memo" style="width:100%; height:280px; padding:12px; border:1px solid #bdc3c7; border-radius:4px; font-size:14px; resize:none; font-family:inherit; box-sizing:border-box;">${st.memo || ''}</textarea>
            </div>
            <div class="footer">
                <button type="button" class="btn btn-add" onclick="saveSubTaskMemoDirect('${stId}')">💾 Text übernehmen</button>
                <button type="button" class="btn" onclick="closeLookup()">Abbrechen</button>
            </div>`;
    }
}

function saveSubTaskMemoDirect(stId) {
    let st = subTasks.find(x => x.id == stId);
    if (st) {
        st.memo = document.getElementById('temp-order-memo').value;
        saveData();
        closeLookup();
        // Live-Refresh der gesamten Auftragsmaske zur Aktualisierung der Signal-Farben
        openOrderEdit(orderTasks.find(x => x.id == st.orderTaskId).orderId, 'details');
    }
}

/**
 * Komfort-Feature: Macht den Befundbericht im Großformat lesbar, falls der Text im Input zu lang wird
 */
function openSubTaskFeedbackPopup(stId) {
    let st = subTasks.find(x => x.id == stId);
    if (!st) return;

    if (typeof openLookup === 'function') {
        openLookup("Techniker-Befundbericht einsehen", [], () => {}, true);
        document.getElementById('lookup-box').innerHTML = `
            <div class="tab-header"><button type="button" class="tab-btn active">💬 Befundbericht zu Position: ${st.pos}</button></div>
            <div class="modal-body active" style="padding:15px;">
                <label>Eingegangene Techniker-Rückmeldung:</label>
                <textarea readonly style="width:100%; height:280px; padding:12px; border:1px solid #dee2e6; background:#f8f9fa; border-radius:4px; font-size:14px; resize:none; box-sizing:border-box;">${st.feedbackText || ''}</textarea>
            </div>
            <div class="footer">
                <button type="button" class="btn" onclick="closeLookup()">Schließen</button>
            </div>`;
    }
}

/**
 * Technische Gliederungs-Gesamtübersicht (Reiter 2 des Auftrags)
 */
function renderStructureTable(tasks) {
    return `
    <div class="addr-table-container">
        <table class="bc-table">
            <thead>
                <tr>
                    <th style="width:70px;">Vorgang</th>
                    <th style="width:70px;">Sub-Pos</th>
                    <th>Beschreibung / Gewerk</th>
                    <th style="width:40px; text-align:center;">Status</th>
                    <th>Zugeordnetes Equipment</th>
                    <th>Rückmeldetext (Befund)</th>
                    <th style="text-align:right; width:70px;">Soll-h</th>
                    <th style="text-align:right; width:70px;">Ist-h</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(ot => subTasks.filter(st => st.orderTaskId == ot.id).sort((a,b)=> (a.pos||"").localeCompare(b.pos||"")).map(st => {
                    let eq = machines.find(m => m.id == st.equipmentId);
                    return `
                    <tr>
                        <td><b>${ot.pos}</b></td>
                        <td>${st.pos}</td>
                        <td>${st.label || ot.label}</td>
                        <td style="text-align:center;">${st.isDone ? '✅' : '⏳'}</td>
                        <td><span class="badge" style="background:#16a085;">${eq ? eq.mNr : '-'}</span></td>
                        <td style="font-style:italic; color:#555;">${st.feedbackText || ''}</td>
                        <td style="text-align:right; font-weight:bold; color:#0078d4;">${st.hours || 0}</td>
                        <td style="text-align:right; font-weight:bold; color:#27ae60;">${st.actualHours || 0}</td>
                    </tr>`;
                }).join('')).join('')}
            </tbody>
        </table>
    </div>`;
}
