// modal-config.js
function openGlobalConfig(tab = 'task') {
    const l = i18n[lang];
    isDirty = false;

    const renderRow = (key, val, type) => `
        <tr>
            <td><input type="text" value="${val.label}" onchange="isDirty=true; ${type}['${key}'].label=this.value"></td>
            <td style="width:60px;"><input type="color" value="${val.color}" oninput="isDirty=true; ${type}['${key}'].color=this.value; draw();"></td>
            <td style="width:40px;"><button class="btn-danger" style="padding:5px 10px; border:none;" onclick="isDirty=true; delete ${type}['${key}']; openGlobalConfig('${tab}');">×</button></td>
        </tr>`;

    let html = "";
    if (tab === 'task') {
        html = `<h4>Kennungen</h4><div class="addr-table-container"><table class="config-table">${Object.entries(configKeys).map(([k,v]) => renderRow(k,v,'configKeys')).join('')}</table></div><button class="btn btn-add" style="margin-top:10px;" onclick="configKeys['id_'+Date.now()]={label:'Neu',color:'#3498db'}; openGlobalConfig('task');">+ Kennung</button>`;
    } else if (tab === 'res') {
        html = `<h4>Ressourcen-Typen</h4><div class="addr-table-container"><table class="config-table">${Object.entries(resTypes).map(([k,v]) => renderRow(k,v,'resTypes')).join('')}</table></div><button class="btn btn-add" style="margin-top:10px;" onclick="resTypes['id_'+Date.now()]={label:'Neu',color:'#ffffff'}; openGlobalConfig('res');">+ Typ</button>`;
    } else if (tab === 'regions') {
        html = `<h4>Hierarchische Gebiete</h4><div class="addr-table-container"><table class="bc-table"><thead><tr><th>Name</th><th>Aktion</th></tr></thead><tbody>${renderRegionTree(null, 0)}</tbody></table></div><button class="btn btn-add" style="margin-top:10px;" onclick="regions.push({id:'reg'+Date.now(), name:'Neues Gebiet', parentId:null}); openGlobalConfig('regions');">+ Hauptregion</button>`;
    } else if (tab === 'sys') {
        html = `<h4>System</h4><div class="bc-card"><div class="bc-card-body"><label>Sprache</label><select onchange="isDirty=true; tempLang=this.value;"><option value="de" ${lang==='de'?'selected':''}>Deutsch</option><option value="en" ${lang==='en'?'selected':''}>English</option><option value="us" ${lang==='us'?'selected':''}>English (US)</option></select></div></div>`;
    }

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header">
            <button class="tab-btn ${tab==='task'?'active':''}" onclick="openGlobalConfig('task')">Kennungen</button>
            <button class="tab-btn ${tab==='res'?'active':''}" onclick="openGlobalConfig('res')">Typen</button>
            <button class="tab-btn ${tab==='regions'?'active':''}" onclick="openGlobalConfig('regions')">Gebiete</button>
            <button class="tab-btn ${tab==='sys'?'active':''}" onclick="openGlobalConfig('sys')">System</button>
        </div>
        <div class="modal-body active">${html}</div>
        <div class="footer"><button class="btn btn-add" onclick="saveConfig()">💾 Speichern</button><button class="btn" onclick="safeCloseModal()">Abbrechen</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

// modal-config.js
function openGlobalConfig(tab = 'task') {
    const l = i18n[lang];
    isDirty = false;

    const renderRow = (key, val, type) => `
        <tr>
            <td><input type="text" value="${val.label}" onchange="isDirty=true; ${type}['${key}'].label=this.value"></td>
            <td style="width:60px;"><input type="color" value="${val.color}" oninput="isDirty=true; ${type}['${key}'].color=this.value; if(typeof draw === 'function') draw();"></td>
            <td style="width:40px;"><button class="btn-danger" style="padding:5px 10px; border:none;" onclick="isDirty=true; delete ${type}['${key}']; openGlobalConfig('${tab}');">×</button></td>
        </tr>`;

    let html = "";
    if (tab === 'task') {
        html = `<h4>Kennungen</h4><div class="addr-table-container"><table class="bc-table">${Object.entries(configKeys).map(([k,v]) => renderRow(k,v,'configKeys')).join('')}</table></div><button class="btn btn-add" style="margin-top:10px;" onclick="configKeys['id_'+Date.now()]={label:'Neu',color:'#3498db'}; openGlobalConfig('task');">+ Kennung</button>`;
    } else if (tab === 'regions') {
        html = `<h4>Gebiets-Hierarchie</h4><div class="addr-table-container"><table class="bc-table"><thead><tr><th>Name</th><th>Aktion</th></tr></thead><tbody>${renderRegionTree(null, 0)}</tbody></table></div><button class="btn btn-add" style="margin-top:10px;" onclick="regions.push({id:'reg'+Date.now(), name:'Neues Gebiet', parentId:null}); openGlobalConfig('regions');">+ Hauptregion</button>`;
    } else if (tab === 'countries') {
        html = `<h4>Länderverwaltung</h4><div class="addr-table-container"><table class="bc-table">${countries.map((c, i) => `<tr><td><input type="text" value="${c}" onchange="isDirty=true; countries[${i}]=this.value"></td><td><button class="btn-danger" style="padding:5px 10px; border:none;" onclick="countries.splice(${i},1); openGlobalConfig('countries');">×</button></td></tr>`).join('')}</table></div><button class="btn btn-add" style="margin-top:10px;" onclick="countries.push('Neues Land'); openGlobalConfig('countries');">+ Land</button>`;
    } else if (tab === 'sys') {
        html = `<h4>System</h4><div class="bc-card"><div class="bc-card-body"><label>Sprache</label><select onchange="isDirty=true; tempLang=this.value;"><option value="de" ${lang==='de'?'selected':''}>Deutsch</option><option value="en" ${lang==='en'?'selected':''}>English</option><option value="us" ${lang==='us'?'selected':''}>English (US)</option></select></div></div>`;
    }

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header">
            <button class="tab-btn ${tab==='task'?'active':''}" onclick="openGlobalConfig('task')">Kennungen</button>
            <button class="tab-btn ${tab==='regions'?'active':''}" onclick="openGlobalConfig('regions')">Gebiete</button>
            <button class="tab-btn ${tab==='countries'?'active':''}" onclick="openGlobalConfig('countries')">Länder</button>
            <button class="tab-btn ${tab==='sys'?'active':''}" onclick="openGlobalConfig('sys')">System</button>
        </div>
        <div class="modal-body active">${html}</div>
        <div class="footer"><button class="btn btn-add" onclick="saveConfig()">💾 Speichern</button><button class="btn" onclick="safeCloseModal()">Abbrechen</button></div>`;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function renderRegionTree(pid, indent) {
    return regions.filter(r => r.parentId == pid).map(r => `
        <tr>
            <td style="padding-left:${indent * 25}px;">${indent > 0 ? '└─ ' : ''}<input type="text" value="${r.name}" onchange="isDirty=true; regions.find(x=>x.id=='${r.id}').name=this.value" style="border:none; background:transparent; width:80%;"></td>
            <td>
                <button class="btn" style="padding:2px 8px; font-size:10px;" onclick="regions.push({id:'reg'+Date.now(), name:'Untergebiet', parentId:'${r.id}'}); openGlobalConfig('regions');">+</button>
                <button class="btn-danger" style="padding:2px 8px; font-size:10px;" onclick="regions=regions.filter(x=>x.id!='${r.id}' && x.parentId!='${r.id}'); openGlobalConfig('regions');">×</button>
            </td>
        </tr>${renderRegionTree(r.id, indent + 1)}`).join('');
}

function saveConfig() { saveData(); if (tempLang !== lang) location.reload(); else { closeModal(); if(typeof draw === 'function') draw(); } }

function saveConfig() { saveData(); if (tempLang !== lang) location.reload(); else { closeModal(); draw(); } }
