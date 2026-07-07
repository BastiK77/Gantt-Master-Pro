// modal-address.js
var currentEqPage = 0;
const EQ_PER_PAGE = 15;
var eqSearchQuery = ""; 

function openAddressList(targetTab = 'details') {
    renderAddressModal(lastOpenedAddrObj(), targetTab);
}

function lastOpenedAddrObj() {
    return addresses.find(a => a.id == lastAddressId) || (addresses.length > 0 ? addresses[0] : null);
}

function getHierarchyList() {
    let res = [];
    const add = (pid, lvl) => {
        addresses.filter(a => a.parentId == pid).forEach(c => {
            res.push({...c, level: lvl});
            add(c.id, lvl + 1);
        });
    };
    addresses.filter(a => !a.parentId || a.parentId == "" || a.parentId == "null").forEach(r => {
        res.push({...r, level: 0});
        add(r.id, 1);
    });
    return res;
}

function renderAddressModal(addr = null, activeTab = 'details') {
    const l = i18n[lang];
    if (activeTab === 'details') isDirty = false;
    const a = addr || { id: Date.now(), addrNr: "NEU", street: "", zip: "", city: "", country: "", type: "Kunde", parentId: "", mail: "", phone: "" };
    
    let allEq = machines.filter(m => m.addressId == a.id);
    if (eqSearchQuery) {
        const q = eqSearchQuery.toLowerCase();
        allEq = allEq.filter(e => (e.mNr && e.mNr.toLowerCase().includes(q)) || (e.label && e.label.toLowerCase().includes(q)));
    }
    const pagedEq = allEq.slice(currentEqPage * EQ_PER_PAGE, (currentEqPage + 1) * EQ_PER_PAGE);
    const types = ["Konzern", "Kunde", "Interessent", "Standort", "Werk", "Tor"];

    let html = `
        <div class="tab-header">
            <button class="tab-btn ${activeTab === 'details' ? 'active' : ''}" onclick="renderAddressModal(lastOpenedAddrObj(), 'details')">🏠 Details</button>
            <button class="tab-btn ${activeTab === 'list' ? 'active' : ''}" onclick="renderAddressModal(null, 'list')">📋 Adressstamm</button>
        </div>
        <div class="modal-body active">`;

    if (activeTab === 'details') {
        html += `
            <div style="position:relative; margin-bottom: 10px;">
                <div style="display:flex; gap:5px;">
                    <input type="text" id="addr-search" placeholder="🔍 Adresse suchen..." oninput="searchAddresses(this.value)">
                    <button class="btn btn-add" onclick="isDirty=false; renderAddressModal(null, 'details')">+</button>
                </div>
                <div id="search-results" style="position:absolute; width:100%; z-index:999; background:white; border:1px solid #ccc; display:none; max-height:150px; overflow-y:auto; box-shadow:0 4px 10px rgba(0,0,0,0.1);"></div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 260px; gap:15px; height: 380px; overflow:hidden;">
                <div id="addr-form-fields" style="overflow-y:auto; padding-right:5px;" oninput="isDirty=true">
                    <div class="grid-2">
                        <div><label>Typ</label><select id="a-type">${types.map(t => `<option ${a.type==t?'selected':''}>${t}</option>`).join('')}</select></div>
                        <div><label>Übergeordnet</label><select id="a-parent"><option value="">-</option>${addresses.filter(x=>x.id!=a.id).map(x=>`<option value="${x.id}" ${a.parentId==x.id?'selected':''}>${x.addrNr}</option>`).join('')}</select></div>
                    </div>
                    <div class="grid-2" style="margin-top:10px"><input id="a-nr" value="${a.addrNr}" placeholder="Nr."><input id="a-mail" value="${a.mail}" placeholder="E-Mail"></div>
                    <input id="a-street" value="${a.street}" placeholder="Strasse" style="margin-top:10px">
                    <div class="grid-2" style="margin-top:10px"><input id="a-zip" value="${a.zip}" placeholder="PLZ"><input id="a-city" value="${a.city}" placeholder="Ort"></div>
                    <input id="a-phone" value="${a.phone}" placeholder="Telefon" style="margin-top:10px">
                </div>
                <div style="border-left:1px solid #eee; padding-left:10px; display:flex; flex-direction:column; background:#f9f9f9;">
                    <label style="font-size:10px;">EQUIPMENT (${allEq.length})</label>
                    <input type="text" placeholder="Filter..." oninput="eqSearchQuery=this.value; renderAddressModal(addresses.find(x=>x.id=='${a.id}'), 'details')">
                    <div style="flex:1; overflow-y:auto; margin-top:5px;">
                        ${pagedEq.map(e => `<div class="address-item" style="padding:4px; font-size:10px;" onclick="isDirty=false; bridgeToEquipment('${e.id}')"><b>${e.mNr}</b></div>`).join('')}
                    </div>
                </div>
            </div>`;
    } else {
        html += `<div class="addr-table-container"><table class="addr-table"><thead><tr><th>Struktur</th><th>Typ</th><th>Ort</th></tr></thead><tbody>
                ${getHierarchyList().map(item => `<tr onclick="isDirty=false; lastAddressId='${item.id}'; saveData(); renderAddressModal(addresses.find(x=>x.id=='${item.id}'), 'details')">
                <td style="padding-left:${item.level*15}px">${item.level>0?'└─ ':''}<b>${item.addrNr}</b></td><td>${item.type}</td><td>${item.city}</td></tr>`).join('')}
                </tbody></table></div>`;
    }
    html += `</div><div class="footer">
        ${activeTab === 'details' ? `<button class="btn btn-danger" onclick="deleteAddr('${a.id}')">${l.delete}</button><button class="btn btn-add" onclick="saveAddr('${a.id}')">${l.save}</button>` : ''}
        <button class="btn" onclick="safeCloseModal()">${l.close || 'Schließen'}</button></div>`;
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function bridgeToEquipment(eqId) { lastEquipmentId = eqId; saveData(); closeModal(); if (typeof openEquipmentList === 'function') openEquipmentList('details'); }

function searchAddresses(q) {
    const div = document.getElementById('search-results');
    if (q.length < 2) { div.style.display = 'none'; return; }
    const hits = addresses.filter(a => a.addrNr.toLowerCase().includes(q.toLowerCase()) || a.city.toLowerCase().includes(q.toLowerCase())).slice(0,10);
    div.innerHTML = hits.map(h => `<div class="address-item" onclick="isDirty=false; lastAddressId='${h.id}'; saveData(); renderAddressModal(addresses.find(x=>x.id=='${h.id}'), 'details')">${h.addrNr}: ${h.city}</div>`).join('');
    div.style.display = hits.length ? 'block' : 'none';
}

function saveAddr(id) {
    const newA = { id, addrNr: document.getElementById('a-nr').value, street: document.getElementById('a-street').value, zip: document.getElementById('a-zip').value, city: document.getElementById('a-city').value, type: document.getElementById('a-type').value, parentId: document.getElementById('a-parent').value, mail: document.getElementById('a-mail').value, phone: document.getElementById('a-phone').value };
    const idx = addresses.findIndex(x => x.id == id);
    if (idx > -1) addresses[idx] = newA; else addresses.push(newA);
    lastAddressId = id; isDirty = false; saveData(); renderAddressModal(newA, 'details');
}

function deleteAddr(id) { if(confirm("Löschen?")) { addresses = addresses.filter(x => x.id != id); lastAddressId = addresses.length > 0 ? addresses[0].id : null; isDirty = false; saveData(); openAddressList('list'); } }
