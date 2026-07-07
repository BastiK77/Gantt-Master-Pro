// gantt-data.js
var UI = { headerW: 240, rowH: 45, topM: 60 };
var lang = localStorage.getItem('gantt_lang') || 'de';
var tempLang = lang;
var viewMode = 'MONTH'; 
var currentYear = new Date().getFullYear();
var currentMonth = new Date().getMonth();
var tourDate = new Date(); tourDate.setHours(0,0,0,0);
var scrollTop = 0;
var activeTask = null;
var editingObj = null;
var isDirty = false;

var lastAddressId = localStorage.getItem('gantt_last_addr') || null;
var lastEquipmentId = localStorage.getItem('gantt_last_eq') || null;

var activeRegionFilters = []; 

// NEU: Globale Feiertags-Visualisierungsfarbe
var configHolidayColor = localStorage.getItem('gantt_cfg_holiday_color') || '#e74c3c';

var resourceJobs = JSON.parse(localStorage.getItem('gantt_res_jobs')) || [
    { id: "j1", name: "Technik", parentId: null },
    { id: "j2", name: "Service-Techniker", parentId: "j1" }
];

var regions = JSON.parse(localStorage.getItem('gantt_regions')) || [
    { id: "r1", name: "Deutschland", parentId: null, zipPatterns: "" },
    { id: "r2", name: "Nord", parentId: "r1", zipPatterns: "20,21,22" }
];

var countries = JSON.parse(localStorage.getItem('gantt_countries')) || ["Deutschland", "Österreich", "Schweiz"];

// ERWEITERT: Kennungen mit standardisierten Tages-Arbeitszeitfenstern
var configKeys = JSON.parse(localStorage.getItem('gantt_config_keys')) || { 
    projekt: { label: "Projekt", color: "#3498db", defaultStart: "07:00", defaultEnd: "16:00", defaultHours: 8 }, 
    service: { label: "Service", color: "#9b59b6", defaultStart: "08:00", defaultEnd: "17:00", defaultHours: 8 } 
};

var resTypes = JSON.parse(localStorage.getItem('gantt_res_types')) || [
    { id: "worker", name: "Mitarbeiter", color: "#ffffff", parentId: null }
];

var addresses = JSON.parse(localStorage.getItem('gantt_addresses')) || [];
var machines = JSON.parse(localStorage.getItem('gantt_machines')) || [];

// ERWEITERT: Ressourcen mit Kapazitäts-Profilen (Start/Ende/Stunden)
var techs = JSON.parse(localStorage.getItem('gantt_techs')) || [];

var orders = JSON.parse(localStorage.getItem('gantt_orders')) || [];
var orderTasks = JSON.parse(localStorage.getItem('gantt_ordertasks')) || [];
var subTasks = JSON.parse(localStorage.getItem('gantt_subtasks')) || [];
var tasks = (JSON.parse(localStorage.getItem('gantt_tasks')) || []).map(t => ({ ...t, start: new Date(t.start), end: new Date(t.end) }));

function saveData() {
    localStorage.setItem('gantt_config_keys', JSON.stringify(configKeys));
    localStorage.setItem('gantt_res_types', JSON.stringify(resTypes));
    localStorage.setItem('gantt_res_jobs', JSON.stringify(resourceJobs));
    localStorage.setItem('gantt_regions', JSON.stringify(regions));
    localStorage.setItem('gantt_countries', JSON.stringify(countries));
    localStorage.setItem('gantt_techs', JSON.stringify(techs));
    localStorage.setItem('gantt_tasks', JSON.stringify(tasks));
    localStorage.setItem('gantt_addresses', JSON.stringify(addresses));
    localStorage.setItem('gantt_machines', JSON.stringify(machines));
    localStorage.setItem('gantt_orders', JSON.stringify(orders));
    localStorage.setItem('gantt_ordertasks', JSON.stringify(orderTasks));
    localStorage.setItem('gantt_subtasks', JSON.stringify(subTasks));
    localStorage.setItem('gantt_lang', tempLang);
    localStorage.setItem('gantt_last_addr', lastAddressId);
    localStorage.setItem('gantt_last_eq', lastEquipmentId);
    localStorage.setItem('gantt_cfg_holiday_color', configHolidayColor);
}
