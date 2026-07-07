/**
 * js/modals/modal-worklist.js - Permanente Inboard-Worklist für das Splitter-Panel
 * Features: Live-Counter, HTML5 Drag-Start-Feedback, integrierte Ressourcen-Zuweisung.
 */

function refreshInboardWorklist() {
    const container = document.getElementById('worklist-embed-content');
    const counter = document.getElementById('worklist-counter');
    if (!container) return;

    // Filtert alle Vorgänge, die für den Backlog freigegeben, aber noch nicht im Gantt geplant sind
    const backlog = orderTasks.filter(ot => ot.isInWorklist && ot.status !== 'scheduled');
    
    if(counter) {
        counter.innerText = `${backlog.length} offene Bedarfe`;
        counter.style.background = backlog.length > 0 ? '#f39c12' : '#27ae60';
    }

    let rows = backlog.map(ot => {
        const o = orders.find(x => x.id == ot.orderId);
        const loc = addresses.find(x => x.id == ot.locationId);
        
        // Berechnen der summierten Soll-Stunden aus den Untervorgängen
        let mySubTasks = subTasks.filter(st => st.orderTaskId == ot.id);
        let totalSollHours = mySubTasks.reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
        ot.totalHours = totalSollHours; // Puffer für das Canvas-Drop-Event sichern

        return `
            <tr draggable="true" ondragstart="handleWLDragStart(event, '${ot.id}')" style="cursor: grab;">
                <td style="width:40px; text-align:center; font-size:16px; color:#3498db; font-weight:bold; user-select:none;">☰</td>
                <td><b style="color:#2c3e50;">${o ? o.orderNr : 'Notfall-ID'}</b><br><small style="color:#7f8c8d; font-weight:bold;">Pos ${ot.pos}</small></td>
                <td><b>${ot.label}</b></td>
                <td>${loc ? `<b>${loc.city}</b> <small style="color:#7f8c8d;">(${loc.addrNr})</small>` : '<span style="color:#999; font-style:italic;">Kein Ort</span>'}</td>
                <td style="text-align:center;"><span class="badge" style="background:#2980b9; font-size:11px; padding:4px 8px; font-weight:bold;">${totalSollHours} h</span></td>
                <td>
                    <select onchange="quickAssignResourceFromWorklist('${ot.id}', this.value)" style="height:28px; font-size:11px; padding:2px; width:100%; cursor:pointer;">
                        <option value="">- Techniker vorauswählen -</option>
                        ${techs.filter(r => r.type === 'worker').map(r => `
                            <option value="${r.id}" ${ot.resId == r.id ? 'selected' : ''}>${r.name}</option>
                        `).join('')}
                    </select>
                </td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <table class="bc-table" style="table-layout: fixed; width: 100%;">
            <thead>
                <tr>
                    <th style="width:40px; text-align:center;">Drag</th>
                    <th style="width:120px;">Auftrag</th>
                    <th>Vorgangsbezeichnung (Gewerk)</th>
                    <th>Einsatzadresse / BC-Standort</th>
                    <th style="width:80px; text-align:center;">Sollzeit</th>
                    <th style="width:200px;">Vor-Disposition (Ressource)</th>
                </tr>
            </thead>
            <tbody>
                ${rows || '<tr><td colspan="6" style="text-align:center; padding:35px; color:#999; font-style:italic; font-weight:600;">Keine offenen Bedarfe im Backlog aktiv. Senden Sie Vorgänge aus den Aufträgen ("In Worklist") hierher.</td></tr>'}
            </tbody>
        </table>`;
}

function handleWLDragStart(e, otId) {
    e.dataTransfer.setData("text/plain", otId);
    e.dataTransfer.effectAllowed = "move";
    
    // Visuelles Drag-Feedback für den Dispatcher (Canvas leuchtet dezent gelb)
    const canvasContainer = document.getElementById('view-container');
    if(canvasContainer) canvasContainer.style.background = "#fffde7"; 
}

function quickAssignResourceFromWorklist(otId, resId) {
    let ot = orderTasks.find(x => x.id == otId);
    if(ot) {
        ot.resId = resId;
        saveData();
    }
}

// Sicheres Einklinken in den globalen Initialisierungs-Hook des Hauptbildschirms
var oldWLOnload = window.onload;
window.onload = () => {
    if(typeof oldWLOnload === 'function') oldWLOnload();
    refreshInboardWorklist();
};
