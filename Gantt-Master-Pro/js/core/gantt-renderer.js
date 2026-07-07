/**
 * js/core/gantt-renderer.js - Grafik- & Canvas-Ausgabe
 * FIX: 1-Tag-Verschiebungsbug im Monatsraster durch Index-Korrektur (i + 1 entfernt) gelöst.
 */
function draw() {
    if (!cStd || !cTour) return;
    const fTechs = getFilteredTechs();
    calculateStacking();

    const isT = (viewMode === 'TOUR'), canvas = isT ? cTour : cStd, ctx = canvas.getContext('2d'), engine = isT ? TourEngine : StandardEngine;
    const units = isT ? 3 : (viewMode === 'MONTH' ? 12 : new Date(currentYear, currentMonth + 1, 0).getDate());
    const unitW = (canvas.width - UI.headerW) / units, totalH = getY(fTechs.length);
    
    if (spacer) spacer.style.height = (totalH + UI.topM) + "px";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(0, UI.topM - scrollTop);
    
    // =========================================================================
    // 1. RASTER & BETRIEBSKALENDER (ZELLEN-HINTERGRÜNDE)
    // =========================================================================
    for (let i = 0; i <= units; i++) {
        let x = UI.headerW + i * unitW;
        
        // FIX: i statt i+1 zur exakten Synchronisation der Monatstage mit dem Wochentags-Index
        let d = isT ? new Date(tourDate.getTime() + i * 86400000) : new Date(currentYear, currentMonth, i);
        
        if (i < units && viewMode !== 'MONTH') {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            
            fTechs.forEach((res, rIdx) => {
                let rowY = getY(rIdx);
                let rowH = (res.slots || 1) * UI.rowH;

                if (typeof isNonWorkingDay === 'function' && isNonWorkingDay(d, res)) {
                    ctx.fillStyle = "rgba(231, 76, 60, 0.04)"; // Standard soft-rot für WE
                    
                    // CUSTOM FEIERTAGE FARBE AUS DEM STAMM
                    if (globalHolidays && globalHolidays[dateStr]) {
                        let activeHolidayRegion = (res.holidayRegionOverride && res.holidayRegionOverride !== 'inherit') 
                            ? res.holidayRegionOverride 
                            : res.regionId;
                        let allowedRegions = typeof getAllChildRegionIds === 'function' ? getAllChildRegionIds([activeHolidayRegion]) : [activeHolidayRegion];
                        
                        let hItem = globalHolidays[dateStr];
                        if (allowedRegions.includes(hItem.regionId) || hItem.regionId === "r1") {
                            let hex = hItem.color || "#e74c3c";
                            ctx.fillStyle = hexToRgbaString(hex, 0.12); // Stärkere Signalfarbe für Feiertag
                        }
                    }
                    ctx.fillRect(x, rowY, unitW, rowH);
                }
            });
        }
        
        ctx.strokeStyle = "#eee"; 
        ctx.lineWidth = 1; 
        ctx.beginPath(); 
        ctx.moveTo(x, 0); 
        ctx.lineTo(x, totalH); 
        ctx.stroke();
    }

    // =========================================================================
    // 2. RESSOURCEN-HEADER & HIERARCHISCHE TEAM-LINIEN
    // =========================================================================
    fTechs.forEach((res, i) => {
        let y = getY(i), h = res.slots * UI.rowH;
        
        let resColor = "#fafafa";
        if (resTypes && Array.isArray(resTypes)) {
            let foundType = resTypes.find(x => x.id === res.type);
            if (foundType) resColor = foundType.color || "#ffffff";
        }
        
        ctx.fillStyle = resColor; 
        ctx.fillRect(0, y, UI.headerW, h);
        ctx.strokeStyle = "#ddd"; 
        ctx.strokeRect(0, y, UI.headerW, h); 
        
        ctx.strokeStyle = "#e0e0e0"; 
        ctx.beginPath(); 
        ctx.moveTo(UI.headerW, y + h); 
        ctx.lineTo(canvas.width, y + h); 
        ctx.stroke();
        
        if (res.parentId) { 
            ctx.strokeStyle = "#bdc3c7"; 
            ctx.lineWidth = 1.5; 
            ctx.beginPath();
            ctx.moveTo(25, y - 20); 
            ctx.lineTo(25, y + 22); 
            ctx.lineTo(40, y + 22); 
            ctx.stroke();
            ctx.lineWidth = 1; 
        }
        
        ctx.fillStyle = "#333"; 
        ctx.font = res.parentId ? "12px sans-serif" : "bold 13px sans-serif";
        ctx.fillText(res.name, res.parentId ? 45 : 15, y + 28);
    });

    // =========================================================================
    // 3. EINSATZ-BALKEN (TASKS) GRAFIK-AUSGABE
    // =========================================================================
    tasks.forEach(t => {
        let rIdx = fTechs.findIndex(r => r.id === t.resId); 
        if (rIdx === -1) return;
        
        let x1 = isT ? engine.dateToX(new Date(t.start).setHours(0,0,0,0)) : engine.dateToX(t.start);
        let x2 = isT ? engine.dateToX(new Date(t.end).setHours(23,59,59,999)) : engine.dateToX(t.end);
        let y = getY(rIdx) + (t.slot * UI.rowH) + 10;
        
        ctx.fillStyle = (t === activeTask) ? "#e67e22" : (configKeys[t.type]?.color || "#3498db");
        let dX = Math.max(UI.headerW, x1), dW = Math.max(5, x2 - dX);
        
        if (x1 < canvas.width && x2 > UI.headerW) {
            ctx.fillRect(dX, y, dW, UI.rowH - 20);
            
            if (dW > 35) { 
                ctx.fillStyle = "white"; 
                ctx.font = "bold 11px sans-serif"; 
                if (typeof buildTaskLabel === 'function') {
                    ctx.fillText(buildTaskLabel(t), dX + 8, y + 18); 
                } else {
                    ctx.fillText(t.label || "Einsatz", dX + 8, y + 18);
                }
            }
        }
    });
    ctx.restore();

    // =========================================================================
    // 4. ZEITLEISTE (HEADER LAYER)
    // =========================================================================
    ctx.fillStyle = "#2c3e50"; 
    ctx.fillRect(0, 0, canvas.width, UI.topM);
    ctx.fillStyle = "white"; 
    ctx.font = "bold 14px sans-serif"; 
    ctx.fillText(i18n[lang].res, 15, 35);
    
    let lastKW = -1;
    for (let i = 0; i < units; i++) {
        let x = UI.headerW + i * unitW;
        let d = isT ? new Date(tourDate.getTime() + i * 86400000) : new Date(currentYear, currentMonth, i + 1);
        
        if (viewMode !== 'MONTH') {
            let kw = typeof getWeekNumber === 'function' ? getWeekNumber(d) : -1;
            if (kw !== lastKW && kw !== -1) {
                ctx.fillStyle = "rgba(255,255,255,0.15)"; 
                ctx.fillRect(x, 2, unitW * (viewMode === 'DAY' ? 7 : 3), 18);
                ctx.fillStyle = "white"; 
                ctx.font = "bold 10px sans-serif"; 
                ctx.fillText("KW " + kw, x + 5, 14);
                lastKW = kw;
            }
        }
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        if (viewMode === 'MONTH') {
            ctx.fillText(i18n[lang].months[i], x + 10, 38);
        } else {
            let dN = new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' }).format(d);
            ctx.font = "9px sans-serif"; 
            ctx.fillText(dN, x + 8, 35);
            ctx.font = "bold 12px sans-serif"; 
            ctx.fillText(d.getDate() + ".", x + 8, 52);
        }
    }
}

function hexToRgbaString(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) {
            c = [c, c, c, c, c, c];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return 'rgba(231, 76, 60, ' + alpha + ')';
}
