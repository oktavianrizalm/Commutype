<script lang="ts">
    import { onDestroy } from "svelte";
    import { slide } from "svelte/transition";
    import { gameState, playerState, botState } from "$lib/stores";
    import Map from "$lib/components/Map.svelte";
    import { routes } from "$lib/data/routes";

    let activeRoute = $derived(
        routes.find((r) => r.id === $gameState.selectedRouteId) || routes[0],
    );
    let goalDistance = $derived(activeRoute.stations.length);

    let botAnimationId: number;
    let lastTime: number = 0;

    let showModeSetup = $state(false);
    let selectedModeMenu: "single" | "vs-bot" | "blind" | null = $state(null);
    let kbbiWords: string[] = [];
    let loadingKbbi = $state(false);

    let hiddenInput: HTMLInputElement;

    onDestroy(() => {
        if (botAnimationId) cancelAnimationFrame(botAnimationId);
    });

    function getNextStationWord(distance: number) {
        if (distance < activeRoute.stations.length) {
            if (
                $gameState.typingMode === "kbbi" &&
                kbbiWords.length > 0 &&
                $gameState.gameMode !== "blind"
            ) {
                const w1 =
                    kbbiWords[Math.floor(Math.random() * kbbiWords.length)];
                return w1;
            }
            return activeRoute.stations[distance].name.toLowerCase();
        }
        return "finish";
    }

    async function startGame(mode: "single" | "vs-bot" | "blind") {
        if ($gameState.typingMode === "kbbi" && kbbiWords.length === 0) {
            loadingKbbi = true;
            try {
                // Lazy load JSON
                const module = await import("$lib/data/kbbi.json");
                kbbiWords = module.default;
            } catch (e) {
                console.error("Gagal memuat file KBBI", e);
            }
            loadingKbbi = false;
        }

        const newWord = getNextStationWord(0);
        playerState.update((state) => ({
            ...state,
            currentWord: newWord,
            typedWord: "",
            correctChars: 0,
            wrongChars: 0,
            wordCompletionPercentage: 0,
            totalDistance: 0,
        }));

        botState.update((state) => ({
            ...state,
            completionPercentage: 0,
            totalDistance: 0,
        }));

        gameState.update((state) => ({
            ...state,
            status: "playing",
            gameMode: mode,
            startTime: performance.now(),
            endTime: 0,
            winner: "",
        }));

        showModeSetup = false;

        if (botAnimationId) cancelAnimationFrame(botAnimationId);

        if (mode === "vs-bot") {
            lastTime = performance.now();
            botAnimationId = requestAnimationFrame(updateBot);
        }

        setTimeout(() => {
            if (hiddenInput) hiddenInput.focus();
        }, 50);
    }

    function stopGame() {
        if (botAnimationId) cancelAnimationFrame(botAnimationId);
        gameState.update((state) => ({
            ...state,
            status: "idle",
        }));
    }

    function finishGame(winner: "player" | "bot") {
        if (botAnimationId) cancelAnimationFrame(botAnimationId);
        gameState.update((state) => ({
            ...state,
            status: "finished",
            endTime: performance.now(),
            winner,
        }));
    }

    function loadNextWord() {
        playerState.update((state) => {
            const nextDist = state.totalDistance + 1;
            return {
                ...state,
                currentWord: getNextStationWord(nextDist),
                typedWord: "",
                wordCompletionPercentage: 0,
                totalDistance: nextDist,
            };
        });
        if (hiddenInput) hiddenInput.value = "";
    }

    function updateBot(timestamp: number) {
        if (
            $gameState.status !== "playing" ||
            $gameState.gameMode !== "vs-bot"
        ) {
            return;
        }

        const dt = timestamp - lastTime;
        lastTime = timestamp;

        let rate = 0;
        if ($gameState.difficulty === "easy")
            rate = 0.025; // ~30 WPM
        else if ($gameState.difficulty === "normal")
            rate = 0.05; // ~60 WPM
        else rate = 0.075; // ~90 WPM

        botState.update((state) => {
            let percentage = state.completionPercentage + rate * dt;
            let distance = state.totalDistance;

            if (percentage >= 100) {
                percentage = 0;
                distance += 1;

                if (distance >= goalDistance) {
                    finishGame("bot");
                    return {
                        ...state,
                        completionPercentage: 100,
                        totalDistance: distance,
                    };
                }
            }

            return {
                ...state,
                completionPercentage: percentage,
                totalDistance: distance,
            };
        });

        if ($gameState.status === "playing") {
            botAnimationId = requestAnimationFrame(updateBot);
        }
    }

    function processInputUpdate(rawTypedWord: string) {
        let displayWord = rawTypedWord;
        if (displayWord.length > $playerState.currentWord.length + 5) {
            displayWord = displayWord.slice(
                0,
                $playerState.currentWord.length + 5,
            );
        }

        playerState.update((state) => {
            const oldWord = state.typedWord;

            let correctPrefixLength = 0;
            for (let i = 0; i < displayWord.length; i++) {
                if (
                    i < state.currentWord.length &&
                    displayWord[i] === state.currentWord[i]
                ) {
                    correctPrefixLength++;
                } else {
                    break;
                }
            }

            const percentage =
                (correctPrefixLength / state.currentWord.length) * 100;

            let newCorrectChars = state.correctChars;
            let newWrongChars = state.wrongChars;

            if (displayWord.length > oldWord.length) {
                const addedChars = displayWord.length - oldWord.length;
                if (correctPrefixLength === displayWord.length) {
                    newCorrectChars += addedChars;
                } else {
                    newWrongChars += addedChars;
                }
            }

            return {
                ...state,
                typedWord: displayWord,
                correctChars: newCorrectChars,
                wrongChars: newWrongChars,
                wordCompletionPercentage: percentage,
            };
        });

        // Jangan pernah memodifikasi hiddenInput.value di sini untuk mencegah bug kursor di Gboard!

        if (displayWord === $playerState.currentWord) {
            if ($playerState.totalDistance + 1 >= goalDistance) {
                playerState.update((s) => ({
                    ...s,
                    totalDistance: s.totalDistance + 1,
                    wordCompletionPercentage: 100,
                }));
                finishGame("player");
            } else {
                if (hiddenInput) hiddenInput.value = "";
                setTimeout(loadNextWord, 50);
            }
        }
    }

    function handleMobileInput() {
        if ($gameState.status !== "playing" || !hiddenInput) return;
        processInputUpdate(hiddenInput.value.toLowerCase());
    }

    function handleKeydown(event: KeyboardEvent) {
        if ($gameState.status !== "playing") return;

        // Jika hiddenInput sedang aktif (terutama di mobile), biarkan on:input yang menangani semuanya!
        // Ini mencegah bentrok event dan mencegah cursor melompat ke posisi 0.
        if (document.activeElement === hiddenInput) {
            return;
        }

        if (
            event.ctrlKey ||
            event.altKey ||
            event.metaKey ||
            event.key === "Unidentified"
        ) {
            return;
        }

        const isBackspace = event.key === "Backspace";
        const isLetterOrSpace = event.key.length === 1;

        if (!isBackspace && !isLetterOrSpace) return;

        event.preventDefault();

        let newTypedWord = $playerState.typedWord;
        if (isBackspace) {
            if (newTypedWord.length > 0) {
                newTypedWord = newTypedWord.slice(0, -1);
            }
        } else if (isLetterOrSpace) {
            newTypedWord += event.key.toLowerCase();
        }

        processInputUpdate(newTypedWord);
    }

    function forceFocus() {
        if ($gameState.status === "playing" && hiddenInput) {
            hiddenInput.focus();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} on:click={forceFocus} />

<!-- Map di-render di paling belakang setiap saat -->
<Map />

<main class="ui-layer">
    <div class="logo-container">
        <img src="/logo.png" alt="CommuType Logo" class="logo-img" />
    </div>

    {#if $gameState.status === "idle"}
        <div class="menu-wrapper">
            <div class="glass-panel menu-glass">
                <div class="theme-toggle">
                    <span class="theme-label">Tema Peta:</span>
                    <div class="segmented-control">
                        <button
                            class:active={$gameState.mapTheme === "dark"}
                            on:click={() =>
                                gameState.update((s) => ({
                                    ...s,
                                    mapTheme: "dark",
                                }))}>Gelap</button
                        >
                        <button
                            class:active={$gameState.mapTheme === "light"}
                            on:click={() =>
                                gameState.update((s) => ({
                                    ...s,
                                    mapTheme: "light",
                                }))}>Terang</button
                        >
                    </div>
                </div>

                {#if !showModeSetup}
                    <h2 style="margin-top: 15px; margin-bottom: 20px;">
                        Pilih Rute Perjalanan
                    </h2>

                    <div class="route-grid">
                        {#each routes as route}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="route-card {$gameState.selectedRouteId ===
                                route.id
                                    ? 'selected'
                                    : ''}"
                                on:click={() =>
                                    gameState.update((s) => ({
                                        ...s,
                                        selectedRouteId: route.id,
                                    }))}
                                style="--route-color: {route.color}"
                            >
                                <div class="route-color-bar"></div>
                                <div class="route-info">
                                    <h4>{route.name}</h4>
                                    <span>{route.stations.length} Stasiun</span>
                                </div>
                            </div>
                        {/each}
                    </div>

                    <div class="mode-buttons">
                        <button
                            on:click={() => { showModeSetup = true; selectedModeMenu = null; }}
                            class="glass-btn bot-btn cta-btn">Mode Game</button
                        >
                    </div>
                {:else}
                    <!-- Overlay Pemilihan Mode -->
                    <div class="difficulty-setup">
                        <h2 style="margin-top: 15px; margin-bottom: 30px;">
                            Pilih Mode Game
                        </h2>
                        <div
                            class="diff-options"
                            style="flex-direction: column; gap: 15px;"
                        >
                            <!-- 1. Single Player -->
                            <div class="accordion-item {selectedModeMenu === 'single' ? 'open' : ''}">
                                <button class="accordion-header" on:click={() => selectedModeMenu = selectedModeMenu === 'single' ? null : 'single'}>
                                    <strong>1. Single Player</strong>
                                    <small>Latihan mengetik rute perjalanan santai</small>
                                </button>
                                
                                {#if selectedModeMenu === 'single'}
                                <div class="accordion-body" transition:slide={{ duration: 250 }}>
                                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 15px;">
                                        <span class="theme-label">Teks:</span>
                                        <div class="segmented-control">
                                            <button class:active={$gameState.typingMode === "station"} on:click={() => gameState.update((s) => ({ ...s, typingMode: "station", }))}>Stasiun</button>
                                            <button class:active={$gameState.typingMode === "kbbi"} on:click={() => gameState.update((s) => ({ ...s, typingMode: "kbbi", }))}>KBBI</button>
                                        </div>
                                    </div>

                                    <button class="glass-btn cta-btn mode-start-btn" style="width: 100%;" on:click={() => startGame("single")} disabled={loadingKbbi}>
                                        {loadingKbbi ? "Memuat..." : "Mulai Single Player"}
                                    </button>
                                </div>
                                {/if}
                            </div>

                            <!-- 2. Lawan Bot -->
                            <div class="accordion-item {selectedModeMenu === 'vs-bot' ? 'open' : ''}">
                                <button class="accordion-header" on:click={() => selectedModeMenu = selectedModeMenu === 'vs-bot' ? null : 'vs-bot'}>
                                    <strong>2. Lawan Bot</strong>
                                    <small>Balapan mengetik melawan AI</small>
                                </button>

                                {#if selectedModeMenu === 'vs-bot'}
                                <div class="accordion-body" transition:slide={{ duration: 250 }}>
                                    <p style="text-align: center; color: #ccc; font-size: 0.9rem; margin-top: 0; margin-bottom: 10px;">Pilih Tingkat Kesulitan:</p>
                                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                                        <button class="diff-btn {$gameState.difficulty === 'easy' ? 'active' : ''}" style="padding: 10px; flex: 1;" on:click={() => gameState.update((s) => ({ ...s, difficulty: "easy", }))}>Mudah</button>
                                        <button class="diff-btn {$gameState.difficulty === 'normal' ? 'active' : ''}" style="padding: 10px; flex: 1;" on:click={() => gameState.update((s) => ({ ...s, difficulty: "normal", }))}>Normal</button>
                                        <button class="diff-btn {$gameState.difficulty === 'hard' ? 'active' : ''}" style="padding: 10px; flex: 1;" on:click={() => gameState.update((s) => ({ ...s, difficulty: "hard", }))}>Sulit</button>
                                    </div>
                                    <button class="glass-btn cta-btn mode-start-btn" style="width: 100%;" on:click={() => { gameState.update((s) => ({ ...s, typingMode: "station", })); startGame("vs-bot"); }} disabled={loadingKbbi}>Mulai Lawan BOT</button>
                                </div>
                                {/if}
                            </div>

                            <!-- 3. Blind Test -->
                            <div class="accordion-item {selectedModeMenu === 'blind' ? 'open' : ''}">
                                <button class="accordion-header" on:click={() => selectedModeMenu = selectedModeMenu === 'blind' ? null : 'blind'}>
                                    <strong>3. Blind Test</strong>
                                    <small>Hafalkan urutan stasiun tanpa panduan teks</small>
                                </button>

                                {#if selectedModeMenu === 'blind'}
                                <div class="accordion-body" transition:slide={{ duration: 250 }}>
                                    <button class="glass-btn cta-btn mode-start-btn" style="width: 100%;" on:click={() => { gameState.update((s) => ({ ...s, typingMode: "station", })); startGame("blind"); }}>
                                        Mulai Blind Test
                                    </button>
                                </div>
                                {/if}
                            </div>
                        </div>
                        <div class="setup-actions" style="margin-top: 20px;">
                            <button
                                class="glass-btn outline-btn cta-btn"
                                on:click={() => (showModeSetup = false)}
                                >Kembali</button
                            >
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {:else}
        <!-- HUD Stats Atas -->
        <div class="hud-top">
            <div class="glass-panel stat-glass player-stats">
                <h3>Pemain (Anda)</h3>
                <div class="stat-row">
                    <span>Jalur:</span> <strong>{activeRoute.name}</strong>
                </div>
                <div class="stat-row">
                    <span>Stasiun:</span>
                    <strong
                        >{$playerState.totalDistance} / {goalDistance}</strong
                    >
                </div>
                <div class="stat-row">
                    <span>Benar:</span>
                    <strong>{$playerState.correctChars}</strong>
                </div>
                <div class="stat-row">
                    <span>Typo:</span>
                    <strong class="wrong">{$playerState.wrongChars}</strong>
                </div>
            </div>

            {#if $gameState.gameMode === "vs-bot"}
                <div class="glass-panel stat-glass bot-stats">
                    <h3>Bot (Lawan)</h3>
                    <div class="stat-row">
                        <span>Stasiun:</span>
                        <strong
                            >{$botState.totalDistance} / {goalDistance}</strong
                        >
                    </div>
                    <div class="stat-row">
                        <span>Progres:</span>
                        <strong
                            >{$botState.completionPercentage.toFixed(
                                0,
                            )}%</strong
                        >
                    </div>
                    <div class="progress-bar bot-progress">
                        <div
                            class="progress-fill bot-fill"
                            style="width: {$botState.completionPercentage}%"
                        ></div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Area Mengetik (Tengah Bawah) -->
        <div class="typing-wrapper">
            <div class="glass-panel typing-hud">
                {#if $playerState.totalDistance === 0}
                    <p class="instruction">
                        Ketik untuk memberangkatkan kereta{#if $gameState.typingMode === "kbbi"}
                            menuju <strong
                                class="destination-text"
                                style="color: #2196f3;"
                                >{activeRoute.stations[0].name}</strong
                            >{/if}:
                    </p>
                {:else if $gameState.typingMode === "kbbi"}
                    <p class="instruction">
                        Menuju stasiun: <strong class="destination-text">
                            {activeRoute.stations[
                                Math.min(
                                    $playerState.totalDistance,
                                    activeRoute.stations.length - 1,
                                )
                            ].name}
                        </strong>
                    </p>
                {/if}

                <input
                    type="text"
                    bind:this={hiddenInput}
                    on:input={handleMobileInput}
                    class="mobile-keyboard-trigger"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                />

                <div class="word-display">
                    {#each Array(Math.max($playerState.currentWord.length, $playerState.typedWord.length)) as _, i}
                        {@const target = $playerState.currentWord}
                        {@const typed = $playerState.typedWord}
                        {@const isTyped = i < typed.length}
                        {@const isExtra = i >= target.length}
                        {@const charToRender = isTyped ? typed[i] : target[i]}
                        {@const isCorrect =
                            isTyped && !isExtra && typed[i] === target[i]}
                        {@const isWrong = isTyped && (!isCorrect || isExtra)}

                        {#if $gameState.gameMode === "blind"}
                            {#if isTyped}
                                <span
                                    class:correct={isCorrect}
                                    class:wrong-char={isWrong}
                                    class:extra-char={isExtra}
                                >
                                    {charToRender === " " ? "␣" : charToRender}
                                </span>
                            {/if}
                        {:else}
                            <span
                                class:correct={isCorrect}
                                class:wrong-char={isWrong}
                                class:extra-char={isExtra}
                                class:current={i === typed.length}
                                class:untyped={!isTyped}
                            >
                                {charToRender === " " ? "␣" : charToRender}
                            </span>
                        {/if}
                    {/each}

                    {#if $gameState.gameMode === "blind" || $playerState.typedWord.length === Math.max($playerState.currentWord.length, $playerState.typedWord.length)}
                        <span
                            class="current"
                            style="width: 10px; display: inline-block;"
                            >&nbsp;</span
                        >
                    {/if}
                </div>

                <div class="progress-bar player-progress">
                    <div
                        class="progress-fill"
                        style="width: {$playerState.wordCompletionPercentage}%"
                    ></div>
                </div>

                <div class="typing-controls">
                    <button on:click={stopGame} class="glass-btn stop-btn"
                        >Berhenti & Kembali</button
                    >
                </div>
            </div>
        </div>
    {/if}

    <!-- POPUP FINISH -->
    {#if $gameState.status === "finished"}
        {@const timeSec = ($gameState.endTime - $gameState.startTime) / 1000}
        {@const wpm = ($playerState.correctChars / 5 / (timeSec / 60)).toFixed(
            0,
        )}
        {@const accuracy = (
            ($playerState.correctChars /
                ($playerState.correctChars + $playerState.wrongChars)) *
            100
        ).toFixed(1)}

        <div class="popup-overlay">
            <div class="glass-panel popup-content">
                {#if $gameState.gameMode === "vs-bot"}
                    <h2
                        class={$gameState.winner === "player"
                            ? "text-win"
                            : "text-lose"}
                    >
                        {$gameState.winner === "player"
                            ? "🏆 Anda Menang!"
                            : "💀 Bot Menang!"}
                    </h2>
                {:else}
                    <h2 class="text-win">🏁 Perjalanan Selesai!</h2>
                {/if}

                <p>
                    Anda telah menyelesaikan <strong>{activeRoute.name}</strong>
                </p>

                <div class="score-details">
                    <div class="score-box">
                        <span class="label">Waktu</span>
                        <span class="val">{timeSec.toFixed(1)} s</span>
                    </div>
                    <div class="score-box">
                        <span class="label">Kecepatan</span>
                        <span class="val">{wpm} WPM</span>
                    </div>
                    <div class="score-box">
                        <span class="label">Akurasi</span>
                        <span class="val"
                            >{isNaN(Number(accuracy)) ? "0" : accuracy}%</span
                        >
                    </div>
                    <div class="score-box">
                        <span class="label">Salah Ketik</span>
                        <span class="val wrong">{$playerState.wrongChars}</span>
                    </div>
                </div>

                <div class="mode-buttons" style="margin-top: 30px;">
                    <button on:click={stopGame} class="glass-btn stop-btn"
                        >Menu Utama</button
                    >
                    <button
                        on:click={() => startGame($gameState.gameMode)}
                        class="glass-btn bot-btn">Main Lagi</button
                    >
                </div>
            </div>
        </div>
    {/if}
</main>

<style>
    :global(*) {
        box-sizing: border-box;
    }

    :global(body) {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background-color: #000;
        color: #f5f5f5;
        margin: 0;
        overflow: hidden;
    }

    .ui-layer {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 10;
        display: flex;
        flex-direction: column;
    }

    .glass-panel,
    .logo,
    .popup-overlay {
        pointer-events: auto;
    }

    .logo-container {
        text-align: center;
        margin-top: 20px;
        pointer-events: auto;
        animation: slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .logo-img {
        height: 70px;
        background: #ffffff; /* White background to blend with the image */
        padding: 12px 30px;
        border-radius: 100px; /* Pill shape */
        box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.6),
            0 0 0 2px rgba(255, 255, 255, 0.2);
        object-fit: contain;
        transition: transform 0.3s ease;
    }

    .logo-img:hover {
        transform: scale(1.05);
    }

    /* --- GLASSMORPHISM UTILITIES --- */
    .glass-panel {
        background: rgba(25, 25, 25, 0.7);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6);
    }

    .glass-btn {
        padding: 12px 24px;
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        backdrop-filter: blur(4px);
    }

    .glass-btn:hover {
        background: rgba(76, 175, 80, 0.8);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
    }

    .outline-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .outline-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        box-shadow: none;
    }

    .mode-start-btn {
        background: transparent;
        border: 2px solid #2196f3;
        color: #fff;
    }
    .mode-start-btn:hover {
        background: rgba(33, 150, 243, 0.2);
        box-shadow: 0 5px 15px rgba(33, 150, 243, 0.4);
    }

    .bot-btn {
        background: rgba(33, 150, 243, 0.8);
    }
    .bot-btn:hover {
        background: rgba(33, 150, 243, 1);
        box-shadow: 0 5px 15px rgba(33, 150, 243, 0.5);
    }

    .stop-btn:hover {
        background: rgba(244, 67, 54, 0.8);
        box-shadow: 0 5px 15px rgba(244, 67, 54, 0.4);
    }

    .cta-btn {
        font-size: 1.1rem;
        padding: 14px 28px;
        font-weight: bold;
        flex: 1;
    }

    /* --- MENU --- */
    .menu-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-grow: 1;
        padding-bottom: 5vh;
        overflow: hidden;
    }

    .menu-glass {
        text-align: center;
        padding: 40px;
        width: 100%;
        max-width: 600px;
        animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        flex-direction: column;
        max-height: 100%;
    }

    .menu-glass h2 {
        color: #fff;
        flex-shrink: 0;
        margin-top: 0;
    }

    /* THEME TOGGLE */
    .theme-toggle {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
        flex-shrink: 0;
    }
    .theme-label {
        font-size: 0.9rem;
        color: #aaa;
    }

    .mode-control {
        margin-right: 15px;
    }

    .segmented-control {
        display: flex;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .segmented-control button {
        background: transparent;
        border: none;
        color: #888;
        padding: 6px 16px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .segmented-control button.active {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        font-weight: bold;
    }

    /* ROUTE CARDS */
    .route-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        align-content: start;
        gap: 15px;
        margin-bottom: 35px;
        max-height: 350px;
        overflow-y: auto;
        padding: 5px;
        flex-shrink: 1;
        min-height: 0;
    }
    .route-grid::-webkit-scrollbar {
        width: 6px;
    }
    .route-grid::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }

    .route-card {
        background: rgba(0, 0, 0, 0.4);
        border: 2px solid transparent;
        border-radius: 12px;
        display: flex;
        align-items: center;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        position: relative;
        overflow: hidden;
        min-height: 70px;
    }

    .route-card:hover {
        background: rgba(255, 255, 255, 0.05);
        transform: translateY(-2px);
    }

    .route-card.selected {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--route-color);
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.1) inset;
    }

    .route-color-bar {
        width: 6px;
        height: 100%;
        position: absolute;
        left: 0;
        top: 0;
        background-color: var(--route-color);
    }

    .route-info {
        margin-left: 15px;
    }
    .route-info h4 {
        margin: 0 0 5px 0;
        font-size: 1rem;
        color: #fff;
    }
    .route-info span {
        font-size: 0.8rem;
        color: #aaa;
    }

    /* DIFFICULTY BUTTONS */
    .diff-options {
        display: flex;
        gap: 15px;
        margin-bottom: 35px;
    }

    .diff-btn {
        flex: 1;
        background: rgba(0, 0, 0, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px 10px;
        color: #aaa;
        cursor: pointer;
        transition: all 0.2s;
    }

    .diff-btn strong {
        font-size: 1.1rem;
        color: #eee;
        display: block;
        margin-bottom: 5px;
    }

    .diff-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.3);
    }

    /* ACCORDION STYLES */
    .accordion-item {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    
    .accordion-item.open {
        background: rgba(0, 0, 0, 0.6);
        border-color: rgba(33, 150, 243, 0.5);
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
    }

    .accordion-header {
        width: 100%;
        background: transparent;
        border: none;
        padding: 15px;
        text-align: center;
        color: #eee;
        cursor: pointer;
        transition: background 0.2s;
    }
    .accordion-header:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    
    .accordion-header strong {
        display: block;
        font-size: 1.1rem;
        margin-bottom: 5px;
    }
    
    .accordion-header small {
        color: #aaa;
        font-size: 0.85rem;
    }

    .accordion-item.open .accordion-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(33, 150, 243, 0.1);
    }

    .accordion-body {
        padding: 20px 15px;
    }

    .diff-btn.active {
        background: rgba(33, 150, 243, 0.15);
        border-color: #2196f3;
        box-shadow: 0 0 20px rgba(33, 150, 243, 0.3) inset;
    }
    .diff-btn.active strong {
        color: #fff;
    }

    .mode-buttons,
    .setup-actions {
        display: flex;
        justify-content: center;
        gap: 15px;
        flex-shrink: 0;
        margin-top: auto;
    }

    /* --- HUD STATS (ATAS) --- */
    .hud-top {
        display: flex;
        justify-content: space-between;
        padding: 0 30px;
        margin-top: 10px;
    }

    .stat-glass {
        padding: 15px 20px;
        width: 220px;
        font-size: 0.95rem;
    }

    .stat-glass h3 {
        margin: 0 0 10px 0;
        font-size: 1.1rem;
        color: #fff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
    }

    .stat-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
    }
    .stat-row span {
        color: #aaa;
    }
    .wrong {
        color: #ff5252;
        text-shadow: 0 0 5px rgba(255, 82, 82, 0.5);
    }

    /* --- AREA MENGETIK (TENGAH BAWAH) --- */
    .typing-wrapper {
        display: flex;
        justify-content: center;
        position: absolute;
        bottom: 8vh;
        width: 100%;
    }

    .typing-hud {
        padding: 30px 40px;
        text-align: center;
        min-width: 600px;
        animation: slideUp 0.3s ease-out;
    }

    .instruction {
        color: #ccc;
        font-size: 1.1rem;
        margin-top: 0;
        margin-bottom: 15px;
    }
    .destination-text {
        color: #4caf50;
        font-size: 1.4rem;
        letter-spacing: 1px;
    }

    .word-display {
        font-size: 3.5rem;
        font-weight: 700;
        letter-spacing: 3px;
        font-family: "Consolas", "Courier New", monospace;
        margin-bottom: 25px;
        user-select: none;
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .mobile-keyboard-trigger {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 300px;
        height: 50px;
        opacity: 0;
        pointer-events: none;
        border: none;
        outline: none;
        background: transparent;
        color: transparent;
        caret-color: transparent;
        text-align: left;
        direction: ltr;
        font-family: monospace;
    }

    .correct {
        color: #4caf50;
        text-shadow: 0 0 15px rgba(76, 175, 80, 0.6);
    }
    .wrong-char {
        color: #ff5252;
        text-shadow: 0 0 15px rgba(255, 82, 82, 0.6);
        background: rgba(255, 82, 82, 0.15);
        border-radius: 4px;
    }
    .extra-char {
        color: #b71c1c;
        opacity: 0.8;
    }

    .current {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        box-shadow: 0 4px 0 #4caf50;
        animation: blink 1s infinite;
    }

    @keyframes blink {
        0%,
        100% {
            box-shadow: 0 4px 0 #4caf50;
        }
        50% {
            box-shadow: 0 4px 0 transparent;
        }
    }

    span:not(.correct):not(.wrong-char):not(.current) {
        color: rgba(255, 255, 255, 0.4);
    }

    .progress-bar {
        height: 6px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 20px;
    }

    .progress-fill {
        height: 100%;
        background: #4caf50;
        box-shadow: 0 0 10px #4caf50;
        transition: width 0.05s ease-out;
    }
    .bot-progress {
        margin-top: 10px;
        margin-bottom: 0;
    }
    .bot-fill {
        background: #2196f3;
        box-shadow: 0 0 10px #2196f3;
        transition: none;
    }

    .typing-controls {
        margin-top: 15px;
    }

    /* --- POPUP FINISH --- */
    .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .popup-content {
        padding: 40px;
        text-align: center;
        max-width: 500px;
        width: 90%;
        animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .popup-content h2 {
        font-size: 2.2rem;
        margin-top: 0;
    }
    .popup-content p {
        color: #ccc;
        font-size: 1.1rem;
    }

    .text-win {
        color: #4caf50;
    }
    .text-lose {
        color: #f44336;
    }

    .score-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-top: 25px;
    }

    .score-box {
        background: rgba(0, 0, 0, 0.4);
        padding: 15px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .score-box .label {
        font-size: 0.85rem;
        color: #aaa;
        margin-bottom: 8px;
        text-transform: uppercase;
    }
    .score-box .val {
        font-size: 1.8rem;
        font-weight: bold;
        color: #fff;
    }

    /* Animations */
    @keyframes slideUp {
        from {
            transform: translateY(30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    @keyframes slideDown {
        from {
            transform: translateY(-30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    @keyframes scaleIn {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    /* --- MOBILE OPTIMIZATION --- */
    @media (max-width: 768px) {
        .menu-glass {
            padding: 20px 15px;
            width: 95%;
        }

        .menu-glass h2 {
            font-size: 1.3rem;
            margin-bottom: 15px !important;
            margin-top: 5px !important;
        }

        .logo-img {
            height: 45px;
            padding: 10px 25px;
        }

        .theme-toggle {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        }

        .mode-control {
            margin-right: 0 !important;
        }

        .segmented-control {
            width: auto;
        }

        .segmented-control button {
            padding: 5px 12px;
            font-size: 0.85rem;
        }

        .route-grid {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 20px;
        }

        .route-card {
            min-height: 55px;
            padding: 8px 12px;
        }

        .route-info h4 {
            font-size: 0.95rem;
            margin-bottom: 2px;
        }

        .mode-buttons,
        .setup-actions {
            flex-direction: row;
            gap: 10px;
        }

        .difficulty-options {
            flex-direction: column;
        }

        .mode-buttons button,
        .setup-actions button {
            width: auto;
            flex: 1;
            padding: 12px 5px;
            font-size: 0.95rem;
        }

        .word-display {
            font-size: 2rem;
            letter-spacing: 2px;
        }

        .typing-hud {
            min-width: unset;
            width: 95%;
            padding: 20px 15px;
        }

        .hud-glass {
            padding: 15px;
        }

        .score-details {
            grid-template-columns: 1fr;
        }
    }
</style>
