/**
 * js/modals/modal-help.js - Die vollständige Dokumentation
 */
function openHelp() {
    const l = i18n[lang];
    
    // Sicherstellen, dass das Modal die Standardgröße hat (nicht modal-xl)
    const modalEl = document.getElementById('modal-box').parentElement.querySelector('.modal');
    if(modalEl) modalEl.className = 'modal'; 

    document.getElementById('modal-box').innerHTML = `
        <div class="tab-header">
            <button class="tab-btn active">❓ ${l.help_title || 'System-Dokumentation'}</button>
        </div>
        <div class="modal-body active" style="font-size:14px; line-height:1.5;">
            
            <!-- SEKTION 1: MAUS -->
            <div class="bc-card">
                <div class="bc-card-header">🖱️ Steuerung im Kalender</div>
                <div class="bc-card-body">
                    <ul style="margin:0; padding-left:20px;">
                        <li><b>Klick auf Balken:</b> Öffnet die Einsatz-Details.</li>
                        <li><b>Klick auf Ressource:</b> Öffnet die Mitarbeiter-Stammdaten.</li>
                        <li><b>Shift + Ziehen:</b> Erzeugt einen neuen Einsatz.</li>
                        <li><b>Strg + Ziehen:</b> Kopiert einen Einsatz (Clone).</li>
                        <li><b>Ränder ziehen:</b> Ändert die Dauer (Resizing).</li>
                        <li><b>Balken schieben:</b> Verschiebt den Einsatz zeitlich oder auf andere Personen.</li>
                    </ul>
                </div>
            </div>

            <!-- SEKTION 2: AUFTRÄGE -->
            <div class="bc-card">
                <div class="bc-card-header">📋 Auftrags-Management (APS)</div>
                <div class="bc-card-body">
                    <p style="margin-bottom:10px;">Ein Auftrag (📋) besteht aus einer Hierarchie:</p>
                    <ul style="margin:0; padding-left:20px;">
                        <li><b>Vorgang (Task):</b> Die planbare Einheit für den Kalender (Einsatz). Hier wird der Standort und das Startdatum festgelegt.</li>
                        <li><b>Untervorgang (Sub-Task):</b> Technische Einzeltätigkeit an einer Maschine.</li>
                        <li><b>Kalkulation:</b> Die Soll-Stunden des Vorgangs summieren sich automatisch aus den Zeiten der Untervorgänge.</li>
                    </ul>
                </div>
            </div>

            <!-- SEKTION 3: WORKLIST -->
            <div class="bc-card">
                <div class="bc-card-header">📥 Worklist & Disposition</div>
                <div class="bc-card-body">
                    <p>Nutzen Sie den Button <b>"Senden"</b> im Auftrag, um einen Vorgang in die Worklist zu schieben. Von dort aus kann er per Drag-and-Drop einem Techniker zugewiesen werden.</p>
                </div>
            </div>

            <!-- SEKTION 4: SYSTEM -->
            <div class="bc-card">
                <div class="bc-card-header">🌍 Internationalisierung</div>
                <div class="bc-card-body">
                    <p>In den Einstellungen (🛠️) können Sie auf <b>US</b> umstellen. Dies ändert den Wochenstart auf Sonntag und berechnet die Kalenderwochen nach US-Standard.</p>
                </div>
            </div>

        </div>
        <div class="footer">
            <button class="btn btn-add" onclick="closeModal()">${l.done || 'Verstanden'}</button>
        </div>`;
        
    document.getElementById('modal-overlay').style.display = 'flex';
}
