/**
 * js/modals/modal-lookup.js - Globale Overlay- & Lookup-Engine
 * REPARATUR-RELEASE: Behebt den "callback is not defined" Fehler durch globale Kapselung
 */

function openLookup(title, data, callback, customHTML = false) {
    const lookupOverlay = document.getElementById('lookup-overlay');
    
    if (lookupOverlay) {
        lookupOverlay.style.display = 'flex';
    }

    if (customHTML) return; 

    // Wir speichern den Callback global auf dem window-Objekt, damit er beim Klick existiert!
    window.currentLookupCallback = callback;

    let rows = data.map(item => {
        // Sicherstellen, dass einfache Anführungszeichen im Text nicht das HTML brechen
        let safeDisplay = item.display ? item.display.replace(/'/g, "\\'") : '';
        let safeCode = item.code ? item.code.replace(/'/g, "\\'") : '';
        
        return `
            <tr onclick="executeLookupCallback('${item.id}', '${safeDisplay}', '${safeCode}');" style="cursor:pointer;">
                <td><b style="color:#2c3e50;">${item.code || ''}</b></td>
                <td><b>${item.display || ''}</b></td>
                <td><small style="color:#666; font-weight:600;">${item.info || ''}</small></td>
            </tr>`;
    }).join('');

    document.getElementById('lookup-box').innerHTML = `
        <div class="tab-header"><button type="button" class="tab-btn active">🔍 ${title}</button></div>
        <div class="modal-body active" style="background:#f4f7f6; padding:20px;">
            <div class="addr-table-container">
                <table class="bc-table">
                    <thead><tr><th style="width:120px;">Code / ID</th><th>Bezeichnung</th><th>System-Kontext</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="3" style="text-align:center; padding:20px;">Keine Datensätze verfügbar.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
        <div class="footer"><button type="button" class="btn" onclick="closeLookup()">Abbrechen</button></div>`;
}

/**
 * Feste, globale Funktion, die vom onclick-Event der Tabellenzeile aufgerufen wird
 */
function executeLookupCallback(id, display, code) {
    if (typeof window.currentLookupCallback === 'function') {
        window.currentLookupCallback(id, display, code);
    }
    closeLookup();
}

function closeLookup() {
    const lookupOverlay = document.getElementById('lookup-overlay');
    if (lookupOverlay) {
        lookupOverlay.style.display = 'none';
    }
    window.currentLookupCallback = null; // Speicher freigeben
}

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const lookupOverlay = document.getElementById('lookup-overlay');
    
    if (modalOverlay) modalOverlay.style.display = 'none';
    if (lookupOverlay) lookupOverlay.style.display = 'none';
    isDirty = false; 
}

function safeCloseModal() {
    if (isDirty) {
        if (confirm("⚠️ Achtung: Sie haben ungespeicherte Änderungen vorgenommen.\n\nWollen Sie das Fenster wirklich schließen und die Daten verwerfen?")) {
            closeModal();
        }
    } else {
        closeModal();
    }
}
