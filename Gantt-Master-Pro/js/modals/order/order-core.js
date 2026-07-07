/**
 * js/modals/order/order-core.js - Hauptsteuerung & Register für Service-Aufträge
 * Features: FastTab-Navigation (Kopfdaten vs. Struktur), Live-Hook für Inboard-Worklist,
 *           kaskadierender Ad-hoc Verknüpfungs-Hook für schwebende Gantt-Balken
 */
var lastScrollPos = 0;

function openOrderList() {
    const l = i18n[lang];
    isDirty = false;
    
    // Microsoft Dynamics Business Central XL-Layout erzwingen
    const modalEl = document.getElementById('modal-box').parentElement.querySelector('.modal');
    if (modalEl) modalEl.className = 'modal modal-xl'; 

    let rows = orders.map(o => {
        let cnt = orderTasks.filter(t => t.orderId == o.id).length;
        return `
        <tr onclick="openOrderEdit('${o.id}')" style="cursor:pointer;">
            <td><b style="font-size:15px; color:#2c3e50;">${o.orderNr}</b></td>
            <td><b>${o.label || 'Unbenanntes Projekt'}</b></td>
            <td><span class="badge bg-ok" style="background:#2980b9;">${cnt} Vorgänge</span></td>
            <td style="text-align:right; font-weight:600;">${o.priority || 'Normal'}</td>
        </tr>`;
    }).join('');

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header"><button type="button" class="tab-btn active">📋 Service-Auftragsregister (APS)</button></div>
        <div class="modal-body active" style="background:#f4f7f6; padding:25px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; color:#2c3e50;">Konzern- & Projektaufträge</h3>
                <button type="button" class="btn btn-add" onclick="openOrderEdit()">+ Neuen Service-Auftrag anlegen</button>
            </div>
            <div class="addr-table-container">
                <table class="bc-table">
                    <thead><tr><th>Auftrags-Nr.</th><th>Projektbezeichnung</th><th>Umfang (Struktur)</th><th style="text-align:right;">Priorität</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="4" style="text-align:center; padding:30px; color:#7f8c8d;">Keine Auftragsdaten im System hinterlegt.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
        <div class="footer"><button type="button" class="btn" onclick="closeModal()">Schließen</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function openOrderEdit(id = null, activeTab = 'details') {
    const o = orders.find(x => x.id == id) || { 
        id: 'O' + Date.now(), orderNr: "ORD-" + (orders.length + 1001), label: "Neuer Service-Auftrag", 
        customerId: "", priority: "Normal" 
    };
    
    // Falls das Objekt bei einer echten Neuanlage noch fehlt, in den Stamm pushen
    if (!orders.find(x => x.id == o.id)) {
        orders.push(o);
    }

    let myTasks = orderTasks.filter(ot => ot.orderId == o.id).sort((a,b) => (a.pos||"").localeCompare(b.pos||""));
    const modalEl = document.getElementById('modal-box').parentElement.querySelector('.modal');
    if (modalEl) modalEl.className = 'modal modal-xl';

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header">
            <button type="button" class="tab-btn ${activeTab==='details'?'active':''}" onclick="saveScroll(); openOrderEdit('${o.id}', 'details')">🏠 Auftragskopf & Disposition</button>
            <button type="button" class="tab-btn ${activeTab==='structure'?'active':''}" onclick="saveScroll(); openOrderEdit('${o.id}', 'structure')">📊 Technische Gesamt-Struktur</button>
        </div>
        <div class="modal-body active" style="background:#f4f7f6; padding:25px;">
            ${activeTab === 'details' ? renderOrderDetails(o, myTasks) : renderStructureTable(myTasks)}
        </div>
        <div class="footer">
            <button type="button" class="btn btn-danger" style="margin-right:auto;" onclick="deleteOrder('${o.id}')">Auftrag löschen</button>
            <button type="button" class="btn btn-add" onclick="saveOrderAndBack('${o.id}')">💾 Änderungen speichern</button>
            <button type="button" class="btn" onclick="safeCloseModal()">Abbrechen</button>
        </div>`;
    
    const body = document.querySelector('.modal-body.active');
    if (body && lastScrollPos > 0) body.scrollTop = lastScrollPos;
}

function saveOrderAndBack(id) {
    let o = orders.find(x => x.id == id);
    if (o) {
        if (document.getElementById('o-nr')) o.orderNr = document.getElementById('o-nr').value;
        if (document.getElementById('o-label')) o.label = document.getElementById('o-label').value;
        if (document.getElementById('o-customer-id')) o.customerId = document.getElementById('o-customer-id').value;
    }
    
    // =========================================================================
    // KASKADIERENDER AD-HOC VERKNÜPFUNGS-HOOK (Enterprise Terminal Brücke)
    // =========================================================================
    // Falls das Fenster aus einer Freitext-Balkenanlage gestartet wurde, verheiraten wir den Balken jetzt!
    if (window.activeAdHocGanttTask && o) {
        let firstOt = orderTasks.find(ot => ot.orderId == o.id);
        
        window.activeAdHocGanttTask.orderId = o.id;
        if (firstOt) {
            window.activeAdHocGanttTask.orderTaskId = firstOt.id;
            window.activeAdHocGanttTask.label = firstOt.label || o.label;
            firstOt.status = 'scheduled'; // Sofort als im Kalender fixiert deklarieren
        }
        // Cache leeren nach erfolgreicher Zuordnung
        window.activeAdHocGanttTask = null;
    }

    isDirty = false; 
    saveData(); 
    openOrderList();
    
    // LIVE-HOOK: Aktualisiert das untere Inboard-Splitterpanel in Echtzeit
    if (typeof refreshInboardWorklist === 'function') {
        refreshInboardWorklist();
    }
    if (typeof draw === 'function') draw();
}

function deleteOrder(id) {
    if (confirm("Möchten Sie diesen Service-Auftrag inklusive aller zugehörigen Vorgänge, Untervorgänge und Kalendereinsätze unwiderruflich löschen?")) {
        orders = orders.filter(x => x.id != id);
        let relatedTasks = orderTasks.filter(x => x.orderId == id).map(x => x.id);
        orderTasks = orderTasks.filter(x => x.orderId != id);
        subTasks = subTasks.filter(x => !relatedTasks.includes(x.orderTaskId));
        if (typeof tasks !== 'undefined') tasks = tasks.filter(x => x.orderId != id);
        
        saveData(); 
        openOrderList();
        
        if (typeof refreshInboardWorklist === 'function') refreshInboardWorklist();
        if (typeof draw === 'function') draw();
    }
}

function saveScroll() { 
    const body = document.querySelector('.modal-body.active'); 
    if (body) lastScrollPos = body.scrollTop; 
}
