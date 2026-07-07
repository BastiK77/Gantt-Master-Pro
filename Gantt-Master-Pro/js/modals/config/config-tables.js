/**
 * config-tables.js - Kennungen, Zeilenfarben, Länderstamm
 */

function renderKennungenTab() {
    return `
        <h4>Einsatz-Kennungen (Balken-Farben)</h4>
        <div class="addr-table-container"><table class="config-table">
            ${Object.entries(configKeys).map(([k,v]) => `
                <tr>
                    <td><input type="text" value="${v.label}" onchange="isDirty=true; configKeys['${k}'].label=this.value"></td>
                    <td style="width:60px;"><input type="color" value="${v.color}" oninput="isDirty=true; configKeys['${k}'].color=this.value; draw();"></td>
                    <td><button class="btn-danger" onclick="delete configKeys['${k}']; openGlobalConfig('task');">×</button></td>
                </tr>`).join('')}
        </table></div>
        <button class="btn btn-add" style="margin-top:10px;" onclick="configKeys['id_'+Date.now()]={label:'Neu',color:'#3498db'}; openGlobalConfig('task');">+ Hinzufügen</button>`;
}

function renderRessourcenTab() {
    return `
        <h4>Ressourcen-Typen (Zeilen-Farben)</h4>
        <div class="addr-table-container"><table class="config-table">
            ${Object.entries(resTypes).map(([k,v]) => `
                <tr>
                    <td><input type="text" value="${v.label}" onchange="isDirty=true; resTypes['${k}'].label=this.value"></td>
                    <td style="width:60px;"><input type="color" value="${v.color}" oninput="isDirty=true; resTypes['${k}'].color=this.value; draw();"></td>
                    <td><button class="btn-danger" onclick="delete resTypes['${k}']; openGlobalConfig('res');">×</button></td>
                </tr>`).join('')}
        </table></div>
        <button class="btn btn-add" style="margin-top:10px;" onclick="resTypes['id_'+Date.now()]={label:'Mitarbeiter',color:'#ffffff'}; openGlobalConfig('res');">+ Hinzufügen</button>`;
}

function renderCountriesTab() {
    return `
        <h4>Länder Auswahlliste</h4>
        <div class="addr-table-container"><table class="config-table">
            ${countries.map((c, i) => `
                <tr>
                    <td><input type="text" value="${c}" onchange="isDirty=true; countries[${i}]=this.value"></td>
                    <td><button class="btn-danger" onclick="countries.splice(${i},1); openGlobalConfig('countries');">×</button></td>
                </tr>`).join('')}
        </table></div>
        <button class="btn btn-add" style="margin-top:10px;" onclick="countries.push('Neues Land'); openGlobalConfig('countries');">+ Hinzufügen</button>`;
}
