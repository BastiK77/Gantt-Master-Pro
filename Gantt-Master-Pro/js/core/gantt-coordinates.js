/**
 * js/core/gantt-coordinates.js - Koordinaten- & Stacking-Engine (Erweitert um HOUR-Schnittstelle)
 */
const StandardEngine = {
    getRange: () => {
        if (viewMode === 'MONTH') {
            return { start: new Date(currentYear, 0, 1), end: new Date(currentYear, 11, 31, 23, 59) };
        } else if (viewMode === 'DAY') {
            return { start: new Date(currentYear, currentMonth, 1), end: new Date(currentYear, currentMonth + 1, 0, 23, 59) };
        } else if (viewMode === 'HOUR') {
            // Feinplanung: Aktuelle Detail-Woche (7 Tage Ansicht)
            let startW = new Date(currentYear, currentMonth, 1);
            return { start: startW, end: new Date(startW.getTime() + 7 * 86400000) };
        }
    },
    dateToX: (d) => {
        const { start, end } = StandardEngine.getRange();
        let totalMs = end - start;
        let currentMs = d - start;
        return UI.headerW + (currentMs / totalMs) * (cStd.width - UI.headerW);
    },
    xToDate: (x) => {
        const { start, end } = StandardEngine.getRange();
        let totalMs = end - start;
        let factor = (x - UI.headerW) / (cStd.width - UI.headerW);
        return snapToGrid(new Date(start.getTime() + factor * totalMs));
    }
};

const TourEngine = {
    getRange: () => ({ start: tourDate, end: new Date(tourDate.getTime() + 3 * 86400000) }),
    dateToX: (d) => UI.headerW + ((new Date(d) - tourDate.getTime()) / 86400000) * ((cTour.width - UI.headerW) / 3),
    xToDate: (x) => snapToGrid(new Date(tourDate.getTime() + ((x - UI.headerW) / ((cTour.width - UI.headerW) / 3)) * 86400000))
};

function calculateStacking() {
    const isT = (viewMode === 'TOUR'), engine = isT ? TourEngine : StandardEngine;
    const { start: vS, end: vE } = engine.getRange();
    const fTechs = getFilteredTechs();
    if(!fTechs) return;

    fTechs.forEach(r => r.slots = 1);
    tasks.forEach(t => t.slot = 0);

    fTechs.forEach(res => {
        let resTasks = tasks.filter(t => t.resId === res.id && t.end >= vS && t.start <= vE).sort((a,b) => a.start - b.start);
        let slots = [];
        resTasks.forEach(t => {
            let placed = false;
            let sComp = (viewMode === 'HOUR' || isT) ? t.start.getTime() : new Date(t.start).setHours(0,0,0,0);
            for(let i=0; i<slots.length; i++) {
                if (slots[i] <= sComp) { t.slot = i; slots[i] = t.end.getTime(); placed = true; break; }
            }
            if(!placed) { t.slot = slots.length; slots.push(t.end.getTime()); }
        });
        res.slots = Math.max(1, slots.length);
    });
}

function getY(idx) { 
    const fTechs = getFilteredTechs(); 
    let y = 0; for(let i=0; i<idx; i++) y += (fTechs[i].slots || 1) * UI.rowH; return y; 
}
