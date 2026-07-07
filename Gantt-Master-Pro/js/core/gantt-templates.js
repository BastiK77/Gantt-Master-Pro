/**
 * js/core/gantt-templates.js - Token- & Custom Text-Engine
 */
var configTextTemplates = JSON.parse(localStorage.getItem('gantt_cfg_templates')) || {
    'MONTH': '{orderNr}',
    'DAY': '{label}',
    'TOUR': '{start} - {label} ({city})'
};

function buildTaskLabel(t) {
    let template = configTextTemplates[viewMode] || "{label}";
    
    let orderObj = orders.find(o => o.id == t.orderId) || {};
    let taskObj = orderTasks.find(ot => ot.id == t.orderTaskId) || {};
    let locObj = addresses.find(a => a.id == taskObj.locationId) || {};
    let jobObj = typeof resourceJobs !== 'undefined' ? resourceJobs.find(j => j.id == taskObj.requiredJobId) : null;

    let timeStart = t.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let timeEnd = t.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return template
        .replace(/{label}/g, t.label || taskObj.label || "Einsatz")
        .replace(/{orderNr}/g, orderObj.orderNr || "Keine Nr.")
        .replace(/{pos}/g, taskObj.pos || "0000")
        .replace(/{city}/g, locObj.city || "Kein Ort")
        .replace(/{start}/g, timeStart)
        .replace(/{end}/g, timeEnd)
        .replace(/{job}/g, jobObj ? jobObj.name : "Kein Skill");
}
