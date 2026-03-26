import { useCallback, useRef } from 'react';

/**
 * A simple hook to play sound effects using the native Audio API.
 * @returns {Object} An object containing the play function.
 */
export const useSound = () => {
    const audioRef = useRef({});

    const play = useCallback((soundName) => {
        // Preload/cache the audio object if it doesn't exist
        if (!audioRef.current[soundName]) {
            const path = `/sounds/${soundName}.wav`;
            audioRef.current[soundName] = new Audio(path);
        }

        const audio = audioRef.current[soundName];

        // Reset playback position to allow rapid repeated plays
        audio.currentTime = 0;

        // Play with error handling (e.g., if browser blocks autoplay without interaction)
        audio.play().catch(err => {
            console.warn(`Failed to play sound: ${soundName}`, err);
        });
    }, []);

    return { play };
};
