<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { playerState, botState, gameState } from '$lib/stores';
    import { routes } from '$lib/data/routes';

    let mapElement: HTMLElement;
    let map: any; 
    let L: any; 

    let tileLayer: any;
    let routePolyline: any;
    let stationMarkers: any[] = [];
    let playerMarker: any;
    let botMarker: any;

    let activeRoute = $derived(routes.find(r => r.id === $gameState.selectedRouteId) || routes[0]);
    
    // Gunakan fungsi biasa agar selalu mengambil data stasiun terbaru
    function getStations() {
        return activeRoute.stations;
    }

    const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    function interpolatePos(stationList: any[], distanceIndex: number, percentage: number) {
        if (distanceIndex === 0) {
            // Kereta dipanaskan (engine start), belum bergerak dari stasiun 0
            return { lat: stationList[0].lat, lon: stationList[0].lon };
        }
        
        const startIdx = distanceIndex - 1;
        const endIdx = distanceIndex;
        
        if (endIdx >= stationList.length) {
            return { lat: stationList[stationList.length - 1].lat, lon: stationList[stationList.length - 1].lon };
        }
        
        const start = stationList[startIdx];
        const end = stationList[endIdx];
        const lat = start.lat + (end.lat - start.lat) * (percentage / 100);
        const lon = start.lon + (end.lon - start.lon) * (percentage / 100);
        return { lat, lon };
    }

    let unsubPlayer: () => void;
    let unsubBot: () => void;
    let unsubGame: () => void;

    onMount(async () => {
        const leaflet = await import('leaflet');
        L = leaflet.default;

        const currentStations = getStations();
        const startPos = currentStations[0];
        
        map = L.map(mapElement, {
            zoomControl: false,
            attributionControl: false
        }).setView([startPos.lat, startPos.lon], 14);

        tileLayer = L.tileLayer($gameState.mapTheme === 'dark' ? CARTO_DARK : CARTO_LIGHT).addTo(map);

        drawRoute();

        const playerIcon = L.divIcon({
            className: 'player-marker',
            html: `<div style="background-color:#4caf50; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.8);">P</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        playerMarker = L.marker([startPos.lat, startPos.lon], { icon: playerIcon, zIndexOffset: 1000 }).addTo(map);

        if ($gameState.gameMode === 'vs-bot') {
            const botIcon = L.divIcon({
                className: 'bot-marker',
                html: `<div style="background-color:#2196f3; width: 20px; height: 20px; border-radius: 4px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; box-shadow: 0 0 10px rgba(0,0,0,0.8);">B</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            botMarker = L.marker([startPos.lat, startPos.lon], { icon: botIcon, zIndexOffset: 900 }).addTo(map);
        }

        // Langsung subscribe ke Svelte Store (Lebih aman dari $effect untuk update cepat)
        unsubPlayer = playerState.subscribe(state => {
            if (playerMarker && map) {
                const sts = getStations();
                const pos = interpolatePos(sts, state.totalDistance, state.wordCompletionPercentage);
                playerMarker.setLatLng([pos.lat, pos.lon]);
                
                // Gunakan animate: false agar ketikan super cepat tidak membuat animasi Leaflet crash/stutter
                map.setView([pos.lat, pos.lon], map.getZoom(), { animate: false });
                
                stationMarkers.forEach((m, i) => {
                    // Stasiun diwarnai hijau HANYA jika sudah benar-benar dilewati/berangkat
                    if (i < state.totalDistance) {
                        m.setStyle({ fillColor: '#4caf50', color: '#fff' }); 
                    } else {
                        m.setStyle({ fillColor: '#fff', color: activeRoute.color });
                    }
                });
            }
        });

        unsubBot = botState.subscribe(state => {
            if (botMarker && $gameState.gameMode === 'vs-bot') {
                const sts = getStations();
                const pos = interpolatePos(sts, state.totalDistance, state.completionPercentage);
                botMarker.setLatLng([pos.lat, pos.lon]);
            }
        });

        unsubGame = gameState.subscribe(state => {
            if (tileLayer) {
                const url = state.mapTheme === 'dark' ? CARTO_DARK : CARTO_LIGHT;
                if (tileLayer._url !== url) {
                    tileLayer.setUrl(url);
                }
            }
        });
    });

    onDestroy(() => {
        if (unsubPlayer) unsubPlayer();
        if (unsubBot) unsubBot();
        if (unsubGame) unsubGame();
        if (map) map.remove();
    });

    function drawRoute() {
        if (!map || !L) return;
        
        if (routePolyline) map.removeLayer(routePolyline);
        stationMarkers.forEach(m => map.removeLayer(m));
        stationMarkers = [];

        const currentStations = getStations();
        const latlngs = currentStations.map(s => [s.lat, s.lon]);
        
        routePolyline = L.polyline(latlngs, {
            color: activeRoute.color,
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        currentStations.forEach(s => {
            const marker = L.circleMarker([s.lat, s.lon], {
                radius: 4,
                fillColor: '#fff',
                color: activeRoute.color,
                weight: 2,
                opacity: 1,
                fillOpacity: 1
            }).addTo(map);
            
            marker.bindTooltip(s.name, {
                permanent: true,
                direction: 'top',
                className: 'station-tooltip',
                offset: [0, -5]
            });
            
            stationMarkers.push(marker);
        });
    }

    // Effect untuk ganti tema
    $effect(() => {
        if (tileLayer) {
            tileLayer.setUrl($gameState.mapTheme === 'dark' ? CARTO_DARK : CARTO_LIGHT);
        }
    });

    // Effect untuk ganti rute
    $effect(() => {
        const route = activeRoute;
        if (map && L) {
            drawRoute();
            map.setView([route.stations[0].lat, route.stations[0].lon], 14, { animate: true });
        }
    });
</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="map-container" bind:this={mapElement}></div>

<style>
    .map-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #000;
        z-index: 0; 
    }

    :global(.station-tooltip) {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        color: #fff !important;
        font-weight: bold;
        font-size: 11px;
        text-shadow: 1px 1px 3px #000, -1px -1px 3px #000, 1px -1px 3px #000, -1px 1px 3px #000;
    }
    
    :global(.leaflet-tooltip-top:before) {
        display: none !important; 
    }
</style>
