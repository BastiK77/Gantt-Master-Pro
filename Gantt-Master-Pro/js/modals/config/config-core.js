/**
 * js/modals/config/config-core.js - Hauptsteuerung & Speicher-Prozeduren
 */
function openGlobalConfig(tab = 'task') {
    const l = i18n[lang];
    isDirty = false;

    // Abwärtskompatibilität für Templates sichern
    Object.keys(configKeys).forEach(k => {
        if (!configKeys[k].templates) {
            configKeys[k].templates = {
                'MONTH': configTextTemplates['MONTH'] || '{orderNr}',
                'DAY': configTextTemplates['DAY'] || '{label}',
                'TOUR': configTextTemplates['TOUR'] || '{start} - {label} ({city})'
            };
        }
    });

    let html = "";
    if (tab === 'task') html = renderConfigTabKeys();
    else if (tab === 'res') html = renderConfigTabResTypes();
    else if (tab === 'regions') html = renderConfigTabRegions();
    else if (tab === 'countries') html = renderConfigTabCountries();
    else if (tab === 'sys') html = renderConfigTabSystem();

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header">
            <button type="button" class="tab-btn ${tab==='task'?'active':''}" onclick="openGlobalConfig('task')">Kennungen/Labels</button>
            <button type="button" class="tab-btn ${tab==='res'?'active':''}" onclick="openGlobalConfig('res')">Ressourcen-Typen</button>
            <button type="button" class="tab-btn ${tab==='regions'?'active':''}" onclick="openGlobalConfig('regions')">Gebiete/PLZ</button>
            <button type="button" class="tab-btn ${tab==='countries'?'active':''}" onclick="openGlobalConfig('countries')">Länder</button>
            <button type="button" class="tab-btn ${tab==='sys'?'active':''}" onclick="openGlobalConfig('sys')">System/Kalender</button>
        </div>
        <div class="modal-body active" style="background:#f4f7f6; padding:20px;">
            ${html}
        </div>
        <div class="footer">
            <button type="button" class="btn btn-add" onclick="saveConfigDataDirect()">💾 Konfiguration speichern</button>
            <button type="button" class="btn" onclick="safeCloseModal()">Abbrechen</button>
        </div>`;
    
    document.getElementById('modal-overlay').style.display = 'flex';
}

function saveConfigDataDirect() {
    // Zentrales Stammregister sichern
    localStorage.setItem('gantt_holidays', JSON.stringify(globalHolidays));
    localStorage.setItem('gantt_cfg_weekends', JSON.stringify(configWorkingWeekends));
    
    saveData();
    isDirty = false;
    
    localStorage.setItem('gantt_cfg_templates', JSON.stringify(configTextTemplates));

    if (tempLang !== lang) {
        localStorage.setItem('gantt_lang', tempLang);
        location.reload(); 
    } else {
        closeModal();
        if (typeof draw === 'function') draw();
    }
}
