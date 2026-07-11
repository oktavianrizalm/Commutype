<script lang="ts">
    import { onMount } from 'svelte';
    import { playerState, botState, gameState } from '$lib/stores';

    let pathRef: SVGPathElement;
    let pathLength = $state(0);
    
    // Konfigurasi Peta
    const STATIONS_COUNT = 8;
    let stations: {x: number, y: number}[] = $state([]);

    onMount(() => {
        pathLength = pathRef.getTotalLength();
        
        // Hitung koordinat stasiun yang disebar merata di sepanjang jalur rel
        const segmentLen = pathLength / (STATIONS_COUNT - 1);
        const tempStations = [];
        for (let i = 0; i < STATIONS_COUNT; i++) {
            const point = pathRef.getPointAtLength(i * segmentLen);
            tempStations.push({ x: point.x, y: point.y });
        }
        stations = tempStations;
    });

    // Menghitung posisi kereta (X, Y) menggunakan API SVG getPointAtLength
    function getTrainPosition(totalDist: number, percentage: number) {
        if (!pathLength) return { x: 40, y: 100 }; // Fallback koordinat awal
        
        const segmentLen = pathLength / (STATIONS_COUNT - 1);
        
        // Looping kembali ke awal jika melewati stasiun terakhir
        const currentSegment = totalDist % (STATIONS_COUNT - 1); 
        
        const currentLength = (currentSegment * segmentLen) + (segmentLen * (percentage / 100));
        
        // Pastikan tidak melebihi panjang maksimal path
        const safeLength = Math.min(currentLength, pathLength);
        const point = pathRef.getPointAtLength(safeLength);
        
        return { x: point.x, y: point.y };
    }

    // Reaktivitas tinggi (State murni -> Koordinat UI)
    let playerPos = $derived(getTrainPosition($playerState.totalDistance, $playerState.wordCompletionPercentage));
    let botPos = $derived(getTrainPosition($botState.totalDistance, $botState.completionPercentage));
</script>

<div class="map-container">
    <svg viewBox="0 0 800 160" class="svg-map">
        <!-- Jalur Rel -->
        <!-- Jalur ini didesain menyerupai peta transit Commuter Line (berbelok halus) -->
        <path 
            bind:this={pathRef}
            d="M 40 100 L 150 100 Q 180 100 200 80 L 300 80 Q 330 80 350 100 L 500 100 Q 530 100 550 120 L 650 120 Q 680 120 700 100 L 760 100" 
            fill="none" 
            stroke="#444" 
            stroke-width="8" 
            stroke-linecap="round"
            stroke-linejoin="round"
        />

        <!-- Garis rel putus-putus untuk estetika -->
        <path 
            d="M 40 100 L 150 100 Q 180 100 200 80 L 300 80 Q 330 80 350 100 L 500 100 Q 530 100 550 120 L 650 120 Q 680 120 700 100 L 760 100" 
            fill="none" 
            stroke="#222" 
            stroke-width="4" 
            stroke-dasharray="12 12"
            stroke-linecap="round"
        />

        <!-- Render Titik Stasiun -->
        {#each stations as station, i}
            <circle 
                cx={station.x} 
                cy={station.y} 
                r="7" 
                fill="#1e1e1e" 
                stroke="#ccc" 
                stroke-width="3" 
            />
            <!-- Nama Stasiun (Opsional, disederhanakan pakai nomor urut) -->
            <text x={station.x} y={station.y - 15} text-anchor="middle" font-size="12" fill="#888" font-family="sans-serif">
                ST.{i + 1}
            </text>
        {/each}

        <!-- Indikator Kereta Bot (Berada sedikit di atas jalur) -->
        {#if pathLength > 0}
            {#if $gameState.gameMode === 'vs-bot'}
                <g transform="translate({botPos.x}, {botPos.y})" class="train bot-train">
                    <!-- Ikon Kereta Bot -->
                    <rect x="-12" y="-18" width="24" height="12" rx="4" fill="#2196f3" />
                    <rect x="-6" y="-15" width="4" height="4" fill="#fff" opacity="0.5"/>
                    <rect x="2" y="-15" width="4" height="4" fill="#fff" opacity="0.5"/>
                    <text x="0" y="-23" text-anchor="middle" font-size="11" font-weight="bold" fill="#2196f3">BOT</text>
                </g>
            {/if}

            <!-- Indikator Kereta Pemain (Berada sedikit di bawah jalur) -->
            <g transform="translate({playerPos.x}, {playerPos.y})" class="train player-train">
                <!-- Ikon Kereta Player -->
                <rect x="-12" y="6" width="24" height="12" rx="4" fill="#4caf50" />
                <rect x="-6" y="9" width="4" height="4" fill="#fff" opacity="0.5"/>
                <rect x="2" y="9" width="4" height="4" fill="#fff" opacity="0.5"/>
                <text x="0" y="28" text-anchor="middle" font-size="11" font-weight="bold" fill="#4caf50">ANDA</text>
            </g>
        {/if}
    </svg>
</div>

<style>
    .map-container {
        width: 100%;
        background: #151515;
        border-radius: 12px;
        margin: 0 0 20px 0;
        padding: 20px 10px;
        box-sizing: border-box;
        border: 1px solid #333;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
    }
    
    .svg-map {
        width: 100%;
        height: auto;
        display: block;
    }
    
    .train {
        /* Mencegah blur saat SVG bertransisi */
        will-change: transform;
    }

    .player-train {
        /* Memberikan sedikit transisi untuk ketikan pemain yang sifatnya diskrit per huruf */
        transition: transform 0.05s ease-out;
    }
</style>
