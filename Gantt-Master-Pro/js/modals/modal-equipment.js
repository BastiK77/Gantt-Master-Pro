// modal-equipment.js
function openEquipmentList(targetTab = 'details') {
    let currentEq = machines.find(m => m.id == lastEquipmentId) || (machines.length > 0 ? machines[0] : null);
    renderEquipmentModal(currentEq, targetTab);
}

function renderEquipmentModal(eq = null, activeTab = 'details') {
    const l = i18n[lang];
    if (activeTab === 'details') isDirty = false;
    const e = eq || { id: Date.now(), mNr: "NEU", label: "", addressId: lastAddressId || "", installDate: "", warrantyDate: "" };
    
    let html = `
        <div class="tab-header">
            <button class="tab-btn ${activeTab === 'details' ? 'active' : ''}" onclick="openEquipmentList('details')">⚙️ Details</button>
            <button class="tab-btn ${activeTab === 'list' ? 'active' : ''}" onclick="openEquipmentList('list')">📋 Inventarliste</button>
        </div>
        <div class="modal-body active">`;

    if (activeTab === 'details') {
        html += `<div oninput="isDirty=true">
            <label>Equipment-Nr.</label><input id="e-nr" value="${e.mNr}">
            <label>Bezeichnung</label><input id="e-label" value="${e.label}">
            <label>Standort</label>
            <div style="display:flex; gap:5px;">
                <select id="e-addr" style="flex:1;"><option value="">-</option>${addresses.map(a=>`<option value="${a.id}" ${e.addressId==a.id?'selected':''}>${a.addrNr}: ${a.city}</option>`).join('')}</select>
                ${e.addressId ? `<button class="btn" onclick="isDirty=false; lastAddressId='${e.addressId}'; saveData(); closeModal(); openAddressList('details')">🏠</button>` : ''}
            </div>
            <div class="grid-2" style="margin-top:15px;">
                <div><label>Installation</label><input type="date" id="e-install" value="${e.installDate || ''}"></div>
                <div><label>Garantie</label><input type="date" id="e-warranty" value="${e.warrantyDate || ''}"></div>
            </div></div>`;
    } else {
        html += `<div class="addr-table-container"><table class="addr-table"><thead><tr><th>Nr.</th><th>Bezeichnung</th><th>Ort</th></tr></thead><tbody>
                ${machines.map(m => {
                    let loc = addresses.find(a => a.id == m.addressId);
                    return `<tr onclick="isDirty=false; lastEquipmentId='${m.id}'; saveData(); renderEquipmentModal(machines.find(x=>x.id=='${m.id}'), 'details')"><td><b>${m.mNr}</b></td><td>${m.label}</td><td>${loc?loc.city:'-'}</td></tr>`
                }).join('')}</tbody></table></div>`;
    }
    html += `</div><div class="footer">
        ${activeTab === 'details' ? `<button class="btn btn-danger" onclick="deleteEq('${e.id}')">${l.delete}</button><button class="btn btn-add" onclick="saveEq('${e.id}')">${l.save}</button>` : ''}
        <button class="btn" onclick="safeCloseModal()">${l.close || 'Schließen'}</button></div>`;
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function saveEq(id) {
    const newEq = { id, mNr: document.getElementById('e-nr').value, label: document.getElementById('e-label').value, addressId: document.getElementById('e-addr').value, installDate: document.getElementById('e-install').value, warrantyDate: document.getElementById('e-warranty').value };
    const idx = machines.findIndex(x => x.id == id);
    if (idx > -1) machines[idx] = newEq; else machines.push(newEq);
    lastEquipmentId = id; isDirty = false; saveData(); renderEquipmentModal(newEq, 'details');
}

function deleteEq(id) { if(confirm("Löschen?")) { machines = machines.filter(x => x.id != id); lastEquipmentId = machines.length > 0 ? machines[0].id : null; isDirty = false; saveData(); openEquipmentList('list'); } }
