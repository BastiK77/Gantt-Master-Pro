/**
 * js/core/gantt-engines.js - Berechnungs- & Kalender-Engine (Enterprise Standard)
 * FEATURES: Grobplanungsschutz (Fixierung der Uhrzeiten im Monatsmodus) & Wochenstart-Support
 */
var globalHolidays = JSON.parse(localStorage.getItem('gantt_holidays')) || {
    '2026-01-01': { label: "Neujahr", regionId: "r1" },
    '2026-05-01': { label: "Tag der Arbeit", regionId: "r1" },
    '2026-12-25': { label: "1. Weihnachtstag", regionId: "r1" }
};
var globalVacations = JSON.parse(localStorage.getItem('gantt_vacations')) || [];
var configWorkingWeekends = JSON.parse(localStorage.getItem('gantt_cfg_weekends')) || [0, 6]; 

function getWeekNumber(d) {
    let date = new Date(d.getTime());
    if (lang === 'us') { 
        let onejan = new Date(date.getFullYear(), 0, 1);
        return Math.ceil((((date.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    }
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getAllChildRegionIds(parentIds) {
    let results = [...parentIds];
    if (!regions) return results;
    let children = regions.filter(r => parentIds.includes(r.parentId)).map(r => r.id);
    if (children.length > 0) results = results.concat(getAllChildRegionIds(children));
    return results;
}

function getFilteredTechs() {
    if (!activeRegionFilters || activeRegionFilters.length === 0) return techs || [];
    const allAllowedIds = getAllChildRegionIds(activeRegionFilters);
    return (techs || []).filter(t => allAllowedIds.includes(t.regionId));
}

function isNonWorkingDay(date, resObj) {
    if (!resObj) return false;
    if (resObj.type !== 'worker') return false; 

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    let activeHolidayRegion = (resObj.holidayRegionOverride && resObj.holidayRegionOverride !== 'inherit') 
        ? resObj.holidayRegionOverride 
        : resObj.regionId;

    const allowedRegions = getAllChildRegionIds([activeHolidayRegion]);

    if (globalHolidays[dateStr]) {
        let hItem = globalHolidays[dateStr];
        if (allowedRegions.includes(hItem.regionId) || hItem.regionId === "r1") return true; 
    }
    for (let vac of globalVacations) {
        if (dateStr >= vac.start && dateStr <= vac.end) {
            if (allowedRegions.includes(vac.regionId)) return true;
        }
    }

    let activeWeekends = configWorkingWeekends;
    if (resObj.weekendOverride && resObj.weekendOverride !== 'inherit') {
        if (resObj.weekendOverride === 'none') activeWeekends = []; 
        else activeWeekends = resObj.weekendOverride.split(',').map(x => parseInt(x)); 
    }

    if (activeWeekends.includes(date.getDay())) return true;
    return false;
}

// SNAP GRID: Arbeitet nur im stundenbasierten Modul granulär
function snapToGrid(date) {
    if (viewMode !== 'HOUR') {
        // Im Monats/Jahresmodus wird strikt auf den Tagesbeginn genullt
        let d = new Date(date.getTime());
        d.setHours(0,0,0,0);
        return d;
    }
    const interval = 15 * 60 * 1000; 
    return new Date(Math.round(date.getTime() / interval) * interval);
}

/**
 * Hilfsfunktion: Setzt die vordefinierten Uhrzeiten einer Ressource auf ein Zieldatum auf
 */
function applyResourceTimeVorgabe(targetDate, resId) {
    let d = new Date(targetDate.getTime());
    let res = techs.find(t => t.id == resId);
    
    let startTime = "07:00";
    if (res && res.defaultStartTime) startTime = res.defaultStartTime;

    let parts = startTime.split(':');
    d.setHours(parseInt(parts[0]) || 7, parseInt(parts[1]) || 0, 0, 0);
    return d;
}

function applyResourceEndTimeVorgabe(targetDate, resId) {
    let d = new Date(targetDate.getTime());
    let res = techs.find(t => t.id == resId);
    
    let endTime = "16:00";
    if (res && res.defaultEndTime) endTime = res.defaultEndTime;

    let parts = endTime.split(':');
    d.setHours(parseInt(parts[0]) || 16, parseInt(parts[1]) || 0, 0, 0);
    return d;
}
