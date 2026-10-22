/**
 * Curated high-resolution professional specialist portraits.
 * Provides realistic, warm human photography for providers without uploaded avatars.
 */
export const CURATED_PROVIDER_PORTRAITS = [
    'https://images.unsplash.com/photo-1594824813633-44c2dd977324?auto=format&fit=crop&w=400&q=80', // Female medical practitioner / specialist
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80', // Male healthcare / clinical practitioner
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', // Female consultant / corporate advisor
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', // Male executive / finance consultant
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80', // Female creative / wellness expert
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', // Female stylist / beauty professional
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', // Male professional / home specialist
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', // Male therapy / fitness specialist
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80', // Female physician / specialist
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80', // Male doctor / healthcare expert
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80', // Female consultant / therapist
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', // Male legal & corporate advisor
];

/**
 * Returns a high-quality avatar URL for a provider.
 * Uses provider's custom avatarUrl if valid, otherwise deterministically hashes their name/id into curated portraits.
 * @param {Object} provider - Provider object
 * @param {number} fallbackIndex - Optional index fallback
 * @returns {string} Image URL
 */
export const getProviderAvatar = (provider, fallbackIndex = 0) => {
    if (!provider) return CURATED_PROVIDER_PORTRAITS[0];

    const rawUrl = provider.avatarUrl || provider.providerProfile?.avatarUrl || provider.avatar;
    if (rawUrl && typeof rawUrl === 'string' && (rawUrl.startsWith('http') || rawUrl.startsWith('data:') || rawUrl.startsWith('/uploads'))) {
        return rawUrl;
    }

    const key = String(provider.name || provider.id || provider.email || fallbackIndex || 'provider');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    const absHash = Math.abs(hash) + fallbackIndex;
    return CURATED_PROVIDER_PORTRAITS[absHash % CURATED_PROVIDER_PORTRAITS.length];
};
