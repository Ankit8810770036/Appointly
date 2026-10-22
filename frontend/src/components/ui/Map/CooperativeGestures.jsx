import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

/**
 * CooperativeGestureHandler:
 * Prevents Leaflet maps from trapping mobile finger scrolling or desktop wheel scroll.
 * - Mobile / Touch: 1 finger scrolls the page; 2 fingers pan and pinch-zoom the map.
 * - Desktop: Mouse wheel scrolls page; Ctrl/Cmd + wheel zooms map.
 * - Fullscreen: Native 1-finger panning and wheel zoom enabled.
 */
export default function CooperativeGestures({ isFullscreen, onHint, onClearHint }) {
    const map = useMap();
    const touchStartPos = useRef(null);
    const hintTimeoutRef = useRef(null);

    const triggerHint = (text) => {
        if (isFullscreen) return;
        if (onHint) onHint(text);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = setTimeout(() => {
            if (onClearHint) onClearHint();
        }, 1600);
    };

    // Invalidate map size on fullscreen toggle or window resize
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 120);
        return () => clearTimeout(timer);
    }, [isFullscreen, map]);

    useEffect(() => {
        const container = map.getContainer();
        if (!container) return;

        // If in fullscreen, restore standard unrestricted dragging & zooming
        if (isFullscreen) {
            map.dragging.enable();
            if (map.touchZoom) map.touchZoom.enable();
            map.scrollWheelZoom.enable();
            if (onClearHint) onClearHint();
            return;
        }

        // On embedded/page view: disable scrollWheelZoom by default so page scrolls
        map.scrollWheelZoom.disable();

        // Check if touch device
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            map.dragging.disable();
        }

        const handleTouchStart = (e) => {
            if (isFullscreen) return;
            if (e.touches.length === 1) {
                map.dragging.disable();
                touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length >= 2) {
                map.dragging.enable();
                if (map.touchZoom) map.touchZoom.enable();
                if (onClearHint) onClearHint();
            }
        };

        const handleTouchMove = (e) => {
            if (isFullscreen) return;
            if (e.touches.length === 1) {
                const start = touchStartPos.current;
                if (start) {
                    const dx = Math.abs(e.touches[0].clientX - start.x);
                    const dy = Math.abs(e.touches[0].clientY - start.y);
                    if (dx > 10 || dy > 10) {
                        triggerHint("Use two fingers to pan the map");
                    }
                }
            } else if (e.touches.length >= 2) {
                if (onClearHint) onClearHint();
            }
        };

        const handleTouchEnd = (e) => {
            if (isFullscreen) return;
            touchStartPos.current = null;
            if (e.touches.length < 2) {
                map.dragging.disable();
            }
        };

        const handleWheel = (e) => {
            if (isFullscreen) return;
            if (e.ctrlKey || e.metaKey) {
                map.scrollWheelZoom.enable();
                if (onClearHint) onClearHint();
            } else {
                map.scrollWheelZoom.disable();
                triggerHint("Use Ctrl + scroll to zoom the map");
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
        container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        container.addEventListener('wheel', handleWheel, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
            container.removeEventListener('wheel', handleWheel);
            if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        };
    }, [isFullscreen, map]);

    return null;
}
