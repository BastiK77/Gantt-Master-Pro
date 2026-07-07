/**
 * js/modals/config/config-trees.js - Hierarchische Bäume (Gebiete & Qualifikationen)
 * FIX: SyntaxError in Zeile 76/79 (Schließende Klammer vor .join) erfolgreich behoben.
 */
function renderConfigTabResTypes() {
    if (!Array.isArray(resTypes)) resTypes = [];
    return `
        <h4 style="margin-top:0;">Hierarchische Ressourcen-Typen & Skill-Matrix</h4>
        <div class="addr-table-container" style="max-height:430px;">
            <table class="bc-table">
                <thead><tr><th>Typ-Bezeichnung (Hierarchie)</th><th style="width:100px; text-align:center;">Zeilenfarbe</th><th style="width:100px; text-align:right;">Aktionen</th></tr></thead>
                <tbody>${renderResTypeTree(null, 0)}</tbody>
            </table>
        </div>
        <button type="button" class="btn btn-add" style="margin-top:12px;" onclick="resTypes.push({id:'rt_'+Date.now(), name:'Neuer Haupttyp', color:'#ffffff', parentId:null}); openGlobalConfig('res');">+ Haupt-Ressourcentyp anlegen</button>`;
}

function renderResTypeTree(pid, indent) {
    if (!resTypes || !Array.isArray(resTypes)) return '';
    return resTypes.filter(rt => rt.parentId == pid).map(rt => {
        let fallbackColor = rt.color || "#ffffff";
        return `
        <tr>
            <td style="padding-left:${indent * 25 + 10}px; vertical-align:middle;">
                ${indent > 0 ? '<span style="color:#bdc3c7; margin-right:4px;">└─</span>' : ''}
                <input type="text" value="${rt.name}" onchange="isDirty=true; resTypes.find(x=>x.id=='${rt.id}').name=this.value;" style="border:1px solid transparent; background:transparent; font-weight:${indent === 0 ? 'bold' : 'normal'}; width:80%; height:28px;">
            </td>
            <td style="text-align:center; vertical-align:middle; width:100px;">
                <input type="color" value="${fallbackColor}" 
                       oninput="isDirty=true; resTypes.find(x=>x.id=='${rt.id}').color=this.value; if(typeof draw === 'function') draw();" 
                       style="width:50px; height:28px; padding:0; border:1px solid #bdc3c7; background:none; cursor:pointer; border-radius:4px;">
            </td>
            <td style="text-align:right; vertical-align:middle; width:100px;">
                <button type="button" class="btn" style="padding:2px 6px; font-size:11px; height:26px; display:inline-flex; margin-right:3px;" onclick="isDirty=true; resTypes.push({id:'rt_'+Date.now(), name:'Untergruppe', color:'${fallbackColor}', parentId:'${rt.id}'}); openGlobalConfig('res');">+</button>
                <button type="button" class="btn-danger" style="padding:2px 6px; font-size:11px; height:26px; display:inline-flex;" onclick="isDirty=true; if(confirm('Untergruppen kaskadierend löschen?')){ deleteResTypeCascade('${rt.id}'); openGlobalConfig('res'); }">×</button>
            </td>
        </tr>
        ${renderResTypeTree(rt.id, indent + 1)}`;
    }).join('');
}

function deleteResTypeCascade(id) {
    resTypes.filter(x => x.parentId === id).forEach(c => deleteResTypeCascade(c.id));
    resTypes = resTypes.filter(x => x.id !== id);
}

function renderConfigTabRegions() {
    return `
        <h4 style="margin-top:0;">Gebiets-Hierarchie & PLZ-Auto-Zonierung</h4>
        <div class="addr-table-container" style="max-height:430px;">
            <table class="bc-table">
                <thead><tr><th>Name (Gebietsebene)</th><th>PLZ-Präfixe (kommagetrennt)</th><th style="width:100px; text-align:right;">Aktionen</th></tr></thead>
                <tbody>${renderRegionTree(null, 0)}</tbody>
            </table>
        </div>
        <button type="button" class="btn btn-add" style="margin-top:12px;" onclick="regions.push({id:'reg'+Date.now(), name:'Neue Hauptregion', parentId:null, zipPatterns:''}); openGlobalConfig('regions');">+ Hauptregion anlegen</button>`;
}

function renderRegionTree(pid, indent) {
    if (!regions) return '';
    return regions.filter(r => r.parentId == pid).map(r => {
        return `
        <tr>
            <td style="padding-left:${indent * 25 + 10}px; vertical-align:middle;">
                ${indent > 0 ? '<span style="color:#bdc3c7; margin-right:4px;">└─</span>' : ''}
                <input type="text" value="${r.name}" onchange="isDirty=true; regions.find(x=>x.id=='${r.id}').name=this.value;" style="border:1px solid transparent; background:transparent; font-weight:${indent === 0 ? 'bold' : 'normal'}; width:80%; height:28px;">
            </td>
            <td style="vertical-align:middle;">
                <input type="text" value="${r.zipPatterns || ''}" placeholder="z.B. 20,21,22" onchange="isDirty=true; regions.find(x=>x.id=='${r.id}').zipPatterns=this.value;" style="font-size:12px; height:28px; padding:2px 8px;">
            </td>
            <td style="text-align:right; vertical-align:middle; width:100px;">
                <button type="button" class="btn" style="padding:2px 6px; font-size:11px; height:26px; display:inline-flex; margin-right:3px;" onclick="isDirty=true; regions.push({id:'reg'+Date.now(), name:'Untergebiet', parentId:'${r.id}', zipPatterns:''}); openGlobalConfig('regions');">+</button>
                <button type="button" class="btn-danger" style="padding:2px 6px; font-size:11px; height:26px; display:inline-flex;" onclick="isDirty=true; if(confirm('Kaskadierend löschen?')){ deleteRegionCascade('${r.id}'); openGlobalConfig('regions'); }">×</button>
            </td>
        </tr>
        ${renderRegionTree(r.id, indent + 1)}`;
    }).join(''); // <- FIX: Die Klammern schließen nun mathematisch korrekt
}

function deleteRegionCascade(id) {
    regions.filter(r => r.parentId === id).forEach(c => deleteRegionCascade(c.id));
    regions = regions.filter(r => r.id !== id);
}
