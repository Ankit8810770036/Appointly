const playSound = (path) => {
    const audio = new Audio(path);
    audio.play().catch(error => {
        // Browsers often block autoplay until user interaction
        console.warn('Audio playback failed:', error);
    });
};

export const sound = {
    success: () => playSound('/sounds/success.wav'),
    error: () => playSound('/sounds/error.wav'),
    notification: () => playSound('/sounds/notification.wav'),
    message: () => playSound('/sounds/notification.wav'), // Using notification sound for messages
};
