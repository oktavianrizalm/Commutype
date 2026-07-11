import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\oktav\\OneDrive\\SIDE\\side\\side\\Commuter Tracking\\static\\krl-routes.geojson', 'utf8'));

const routes = new Set();
data.features.forEach(f => {
    if (f.properties && f.properties.name) {
        routes.add(f.properties.name);
    }
});
console.log(Array.from(routes));
