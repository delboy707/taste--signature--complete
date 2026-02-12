// ===== LAZY LOADER =====
// Deferred loading of non-critical scripts for better performance

const ALLOWED_SCRIPT_DOMAINS = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
];

const LazyLoader = {
    loaded: new Set(),

    /**
     * Validate that a script src is from an allowed origin
     */
    _isAllowedSrc(src) {
        try {
            const url = new URL(src, window.location.origin);
            if (url.origin === window.location.origin) {
                return true;
            }
            return ALLOWED_SCRIPT_DOMAINS.includes(url.hostname);
        } catch (e) {
            return false;
        }
    },

    /**
     * Load a script dynamically
     */
    loadScript(src) {
        if (this.loaded.has(src)) {
            return Promise.resolve();
        }

        if (!this._isAllowedSrc(src)) {
            return Promise.reject(new Error(`Blocked loading script from disallowed domain: ${src}`));
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => {
                this.loaded.add(src);
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.body.appendChild(script);
        });
    },

    /**
     * Load multiple scripts
     */
    loadScripts(sources) {
        return Promise.all(sources.map(src => this.loadScript(src)));
    },

    /**
     * Load when element is visible (Intersection Observer)
     */
    loadOnVisible(elementId, scripts) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadScripts(scripts);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });

        observer.observe(element);
    },

    /**
     * Load on user interaction
     */
    loadOnInteraction(scripts) {
        const load = () => {
            this.loadScripts(scripts);
            ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
                document.removeEventListener(event, load, { once: true });
            });
        };

        ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
            document.addEventListener(event, load, { once: true, passive: true });
        });
    },

    /**
     * Preload hints for critical resources
     */
    preload(resources) {
        resources.forEach(({ href, as }) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = href;
            link.as = as;
            document.head.appendChild(link);
        });
    }
};

// Auto-defer non-critical scripts on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load analytics and non-critical features after interaction
    LazyLoader.loadOnInteraction([
        // Add non-critical scripts here if needed
    ]);
});

window.LazyLoader = LazyLoader;
