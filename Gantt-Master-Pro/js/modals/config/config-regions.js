/**
 * config-regions.js - Unendliche Gebietshierarchie & PLZ-Muster
 */

function renderRegionsTab() {
    return `
        <h4>Hierarchische Gebiete & PLZ</h4>
        <div class="addr-table-container"><table class="bc-table">
            <thead><tr><th>Gebiet</th><th>PLZ-Filter</th><th style="width:90px; text-align:right;">Aktion</th></tr></thead>
            <tbody>${renderRegionConfigTree(null, 0)}</tbody>
        </table></div>
        <button class="btn btn-add" style="margin-top:10px;" onclick="regions.push({id:'reg'+Date.now(), name:'Neue Region', parentId:null, zipPatterns:''}); openGlobalConfig('regions');">+ Hauptregion</button>`;
}

function renderRegionConfigTree(pid, indent) {
    if (!regions) return '';
    return regions.filter(r => r.parentId == pid).map(r => `
        <tr>
            <td style="padding-left:${indent * 25 + 10}px;">
                ${indent > 0 ? '<span style="color:#bdc3c7;">└─</span>' : ''}
                <input type="text" value="${r.name}" onchange="isDirty=true; regions.find(x=>x.id=='${r.id}').name=this.value" style="border:none; background:transparent; font-weight:${indent===0?'bold':'normal'}; height:28px;">
            </td>
            <td><input type="text" value="${r.zipPatterns || ''}" placeholder="z.B. 10,12" onchange="isDirty=true; regions.find(x=>x.id=='${r.id}').zipPatterns=this.value" style="height:28px;"></td>
            <td style="text-align:right;">
                <button class="btn" style="padding:2px 6px; display:inline-flex;" onclick="regions.push({id:'reg'+Date.now(), name:'Untergebiet', parentId:'${r.id}', zipPatterns:''}); openGlobalConfig('regions');">+</button>
                <button class="btn-danger" style="padding:2px 6px; display:inline-flex;" onclick="cascadeDeleteRegion('${r.id}'); openGlobalConfig('regions');">×</button>
            </td>
        </tr>${renderRegionConfigTree(r.id, indent + 1)}`).join('');
}

function cascadeDeleteRegion(id) {
    regions.filter(r => r.parentId === id).forEach(c => cascadeDeleteRegion(c.id));
    regions = regions.filter(r => r.id !== id);
    isDirty = true;
}
