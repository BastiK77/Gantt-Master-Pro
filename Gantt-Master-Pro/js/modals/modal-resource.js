/**
 * js/modals/modal-resource.js - Stammdaten & Betriebskalender-Overrides
 * FIX: Nutzt resTypes als Datenstamm für Qualifikationen, repariert die Dropdown-Einrückungsoptik.
 */
function openResModal(idx) {
    editingObj = techs[idx];
    const l = i18n[lang];
    isDirty = false;

    if (editingObj.weekendOverride === undefined) editingObj.weekendOverride = "inherit";
    if (editingObj.holidayRegionOverride === undefined) editingObj.holidayRegionOverride = "inherit";
    if (editingObj.hoursPerDay === undefined) editingObj.hoursPerDay = 8.0; 
    if (editingObj.defaultStartTime === undefined) editingObj.defaultStartTime = "07:00";
    if (editingObj.defaultEndTime === undefined) editingObj.defaultEndTime = "16:00";

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header">
            <button type="button" class="tab-btn active">👤 Ressourcen-Stammdaten: ${editingObj.name}</button>
        </div>
        <div class="modal-body active" style="background:#f4f7f6; padding:25px; display:flex; flex-direction:column; gap:20px;">
            
            <!-- FASTTAB 1: ALLGEMEINE STAMMDATEN -->
            <div class="bc-card">
                <div class="bc-card-header">Allgemeine Informationen</div>
                <div class="bc-card-body" oninput="isDirty=true">
                    <div class="grid-2">
                        <div>
                            <label>Anzeigename / Techniker-Rufname</label>
                            <input type="text" id="res-name" value="${editingObj.name}">
                        </div>
                        <div>
                            <!-- FIX: Zugewiesene Qualifikation speichert die ID des neuen resTypes-Baums -->
                            <label>Qualifikation / Anstellungstyp (Skill-Hierarchie)</label>
                            <select id="res-type-id" onchange="isDirty=true">
                                <option value="">- Kein spezifischer Typ (Allrounder) -</option>
                                ${renderResInternalJobOptions(null, 0, editingObj.type)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FASTTAB 2: INDIVIDUELLE ARBEITSZEITVORGABEN -->
            <div class="bc-card" style="border-left: 4px solid var(--success);">
                <div class="bc-card-header" style="color:#27ae60;">⏱️ Individuelles Arbeitszeitprofil (Vertragsvorgabe)</div>
                <div class="bc-card-body" oninput="isDirty=true">
                    <div class="subtask-card" style="grid-template-columns: 1fr 1fr 1fr; gap:15px; background:none; border:none; box-shadow:none; padding:0;">
                        <div>
                            <label>Kapazität Rechnungsstunden / Tag</label>
                            <input type="text" id="res-hours-day" inputmode="decimal" value="${editingObj.hoursPerDay}" style="font-weight:bold; color:#27ae60; background:#fff; border:1px solid var(--border-color); border-radius:4px; padding:8px 12px; height:38px;">
                        </div>
                        <div>
                            <label>Standard Arbeitsbeginn</label>
                            <input type="time" id="res-start-time" value="${editingObj.defaultStartTime}">
                        </div>
                        <div>
                            <label>Standard Arbeitsende</label>
                            <input type="time" id="res-end-time" value="${editingObj.defaultEndTime}">
                        </div>
                    </div>
                </div>
            </div>

            <!-- FASTTAB 3: DISPOSITION & GEBIETSZUSTÄNDIGKEIT -->
            <div class="bc-card">
                <div class="bc-card-header">Einsatzgebiet & Filter-Struktur (Gantt-Ebene)</div>
                <div class="bc-card-body">
                    <div class="grid-2">
                        <div>
                            <label>Zugeordnetes Gantt-Gebiet (Filter-Zugehörigkeit)</label>
                            <select id="res-region-id" onchange="isDirty=true">
                                <option value="">- Global verfügbar (Kein Filter-Ausschluss) -</option>
                                ${renderResInternalRegionOptions(null, 0, editingObj.regionId)}
                            </select>
                        </div>
                        <div>
                            <label>Team-Hierarchie (Untergeordnet zu Vorgesetztem)</label>
                            <select id="res-parent" onchange="isDirty=true">
                                <option value="">- Eigenständige Top-Level Ressource -</option>
                                ${techs.filter(t => t.id !== editingObj.id && !t.parentId).map(t => 
                                    `<option value="${t.id}" ${editingObj.parentId == t.id ? 'selected' : ''}>${t.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FASTTAB 4: BETRIEBSKALENDER OVERRIDES -->
            <div class="bc-card" style="border-left: 4px solid var(--primary);">
                <div class="bc-card-header" style="color:var(--primary-dark);">📆 Arbeitszeit- & Kalendersteuerung (Ulm-Korrektur)</div>
                <div class="bc-card-body" onchange="isDirty=true">
                    <div class="grid-2">
                        <div>
                            <label>Feiertags- & Ferienkalender (Wohnort-Prinzip)</label>
                            <select id="res-holiday-override">
                                <option value="inherit" ${editingObj.holidayRegionOverride === 'inherit' ? 'selected' : ''}>
                                    🔄 Automatisch vom Gantt-Gebiet erben (${getResInternalRegionName(editingObj.regionId)})
                                </option>
                                ${regions.map(r => `
                                    <option value="${r.id}" ${editingObj.holidayRegionOverride === r.id ? 'selected' : ''}>
                                        📍 Override: Kalender aus "${r.name}" erzwingen
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label>Wochenend- / Arbeitszeit-Regelung</label>
                            <select id="res-weekend-override">
                                <option value="inherit" ${editingObj.weekendOverride === 'inherit' ? 'selected' : ''}>🔄 Vom System-Standard erben (Sa + So frei)</option>
                                <option value="0,6" ${editingObj.weekendOverride === '0,6' ? 'selected' : ''}>Samstag & Sonntag arbeitsfrei</option>
                                <option value="0" ${editingObj.weekendOverride === '0' ? 'selected' : ''}>Nur Sonntag arbeitsfrei (6-Tage-Woche)</option>
                                <option value="none" ${editingObj.weekendOverride === 'none' ? 'selected' : ''}>Keine Wochenendsperren (Dauerbereitschaft)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

        </div>
        <div class="footer">
            <button type="button" class="btn btn-danger" style="margin-right:auto;" onclick="deleteResourceDirect(${idx})">Ressource löschen</button>
            <button type="button" class="btn btn-add" onclick="saveResourceDataDirect(${idx})">💾 Stammdaten speichern</button>
            <button type="button" class="btn" onclick="safeCloseModal()">Abbrechen</button>
        </div>`;

    document.getElementById('modal-overlay').style.display = 'flex';
}

// FIX: Holt die Optionen strukturiert und sauber eingerückt direkt aus resTypes
function renderResInternalJobOptions(pid, indent, selectedId) {
    if (typeof resTypes === 'undefined' || !resTypes || !Array.isArray(resTypes)) return '';
    return resTypes.filter(rt => rt.parentId == pid).map(rt => `
        <option value="${rt.id}" ${selectedId == rt.id ? 'selected' : ''}>
            ${"&nbsp;".repeat(indent * 4)}${indent > 0 ? '└─ ' : ''}${rt.name}
        </option>
        ${renderResInternalJobOptions(rt.id, indent + 1, selectedId)}
    `).join('');
}

function renderResInternalRegionOptions(pid, indent, selectedId) {
    if (typeof regions === 'undefined' || !regions) return '';
    return regions.filter(r => r.parentId == pid).map(r => `
        <option value="${r.id}" ${selectedId == r.id ? 'selected' : ''}>
            ${"&nbsp;".repeat(indent * 3)}${indent > 0 ? '└ ' : ''}${r.name}
        </option>
        ${renderResInternalRegionOptions(r.id, indent + 1, selectedId)}
    `).join('');
}

function getResInternalRegionName(id) {
    if(!id || typeof regions === 'undefined' || !regions) return "Global";
    let found = regions.find(r => r.id === id);
    return found ? found.name : "Global";
}

function saveResourceDataDirect(idx) {
    const t = techs[idx];
    t.name = document.getElementById('res-name').value;
    
    // FIX: Schreibt das gewählte Feld sauber in den Ressourcen-Typ (t.type) zurück, um die Zeilenfarbe im Gantt zu triggern
    t.type = document.getElementById('res-type-id').value;
    
    t.regionId = document.getElementById('res-region-id').value;
    t.parentId = document.getElementById('res-parent').value || null;
    t.holidayRegionOverride = document.getElementById('res-holiday-override').value;
    t.weekendOverride = document.getElementById('res-weekend-override').value;
    t.hoursPerDay = parseFloat(document.getElementById('res-hours-day').value) || 8.0;
    t.defaultStartTime = document.getElementById('res-start-time').value;
    t.defaultEndTime = document.getElementById('res-end-time').value;
    
    saveData();
    isDirty = false;
    closeModal();
    if (typeof draw === 'function') draw();
}

function deleteResourceDirect(idx) {
    if(confirm("Ressource löschen?")) {
        techs.splice(idx, 1);
        saveData(); closeModal();
        if (typeof draw === 'function') draw();
    }
}
