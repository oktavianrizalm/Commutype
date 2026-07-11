<script lang="ts">
    import { onDestroy } from 'svelte';
    import { gameState, playerState, botState } from '$lib/stores';
    import Map from '$lib/components/Map.svelte';

    const GOAL_DISTANCE = 7; // Karena ada 8 stasiun (index 0-7), jarak maksimal adalah 7

    // Bank Kata
    const wordBank = {
        easy: ['batu', 'kota', 'krl', 'tiket', 'cepat', 'jalur', 'rel'],
        normal: ['komuter', 'gerbong', 'penumpang', 'masinis', 'stasiun', 'bogor', 'jakarta'],
        hard: ['kereta rel listrik', 'perjalanan aman', 'stasiun transit', 'jadwal keberangkatan']
    };

    let botAnimationId: number;
    let lastTime: number = 0;

    onDestroy(() => {
        if (botAnimationId) cancelAnimationFrame(botAnimationId);
    });

    function getRandomWord(difficulty: 'easy' | 'normal' | 'hard') {
        const words = wordBank[difficulty];
        const word = words[Math.floor(Math.random() * words.length)];
        return word.toLowerCase();
    }

    function startGame(mode: 'single' | 'vs-bot') {
        const newWord = getRandomWord($gameState.difficulty);
        playerState.update(state => ({
            ...state,
            currentWord: newWord,
            currentIndex: 0,
            correctChars: 0,
            wrongChars: 0,
            wordCompletionPercentage: 0,
            totalDistance: 0
        }));
        
        botState.update(state => ({
            ...state,
            completionPercentage: 0,
            totalDistance: 0
        }));

        gameState.update(state => ({
            ...state,
            status: 'playing',
            gameMode: mode,
            startTime: performance.now(),
            endTime: 0,
            winner: ''
        }));

        if (botAnimationId) cancelAnimationFrame(botAnimationId);
        
        if (mode === 'vs-bot') {
            lastTime = performance.now();
            botAnimationId = requestAnimationFrame(updateBot);
        }
    }

    function stopGame() {
        if (botAnimationId) cancelAnimationFrame(botAnimationId);
        gameState.update(state => ({
            ...state,
            status: 'idle'
        }));
    }

    function finishGame(winner: 'player' | 'bot') {
        if (botAnimationId) cancelAnimationFrame(botAnimationId);
        gameState.update(state => ({
            ...state,
            status: 'finished',
            endTime: performance.now(),
            winner
        }));
    }

    function loadNextWord() {
        const newWord = getRandomWord($gameState.difficulty);
        playerState.update(state => ({
            ...state,
            currentWord: newWord,
            currentIndex: 0,
            wordCompletionPercentage: 0,
            totalDistance: state.totalDistance + 1
        }));
    }

    function updateBot(timestamp: number) {
        if ($gameState.status !== 'playing' || $gameState.gameMode !== 'vs-bot') {
            return;
        }
        
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        let rate = 0;
        if ($gameState.difficulty === 'easy') rate = 0.05;
        else if ($gameState.difficulty === 'normal') rate = 0.10;
        else rate = 0.15;

        botState.update(state => {
            let percentage = state.completionPercentage + (rate * dt);
            let distance = state.totalDistance;

            if (percentage >= 100) {
                percentage = 0;
                distance += 1;
                
                // Cek jika bot mencapai garis finish
                if (distance >= GOAL_DISTANCE) {
                    finishGame('bot');
                    return { ...state, completionPercentage: 100, totalDistance: distance };
                }
            }

            return { ...state, completionPercentage: percentage, totalDistance: distance };
        });

        if ($gameState.status === 'playing') {
            botAnimationId = requestAnimationFrame(updateBot);
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if ($gameState.status !== 'playing') return;
        
        if (event.ctrlKey || event.altKey || event.metaKey || event.key.length > 1) {
            return;
        }

        if (event.key === ' ') {
            event.preventDefault();
        }

        const typedChar = event.key.toLowerCase();
        const targetChar = $playerState.currentWord[$playerState.currentIndex].toLowerCase();

        if (typedChar === targetChar) {
            playerState.update(state => {
                const nextIndex = state.currentIndex + 1;
                const completed = nextIndex >= state.currentWord.length;
                const percentage = completed ? 100 : (nextIndex / state.currentWord.length) * 100;

                return {
                    ...state,
                    currentIndex: nextIndex,
                    correctChars: state.correctChars + 1,
                    wordCompletionPercentage: percentage
                };
            });

            if ($playerState.currentIndex >= $playerState.currentWord.length) {
                // Cek jika pemain mencapai garis finish
                if ($playerState.totalDistance + 1 >= GOAL_DISTANCE) {
                    playerState.update(s => ({ ...s, totalDistance: s.totalDistance + 1, wordCompletionPercentage: 100 }));
                    finishGame('player');
                } else {
                    setTimeout(loadNextWord, 100);
                }
            }
        } else {
            playerState.update(state => ({
                ...state,
                wrongChars: state.wrongChars + 1
            }));
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<main class="container">
    <h1>CommuType</h1>

    {#if $gameState.status === 'idle'}
        <div class="menu">
            <h2>Pilih Mode Permainan</h2>
            
            <div class="difficulty-select">
                <label for="diff">Tingkat Kesulitan:</label>
                <select id="diff" bind:value={$gameState.difficulty}>
                    <option value="easy">Mudah (~30 WPM)</option>
                    <option value="normal">Normal (~60 WPM)</option>
                    <option value="hard">Sulit (~90+ WPM)</option>
                </select>
            </div>
            
            <div class="mode-buttons">
                <button on:click={() => startGame('single')}>Single Player</button>
                <button on:click={() => startGame('vs-bot')} class="bot-btn">Vs Bot</button>
            </div>
        </div>
    {:else}
        <Map />

        <!-- Bagian Pemain -->
        <div class="stats">
            <h3 class="span-col">Pemain (Anda)</h3>
            <div>Kesulitan: <strong>{$gameState.difficulty}</strong></div>
            <div>Stasiun Anda: <strong>{$playerState.totalDistance} / {GOAL_DISTANCE}</strong></div>
            <div>Ketikan Benar: <strong>{$playerState.correctChars}</strong></div>
            <div>Typo (Salah): <strong class="wrong">{$playerState.wrongChars}</strong></div>
            <div>Progres Anda: <strong>{$playerState.wordCompletionPercentage.toFixed(0)}%</strong></div>
        </div>

        <!-- Bagian Bot -->
        {#if $gameState.gameMode === 'vs-bot'}
            <div class="stats bot-stats">
                <h3 class="span-col">Bot (Lawan)</h3>
                <div>Stasiun Bot: <strong>{$botState.totalDistance} / {GOAL_DISTANCE}</strong></div>
                <div>Progres Bot: <strong>{$botState.completionPercentage.toFixed(0)}%</strong></div>
                <div class="progress-bar bot-progress span-col">
                    <div class="progress-fill bot-fill" style="width: {$botState.completionPercentage}%"></div>
                </div>
            </div>
        {/if}

        <div class="game-area">
            <p class="instruction">Ketik kata di bawah ini secepat mungkin:</p>
            
            <div class="word-display">
                {#each $playerState.currentWord as char, i}
                    <span 
                        class:typed={i < $playerState.currentIndex} 
                        class:current={i === $playerState.currentIndex}
                    >
                        {char === ' ' ? '\u00A0' : char}
                    </span>
                {/each}
            </div>
            
            <div class="progress-bar player-progress">
                <div class="progress-fill" style="width: {$playerState.wordCompletionPercentage}%"></div>
            </div>
        </div>
        
        <div class="controls">
            <button on:click={stopGame} class="stop-btn">Kembali ke Menu</button>
        </div>
    {/if}

    <!-- POPUP FINISH -->
    {#if $gameState.status === 'finished'}
        {@const timeSec = ($gameState.endTime - $gameState.startTime) / 1000}
        <!-- Standar pengetikan: 1 kata = 5 karakter -->
        {@const wpm = (($playerState.correctChars / 5) / (timeSec / 60)).toFixed(0)}
        {@const accuracy = (($playerState.correctChars / ($playerState.correctChars + $playerState.wrongChars)) * 100).toFixed(1)}
        
        <div class="popup-overlay">
            <div class="popup-content">
                {#if $gameState.gameMode === 'vs-bot'}
                    <h2 class={$gameState.winner === 'player' ? 'text-win' : 'text-lose'}>
                        {$gameState.winner === 'player' ? '🏆 Anda Menang!' : '💀 Bot Menang!'}
                    </h2>
                {:else}
                    <h2 class="text-win">🏁 Perjalanan Selesai!</h2>
                {/if}
                
                <div class="score-details">
                    <div class="score-box">
                        <span class="label">Waktu Tempuh</span>
                        <span class="val">{timeSec.toFixed(1)} s</span>
                    </div>
                    <div class="score-box">
                        <span class="label">Kecepatan</span>
                        <span class="val">{wpm} WPM</span>
                    </div>
                    <div class="score-box">
                        <span class="label">Akurasi</span>
                        <span class="val">{isNaN(Number(accuracy)) ? '0' : accuracy}%</span>
                    </div>
                    <div class="score-box">
                        <span class="label">Salah Ketik</span>
                        <span class="val wrong">{$playerState.wrongChars}</span>
                    </div>
                </div>
                
                <div class="mode-buttons" style="margin-top: 30px;">
                    <button on:click={stopGame} class="stop-btn">Menu Utama</button>
                    <button on:click={() => startGame($gameState.gameMode)} class="bot-btn">Main Lagi</button>
                </div>
            </div>
        </div>
    {/if}
</main>

<style>
    :global(body) {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #121212;
        color: #f5f5f5;
        margin: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
    }

    .container {
        max-width: 600px;
        width: 100%;
        padding: 2rem;
        background: #1e1e1e;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        position: relative; /* Penting untuk absolute popup */
    }

    h1 {
        text-align: center;
        color: #4caf50;
        margin-top: 0;
        letter-spacing: 1px;
    }

    .menu {
        text-align: center;
        background: #2a2a2a;
        padding: 40px 20px;
        border-radius: 12px;
        margin-top: 20px;
    }
    
    .menu h2 {
        margin-top: 0;
        margin-bottom: 30px;
        color: #fff;
    }

    .difficulty-select {
        margin-bottom: 30px;
        font-size: 1.1rem;
    }

    .difficulty-select select {
        margin-left: 10px;
        font-size: 1.1rem;
        padding: 8px 12px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 6px;
    }

    .mode-buttons {
        display: flex;
        justify-content: center;
        gap: 20px;
    }

    button {
        padding: 12px 24px;
        background: #333;
        color: #fff;
        border: 1px solid #444;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
        transition: background 0.2s;
    }

    button:hover {
        background: #4caf50;
        color: #000;
        border-color: #4caf50;
    }

    .bot-btn {
        background: #2196f3;
        border-color: #1976d2;
    }

    .bot-btn:hover {
        background: #64b5f6;
        color: #000;
        border-color: #64b5f6;
    }

    .stop-btn {
        background: #f44336;
        border-color: #d32f2f;
    }

    .stop-btn:hover {
        background: #ef5350;
        color: #fff;
        border-color: #ef5350;
    }

    h3.span-col {
        grid-column: 1 / -1;
        margin: 0 0 10px 0;
        color: #fff;
        font-size: 1.1rem;
        border-bottom: 1px solid #444;
        padding-bottom: 5px;
    }

    .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        background: #2a2a2a;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
        font-size: 0.9rem;
    }
    
    .bot-stats {
        background: #252a34;
        border: 1px solid #3d4a60;
    }

    .stats .wrong {
        color: #f44336;
    }

    .span-col {
        grid-column: 1 / -1;
    }

    .game-area {
        text-align: center;
        margin: 30px 0;
    }

    .instruction {
        color: #aaa;
        font-size: 0.9rem;
        margin-bottom: 10px;
    }

    .word-display {
        font-size: 2.5rem;
        font-weight: bold;
        letter-spacing: 2px;
        font-family: monospace;
        background: #090909;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 15px;
        user-select: none;
    }

    .typed {
        color: #4caf50;
    }

    .current {
        color: #ffffff;
        text-decoration: underline;
        text-decoration-color: #4caf50;
        text-decoration-thickness: 4px;
        text-underline-offset: 4px;
    }

    span:not(.typed):not(.current) {
        color: #555;
    }

    .progress-bar {
        height: 8px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #4caf50;
        transition: width 0.05s ease-out; 
    }

    .bot-progress {
        margin-top: 5px;
        background: #1e2430;
    }

    .bot-fill {
        background: #2196f3;
        transition: none; 
    }

    .controls {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-top: 20px;
    }

    /* --------------------------------- */
    /*          POPUP OVERLAY            */
    /* --------------------------------- */
    .popup-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    }

    .popup-content {
        background: #1e1e1e;
        padding: 40px;
        border-radius: 16px;
        border: 2px solid #333;
        text-align: center;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 15px 50px rgba(0,0,0,0.9);
        animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }

    @keyframes slideUp {
        from { transform: translateY(50px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .popup-content h2 {
        font-size: 2.2rem;
        margin-top: 0;
        margin-bottom: 30px;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }

    .text-win { color: #4caf50; }
    .text-lose { color: #f44336; }

    .score-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
    }

    .score-box {
        background: #252525;
        padding: 15px;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        border: 1px solid #333;
    }

    .score-box .label {
        font-size: 0.85rem;
        color: #aaa;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .score-box .val {
        font-size: 1.8rem;
        font-weight: bold;
        color: #fff;
    }

    .score-box .wrong {
        color: #f44336;
    }
</style>
