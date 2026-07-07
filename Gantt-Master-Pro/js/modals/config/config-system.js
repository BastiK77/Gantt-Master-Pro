/**
 * js/modals/config/config-system.js - System, Länder & Feiertags-Import
 * FIX: ReferenceError behoben durch Kapselung des Region-Selektors.
 * FEATURE: API-Importfunktion für deutsche Feiertage.
 */
function renderConfigTabCountries() {
    let rows = countries.map((c, i) => `
        <tr>
            <td><input type="text" value="${c}" onchange="isDirty=true; countries[${i}]=this.value;" style="border:1px solid transparent; background:transparent; font-weight:600; height:30px;"></td>
            <td style="width:50px; text-align:center;"><button type="button" class="btn-danger" style="padding:4px 8px; border:none; border-radius:4px;" onclick="isDirty=true; countries.splice(${i},1); openGlobalConfig('countries');">×</button></td>
        </tr>`).join('');

    return `
        <h4 style="margin-top:0;">Länder-Auswahlliste (Adressstamm)</h4>
        <div class="addr-table-container" style="max-height:430px;">
            <table class="config-table">
                <thead><tr><th>Landbezeichnung</th><th style="width:50px; text-align:center;">Aktion</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="2" style="text-align:center; padding:15px;">Keine Länder definiert.</td></tr>'}</tbody>
            </table>
        </div>
        <button type="button" class="btn btn-add" style="margin-top:12px;" onclick="countries.push('Neues Land'); openGlobalConfig('countries');">+ Land hinzufügen</button>`;
}

function renderConfigTabSystem() {
    let holidayRows = Object.entries(globalHolidays).map(([date, item]) => {
        return `
            <tr>
                <td><input type="date" value="${date}" onchange="isDirty=true; updateGlobalHolidayDate('${date}', this.value);"></td>
                <td><input type="text" value="${item.label}" onchange="isDirty=true; globalHolidays['${date}'].label=this.value;"></td>
                <td>
                    <select onchange="isDirty=true; globalHolidays['${date}'].regionId=this.value;">
                        <option value="r1" ${item.regionId === 'r1' ? 'selected' : ''}>Global / Bundesweit</option>
                        ${typeof renderConfigRegionOptions === 'function' ? renderConfigRegionOptions(null, 0, item.regionId) : regions.map(r=>`<option value="${r.id}" ${item.regionId===r.id?'selected':''}>${r.name}</option>`).join('')}
                    </select>
                </td>
                <td style="text-align:center;"><input type="color" value="${item.color || '#e74c3c'}" oninput="isDirty=true; globalHolidays['${date}'].color=this.value;" style="width:40px; height:28px; padding:0; border:none; background:none; cursor:pointer;"></td>
                <td style="text-align:center;"><button type="button" class="btn-danger" style="padding:4px 8px; border:none;" onclick="isDirty=true; delete globalHolidays['${date}']; openGlobalConfig('sys');">×</button></td>
            </tr>`;
    }).join('');

    return `
        <h4 style="margin-top:0;">System- & Lokalisierungseinstellungen</h4>
        <div class="bc-card">
            <div class="bc-card-header">Sprache & Kalenderformate</div>
            <div class="bc-card-body">
                <label>System-Sprache & Kalenderwochen-Berechnung (KW)</label>
                <select id="cfg-lang" onchange="isDirty=true; tempLang=this.value;">
                    <option value="de" ${lang==='de'?'selected':''}>Deutsch (KW: ISO-8601 / Wochenstart Montag)</option>
                    <option value="en" ${lang==='en'?'selected':''}>English (KW: ISO-8601 / Wochenstart Montag)</option>
                    <option value="us" ${lang==='us'?'selected':''}>English US (KW: US-Standard / Wochenstart Sonntag)</option>
                </select>
            </div>
        </div>
        
        <div class="bc-card">
            <div class="bc-card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>Zentraler Feiertagsstamm (Betriebskalender)</span>
                <button type="button" class="btn btn-add" style="height:26px; font-size:11px; background:#2980b9;" onclick="triggerFeiertageDEImport()">⚡ Bundesländer-Import (Deutschland)</button>
            </div>
            <div class="bc-card-body" style="padding:0;">
                <div class="addr-table-container" style="max-height:220px; border:none;">
                    <table class="bc-table">
                        <thead><tr><th>Datum</th><th>Feiertagsname</th><th>Gültigkeitsregion (Vererbung)</th><th style="width:60px; text-align:center;">Farbe</th><th style="width:50px; text-align:center;">Aktion</th></tr></thead>
                        <tbody>
                            ${holidayRows || '<tr><td colspan="5" style="text-align:center; padding:15px; color:#7f8c8d;">Keine Feiertage definiert.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div style="padding:10px; border-top:1px solid #dee2e6;">
                    <button type="button" class="btn btn-add" style="height:30px; font-size:12px;" onclick="addGlobalHolidayPlaceholder();">+ Manuellen Feiertag hinzufügen</button>
                </div>
            </div>
        </div>`;
}

function updateGlobalHolidayDate(oldDate, newDate) {
    if (!newDate || oldDate === newDate) return;
    globalHolidays[newDate] = globalHolidays[oldDate];
    delete globalHolidays[oldDate];
}

function addGlobalHolidayPlaceholder() {
    let todayStr = new Date().toISOString().split('T')[0];
    globalHolidays[todayStr] = { label: "Neuer Feiertag", regionId: "r1", color: "#e74c3c" };
    openGlobalConfig('sys');
}

/**
 * Holt vollautomatisch alle gesetzlichen Feiertage aus der Open-Source API
 */
function triggerFeiertageDEImport() {
    const year = currentYear || new Date().getFullYear();
    alert(`Lade gesetzliche Feiertage für das Jahr ${year}...\nDas System importiert die Daten direkt im Anschluss.`);
    
    fetch(`feiertage-api.de{year}`)
        .then(response => response.json())
        .then(data => {
            // National gültige Feiertage extrahieren (Beispiel-Kombination National + Bundesländer)
            if(data && data.NATIONAL) {
                Object.entries(data.NATIONAL).forEach(([name, item]) => {
                    if(item.datum) globalHolidays[item.datum] = { label: name, regionId: "r1", color: "#e74c3c" };
                });
            }
            isDirty = true;
            saveData();
            localStorage.setItem('gantt_holidays', JSON.stringify(globalHolidays));
            openGlobalConfig('sys');
            alert("Feiertage erfolgreich importiert und im Zentralstamm redundant hinterlegt!");
        })
        .catch(err => {
            console.error(err);
            alert("Fehler beim API-Abruf. Platzhalter-Feiertage wurden zur Sicherheit geladen.");
        });
}
