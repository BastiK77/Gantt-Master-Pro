/**
 * js/modals/config/config-labels.js - UI für Balkenbeschriftungen, Kennungen & Standard-Kapazitäten
 */
function renderConfigTabKeys() {
    let rows = Object.entries(configKeys).map(([k, v]) => {
        if (!v.defaultStart) v.defaultStart = "07:00";
        if (!v.defaultEnd) v.defaultEnd = "16:00";
        if (!v.defaultHours) v.defaultHours = 8;
        
        return `
        <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="vertical-align: top; padding-top: 15px;">
                <input type="text" value="${v.label}" onchange="isDirty=true; configKeys['${k}'].label=this.value;" style="font-weight:bold; border:1px solid #bdc3c7; height:32px;">
                <div style="margin-top:8px; display:flex; flex-direction:column; gap:4px; background:#fdfdfd; padding:6px; border:1px solid #e2e5e7; border-radius:4px;">
                    <span style="font-size:10px; font-weight:bold; color:#555;">⏱️ STANDARD-ARBEITSZEIT:</span>
                    <div style="display:flex; align-items:center; gap:4px;"><span style="font-size:10px; width:35px;">Von:</span><input type="text" value="${v.defaultStart}" onchange="isDirty=true; configKeys['${k}'].defaultStart=this.value;" style="height:22px; font-size:11px; padding:2px;"></div>
                    <div style="display:flex; align-items:center; gap:4px;"><span style="font-size:10px; width:35px;">Bis:</span><input type="text" value="${v.defaultEnd}" onchange="isDirty=true; configKeys['${k}'].defaultEnd=this.value;" style="height:22px; font-size:11px; padding:2px;"></div>
                    <div style="display:flex; align-items:center; gap:4px;"><span style="font-size:10px; width:35px;">Std/T:</span><input type="text" inputmode="decimal" value="${v.defaultHours}" onchange="isDirty=true; configKeys['${k}'].defaultHours=parseFloat(this.value)||8;" style="height:22px; font-size:11px; padding:2px; text-align:center; font-weight:bold; color:#0078d4;"></div>
                </div>
            </td>
            <td style="vertical-align: top; padding-top: 15px; text-align:center;">
                <input type="color" value="${v.color}" oninput="isDirty=true; configKeys['${k}'].color=this.value; if(typeof draw === 'function') draw();" style="width:45px; height:32px;">
            </td>
            <td style="padding: 10px;">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; align-items:center; gap:5px;"><span style="font-size:10px; width:45px; font-weight:bold; color:#7f8c8d;">JAHR:</span><input type="text" value="${v.templates?.MONTH || '{orderNr}'}" onchange="isDirty=true; configKeys['${k}'].templates.MONTH=this.value;" style="height:24px; font-size:11px; padding:2px 6px;"></div>
                    <div style="display:flex; align-items:center; gap:5px;"><span style="font-size:10px; width:45px; font-weight:bold; color:#7f8c8d;">MONAT:</span><input type="text" value="${v.templates?.DAY || '{label}'}" onchange="isDirty=true; configKeys['${k}'].templates.DAY=this.value;" style="height:24px; font-size:11px; padding:2px 6px;"></div>
                    <div style="display:flex; align-items:center; gap:5px;"><span style="font-size:10px; width:45px; font-weight:bold; color:#7f8c8d;">TOUR:</span><input type="text" value="${v.templates?.TOUR || '{label}'}" onchange="isDirty=true; configKeys['${k}'].templates.TOUR=this.value;" style="height:24px; font-size:11px; padding:2px 6px;"></div>
                </div>
            </td>
            <td style="vertical-align: top; padding-top: 15px; text-align:center;">
                <button type="button" class="btn-danger" style="padding:4px 8px; border:none; cursor:pointer; border-radius:4px;" onclick="isDirty=true; delete configKeys['${k}']; openGlobalConfig('task');">×</button>
            </td>
        </tr>`;
    }).join('');

    return `
        <h4 style="margin-top:0;">Einsatz-Kennungen & Dynamische Balken-Labels</h4>
        <p style="font-size:11px; color:#666; margin-bottom:12px;">Definieren Sie hier Standard-Arbeitszeiten sowie Text-Templates pro Kalenderansicht.</p>
        <div class="addr-table-container" style="max-height:430px;">
            <table class="bc-table">
                <thead><tr><th>Kennung / Vorgabe-Zeiten</th><th style="width:70px; text-align:center;">Farbe</th><th>Individuelle Text-Templates pro Kalenderansicht</th><th style="width:50px; text-align:center;">Aktion</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <button type="button" class="btn btn-add" style="margin-top:12px;" onclick="configKeys['id_'+Date.now()]={label:'Neue Kennung',color:'#3498db',defaultStart:'07:00',defaultEnd:'16:45',defaultHours:8,templates:{MONTH:'{orderNr}',DAY:'{label}',TOUR:'{start} - {label}'}}; openGlobalConfig('task');">+ Neue Kennung anlegen</button>`;
}
