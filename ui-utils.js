// ===== UI UTILITIES =====
// Toast notifications, loading states, and error handling

const UI = {
    // Toast notification system
    toast: {
        container: null,

        init() {
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }
        },

        show(message, type = 'info', duration = 4000) {
            this.init();

            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <span>${icons[type] || ''} ${message}</span>
                <button class="toast-close" onclick="this.parentElement.remove()">×</button>
            `;

            this.container.appendChild(toast);

            if (duration > 0) {
                setTimeout(() => {
                    toast.style.animation = 'fadeIn 0.3s ease-out reverse';
                    setTimeout(() => toast.remove(), 300);
                }, duration);
            }

            return toast;
        },

        success(message) { return this.show(message, 'success'); },
        error(message) { return this.show(message, 'error', 6000); },
        warning(message) { return this.show(message, 'warning'); },
        info(message) { return this.show(message, 'info'); }
    },

    // Loading states
    loading: {
        overlay: null,

        show(message = 'Loading...') {
            if (!this.overlay) {
                this.overlay = document.createElement('div');
                this.overlay.className = 'page-loader';
                this.overlay.innerHTML = `
                    <div class="loading-spinner large"></div>
                    <div class="page-loader-text">${message}</div>
                `;
                document.body.appendChild(this.overlay);
            } else {
                this.overlay.querySelector('.page-loader-text').textContent = message;
                this.overlay.style.display = 'flex';
            }
        },

        hide() {
            if (this.overlay) {
                this.overlay.style.display = 'none';
            }
        },

        button(btn, loading = true) {
            if (loading) {
                btn.classList.add('btn-loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('btn-loading');
                btn.disabled = false;
            }
        }
    },

    // Error handling
    error: {
        handle(error, context = '') {
            console.error(`Error${context ? ` in ${context}` : ''}:`, error);

            let message = 'Something went wrong. Please try again.';

            if (error.message) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    message = 'Network error. Please check your connection.';
                } else if (error.message.includes('permission') || error.message.includes('denied')) {
                    message = 'Permission denied. Please check your settings.';
                } else if (error.message.includes('timeout')) {
                    message = 'Request timed out. Please try again.';
                } else {
                    message = error.message;
                }
            }

            UI.toast.error(message);
            return message;
        },

        // Wrap async functions with error handling
        async wrap(fn, context = '') {
            try {
                return await fn();
            } catch (error) {
                this.handle(error, context);
                throw error;
            }
        }
    },

    // Confirm dialogs
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-dialog scale-in">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="confirm-actions">
                        <button class="btn-secondary" data-action="cancel">Cancel</button>
                        <button class="btn-primary" data-action="confirm">Confirm</button>
                    </div>
                </div>
            `;

            overlay.querySelector('[data-action="cancel"]').onclick = () => {
                overlay.remove();
                resolve(false);
            };

            overlay.querySelector('[data-action="confirm"]').onclick = () => {
                overlay.remove();
                resolve(true);
            };

            document.body.appendChild(overlay);
        });
    },

    // Progress indicator
    progress: {
        bar: null,

        show(containerId, percent = 0) {
            const container = document.getElementById(containerId);
            if (!container) return;

            if (!this.bar) {
                container.innerHTML = `
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${percent}%"></div>
                    </div>
                `;
                this.bar = container.querySelector('.progress-bar-fill');
            }
        },

        update(percent) {
            if (this.bar) {
                this.bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            }
        },

        hide() {
            if (this.bar) {
                this.bar.parentElement.remove();
                this.bar = null;
            }
        }
    }
};

// Add confirm dialog styles
const confirmStyles = document.createElement('style');
confirmStyles.textContent = `
.confirm-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100001;
}

.confirm-dialog {
    background: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.confirm-dialog h3 {
    margin: 0 0 12px 0;
    color: #1f2937;
}

.confirm-dialog p {
    margin: 0 0 20px 0;
    color: #6b7280;
}

.confirm-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}
`;
document.head.appendChild(confirmStyles);

// Export globally
window.UI = UI;
