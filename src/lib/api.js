const explicitApiBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, '');

const deriveApiBase = () => {
    if (explicitApiBase) return explicitApiBase;

    if (typeof window === 'undefined') {
        return 'http://localhost:8000';
    }

    const { protocol, hostname } = window.location;
    const backendProtocol = protocol === 'https:' ? 'https:' : 'http:';
    return `${backendProtocol}//${hostname}:8000`;
};

export const API_BASE = deriveApiBase();
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
