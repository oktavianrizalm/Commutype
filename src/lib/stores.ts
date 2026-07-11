import { writable } from 'svelte/store';

export type GameStatus = 'idle' | 'playing' | 'finished';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameMode = 'single' | 'vs-bot' | 'blind';

const initialGameState = {
    status: 'idle' as GameStatus,
    difficulty: 'normal' as Difficulty,
    gameMode: 'vs-bot' as GameMode,
    typingMode: 'station' as 'station' | 'kbbi',
    selectedRouteId: 'bogor',
    mapTheme: 'dark' as 'dark' | 'light',
    startTime: 0,
    endTime: 0,
    winner: '' as 'player' | 'bot' | ''
};
export const gameState = writable({ ...initialGameState });

const initialPlayerState = {
    currentWord: '',
    typedWord: '',
    correctChars: 0,
    wrongChars: 0,
    wordCompletionPercentage: 0,
    totalDistance: 0
};
export const playerState = writable({ ...initialPlayerState });

const initialBotState = {
    completionPercentage: 0,
    totalDistance: 0
};
export const botState = writable({ ...initialBotState });

export function resetGameStates() {
    gameState.set({ ...initialGameState });
    playerState.set({ ...initialPlayerState });
    botState.set({ ...initialBotState });
}
