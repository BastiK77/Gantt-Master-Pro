/**
 * js/modals/order/order-helpers.js - Such-Routines & ERP-Lookups für Service-Aufträge
 * FIX: Pointer-Event-Abbrüche korrigiert, Zuweisungen stabilisiert.
 * FEATURE: Adress-Vererbung (Zugehörige Standorte des Debitors werden priorisiert nach oben sortiert).
 */

function lookupCustomerForOrder(orderId) {
    isDirty = true;
    // Alle Adressen vom Typ "Kunde" oder "Konzern" für den Auftraggeber-Stamm sammeln
    const data = addresses.map(a => ({
        id: a.id,
        code: a.addrNr || "ADR",
        display: a.company || a.city,
        info: `${a.type || 'Stamm'} | ${a.city || ''}`
    }));
    
    if (typeof openLookup === 'function') {
        openLookup("Debitor für Service-Auftrag wählen", data, (id, disp, code) => {
            let o = orders.find(x => x.id == orderId);
            if (o) {
                o.customerId = id;
                // Sofortiger Refresh des Editors zur visuellen Aktualisierung der Adressblöcke
                if (typeof openOrderEdit === 'function') {
                    openOrderEdit(orderId, 'details');
                }
            }
        });
    }
}

function lookupTaskLocationField(otId) {
    isDirty = true;
    let ot = orderTasks.find(x => x.id == otId);
    if (!ot) return;
    let o = orders.find(x => x.id == ot.orderId);
    let currentCustomerId = o ? o.customerId : null;

    // ADRESS-VERERBUNG: Wir sortieren die Adressliste so, dass Standorte, die dem 
    // aktuell gewählten Debitor untergeordnet sind (parentId == customerId), ganz oben stehen!
    let sortedAddresses = [...addresses].sort((a, b) => {
        let aIsChild = currentCustomerId && a.parentId === currentCustomerId;
        let bIsChild = currentCustomerId && b.parentId === currentCustomerId;
        if (aIsChild && !bIsChild) return -1;
        if (!aIsChild && bIsChild) return 1;
        return 0;
    });

    const data = sortedAddresses.map(a => {
        let isLinked = currentCustomerId && a.parentId === currentCustomerId;
        return {
            id: a.id,
            code: a.addrNr || "STANDORT",
            display: a.city || "Unbekannter Ort",
            info: isLinked ? "📍 Zugehöriger Kunden-Standort" : `${a.type || 'Adresse'}`
        };
    });

    if (typeof openLookup === 'function') {
        openLookup("Einsatzort (Vorgangs-Standort) wählen", data, (id) => {
            ot.locationId = id;
            if (typeof openOrderEdit === 'function') {
                openOrderEdit(ot.orderId, 'details');
            }
        });
    }
}

function lookupSubTaskEquipmentField(stId, locId) {
    isDirty = true;
    let st = subTasks.find(x => x.id == stId);
    if (!st) return;

    // Ausrüstung sortieren: Maschinen, die physikalisch am gewählten Einsatzort (locId) gemeldet sind, nach oben
    let data = machines.map(m => ({ 
        id: m.id,
        code: m.mNr || "EQ",
        display: m.label || "Komponente", 
        info: m.addressId == locId ? "📍 Am Einsatzort installiert" : "Anderer Standort" 
    })).sort((a, b) => b.info.localeCompare(a.info));

    if (typeof openLookup === 'function') {
        openLookup("Anlage / Komponente zuweisen", data, (id) => {
            st.equipmentId = id;
            let ot = orderTasks.find(x => x.id == st.orderTaskId);
            if (ot && typeof openOrderEdit === 'function') {
                openOrderEdit(ot.orderId, 'details'); 
            }
        });
    }
}

function updateOrderTaskField(id, field, val) {
    let ot = orderTasks.find(x => x.id == id);
    if (ot) { ot[field] = val; isDirty = true; }
}

function updateSubTaskFieldDirect(id, field, val) {
    let st = subTasks.find(x => x.id == id);
    if (st) { st[field] = val; isDirty = true; }
}

function toggleWorklistStatusField(otId) {
    let ot = orderTasks.find(x => x.id == otId);
    if (ot) {
        ot.isInWorklist = !ot.isInWorklist;
        ot.status = ot.isInWorklist ? 'backlog' : 'draft';
        saveData(); 
        openOrderEdit(ot.orderId, 'details');
    }
}

function addOrderTaskWithDefaults(orderId) {
    saveScroll();
    let existing = orderTasks.filter(t => t.orderId == orderId);
    let posStr = ((existing.length + 1) * 10).toString().padStart(4, '0');
    let otId = 'OT' + Date.now();
    orderTasks.push({ id: otId, orderId: orderId, pos: posStr, label: "Neuer Arbeitsvorgang", locationId: "", totalHours: 1, status: 'draft', isInWorklist: false, regionId: "" });
    subTasks.push({ id: 'ST' + Date.now(), orderTaskId: otId, pos: "0010", label: "Haupttätigkeit", hours: 1, actualHours: 0, isDone: false, feedbackText: "" });
    saveData(); 
    openOrderEdit(orderId, 'details');
}

function addSubTaskWithDefaultsField(otId) {
    saveScroll();
    let existing = subTasks.filter(s => s.orderTaskId == otId);
    let posStr = ((existing.length + 1) * 10).toString().padStart(4, '0');
    subTasks.push({ id: 'ST' + Date.now(), orderTaskId: otId, pos: posStr, label: "Zusatzaufgabe", hours: 1, actualHours: 0, isDone: false, feedbackText: "", equipmentId: "" });
    saveData(); 
    openOrderEdit(orderTasks.find(x => x.id == otId).orderId, 'details');
}

function deleteOrderTaskField(otId, orderId) {
    if (confirm("Diesen Vorgang samt aller Checklisten-Einträge löschen?")) {
        orderTasks = orderTasks.filter(x => x.id != otId);
        subTasks = subTasks.filter(x => x.orderTaskId != otId);
        saveData(); 
        openOrderEdit(orderId, 'details');
    }
}

function deleteSubTaskFieldDirect(stId, otId) {
    if (confirm("Diesen Untervorgang löschen?")) {
        subTasks = subTasks.filter(x => x.id != stId);
        saveData(); 
        openOrderEdit(orderTasks.find(x => x.id == otId).orderId, 'details');
    }
}
