import fs from 'fs';

const allStations = JSON.parse(fs.readFileSync('C:\\Users\\oktav\\OneDrive\\SIDE\\side\\side\\Commutype\\src\\routes\\all-stations.json', 'utf8'));

// Lin Bogor
const bogorLineNames = [
    "Jakarta Kota", "Jayakarta", "Mangga Besar", "Sawah Besar", "Juanda", 
    "Gondangdia", "Cikini", "Manggarai", "Tebet", "Cawang", "Duren Kalibata", 
    "Pasar Minggu Baru", "Pasar Minggu", "Tanjung Barat", "Lenteng Agung", 
    "Universitas Pancasila", "Universitas Indonesia", "Pondok Cina", "Depok Baru", 
    "Depok", "Citayam", "Bojonggede", "Cilebut", "Bogor"
];

// Lin Nambo
const namboLineNames = [
    "Jakarta Kota", "Jayakarta", "Mangga Besar", "Sawah Besar", "Juanda", 
    "Gondangdia", "Cikini", "Manggarai", "Tebet", "Cawang", "Duren Kalibata", 
    "Pasar Minggu Baru", "Pasar Minggu", "Tanjung Barat", "Lenteng Agung", 
    "Universitas Pancasila", "Universitas Indonesia", "Pondok Cina", "Depok Baru", 
    "Depok", "Citayam", "Pondok Rajeg", "Cibinong", "Nambo"
];

// Lin Rangkasbitung
const rangkasLineNames = [
    "Tanah Abang", "Palmerah", "Kebayoran", "Pondok Ranji", "Jurangmangu", 
    "Sudimara", "Rawa Buntu", "Serpong", "Cisauk", "Cicayur", "Parung Panjang", 
    "Cilejit", "Daru", "Tenjo", "Tigaraksa", "Cikoya", "Maja", "Citeras", "Rangkasbitung"
];

// Lin Tangerang
const tangerangLineNames = [
    "Duri", "Grogol", "Pesing", "Taman Kota", "Bojong Indah", "Rawa Buaya", 
    "Kalideres", "Poris", "Batu Ceper", "Tanah Tinggi", "Tangerang"
];

// Lin Cikarang (via Manggarai)
const cikarangLineNames = [
    "Cikarang", "Metland Telagamurni", "Cibitung", "Tambun", "Bekasi Timur", 
    "Bekasi", "Kranji", "Cakung", "Klender Baru", "Buaran", "Klender", 
    "Jatinegara", "Matraman", "Manggarai", "Sudirman", "Sudirman Baru/BNI City", "Karet", "Tanah Abang", 
    "Duri", "Angke", "Kampung Bandan"
];

// Lin Tanjung Priuk
const priokLineNames = [
    "Jakarta Kota", "Kampung Bandan", "Ancol", "Tanjung Priuk"
];

function getStations(names) {
    const list = [];
    names.forEach(name => {
        if (allStations[name]) {
            list.push({ name, lat: allStations[name][0], lon: allStations[name][1] });
        } else {
            console.warn("Peringatan: Stasiun tidak ditemukan di JSON ->", name);
        }
    });
    return list;
}

const bogorStations = getStations(bogorLineNames);
const namboStations = getStations(namboLineNames);
const rangkasStations = getStations(rangkasLineNames);
const tangerangStations = getStations(tangerangLineNames);
const cikarangStations = getStations(cikarangLineNames);
const priokStations = getStations(priokLineNames);

// Bounding Box (Masih diperlukan untuk kebutuhan referensi jika nanti kembali ke SVG statis murni)
const allSelectedStations = [...bogorStations, ...namboStations, ...rangkasStations, ...tangerangStations, ...cikarangStations, ...priokStations];
let minLat = Infinity, maxLat = -Infinity;
let minLon = Infinity, maxLon = -Infinity;

allSelectedStations.forEach(s => {
    if (s.lat < minLat) minLat = s.lat;
    if (s.lat > maxLat) maxLat = s.lat;
    if (s.lon < minLon) minLon = s.lon;
    if (s.lon > maxLon) maxLon = s.lon;
});

const PADDING = 60;
const CANVAS_SIZE = 800;
const USABLE_SIZE = CANVAS_SIZE - (PADDING * 2);

const latRange = maxLat - minLat;
const lonRange = maxLon - minLon;
const maxRange = Math.max(latRange, lonRange);

function project(lat, lon) {
    const x = PADDING + ((lon - minLon) / maxRange) * USABLE_SIZE;
    const y = PADDING + ((maxLat - lat) / maxRange) * USABLE_SIZE;
    return { x, y };
}

function processRoute(id, name, color, stations) {
    const projected = stations.map(s => ({
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        ...project(s.lat, s.lon)
    }));

    const pathD = "M " + projected.map(s => `${s.x.toFixed(2)} ${s.y.toFixed(2)}`).join(" L ");

    return { id, name, color, stations: projected, pathD };
}

const routes = [
    processRoute('bogor', 'Lin Bogor', '#D32E2B', bogorStations),
    processRoute('nambo', 'Lin Nambo', '#D32E2B', namboStations),
    processRoute('cikarang', 'Lin Cikarang', '#03a9f4', cikarangStations), // Biru
    processRoute('rangkas', 'Lin Rangkasbitung', '#00A651', rangkasStations),
    processRoute('tangerang', 'Lin Tangerang', '#8b4513', tangerangStations), // Coklat
    processRoute('priok', 'Lin Tanjung Priuk', '#e91e63', priokStations) // Pink
];

const dir = 'C:\\Users\\oktav\\OneDrive\\SIDE\\side\\side\\Commutype\\src\\lib\\data';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const fileContent = `// File ini dibuat otomatis oleh scripts/generate_map.js
export const routes = ${JSON.stringify(routes, null, 2)};
`;

fs.writeFileSync(`${dir}\\routes.ts`, fileContent);
console.log("Berhasil memperbarui rute lengkap!");
