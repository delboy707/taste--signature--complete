// ===== MOBILE MENU HANDLER =====
// Handles mobile navigation menu toggle and responsive behaviors

(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }

    function initMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        const body = document.body;

        if (!menuBtn || !sidebar || !overlay) {
            console.warn('Mobile menu elements not found');
            return;
        }

        // Toggle menu on button click
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });

        // Close menu when clicking overlay
        overlay.addEventListener('click', function() {
            closeMenu();
        });

        // Close menu when clicking nav items
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(function(item) {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    closeMenu();
                }
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && body.classList.contains('menu-open')) {
                closeMenu();
            }
        });

        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth > 768) {
                    // Desktop view - make sure menu state is reset
                    closeMenu();
                }
            }, 250);
        });

        // Prevent body scroll when menu is open on mobile
        function preventBodyScroll(prevent) {
            if (prevent) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
            }
        }

        function toggleMenu() {
            const isOpen = sidebar.classList.contains('mobile-active');

            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        function openMenu() {
            sidebar.classList.add('mobile-active');
            overlay.classList.add('active');
            body.classList.add('menu-open');
            menuBtn.setAttribute('aria-expanded', 'true');

            // Change icon and text
            const icon = menuBtn.querySelector('.menu-icon');
            const text = menuBtn.querySelector('.menu-text');
            if (icon) icon.textContent = '✕';
            if (text) text.textContent = 'CLOSE';

            preventBodyScroll(true);
        }

        function closeMenu() {
            sidebar.classList.remove('mobile-active');
            overlay.classList.remove('active');
            body.classList.remove('menu-open');
            menuBtn.setAttribute('aria-expanded', 'false');

            // Change back to hamburger and menu text
            const icon = menuBtn.querySelector('.menu-icon');
            const text = menuBtn.querySelector('.menu-text');
            if (icon) icon.textContent = '☰';
            if (text) text.textContent = 'MENU';

            preventBodyScroll(false);
        }

        // Touch swipe to close (optional enhancement)
        let touchStartX = 0;
        let touchEndX = 0;

        sidebar.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sidebar.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            // Swipe left to close (only if menu is open and on mobile)
            if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-active')) {
                if (touchStartX - touchEndX > 50) {
                    closeMenu();
                }
            }
        }

        console.log('✅ Mobile menu initialized');
    }

    // Install PWA prompt handler
    let deferredPrompt;
    const installBtn = document.getElementById('install-app-btn');

    window.addEventListener('beforeinstallprompt', function(e) {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;

        // Show install button if it exists
        if (installBtn) {
            installBtn.style.display = 'block';
        } else {
            // Create floating install button
            createInstallButton();
        }

        console.log('📱 PWA install prompt available');
    });

    function createInstallButton() {
        // Only show if not already installed and on mobile
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('✅ App already installed');
            return;
        }

        const btn = document.createElement('button');
        btn.id = 'pwa-install-btn';
        btn.className = 'btn btn-primary';
        btn.innerHTML = '📱 Install App';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            padding: 12px 24px;
            border-radius: 25px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideUp 0.5s ease;
        `;

        btn.addEventListener('click', async function() {
            if (!deferredPrompt) return;

            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user's response
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA install outcome: ${outcome}`);

            if (outcome === 'accepted') {
                console.log('✅ User accepted PWA install');
            } else {
                console.log('❌ User dismissed PWA install');
            }

            // Remove the button
            btn.remove();
            deferredPrompt = null;
        });

        // Add to body after auth
        const appContainer = document.getElementById('app-container');
        if (appContainer && appContainer.style.display !== 'none') {
            document.body.appendChild(btn);

            // Auto-hide after 10 seconds
            setTimeout(function() {
                if (btn.parentElement) {
                    btn.style.transition = 'opacity 0.5s';
                    btn.style.opacity = '0';
                    setTimeout(function() { btn.remove(); }, 500);
                }
            }, 10000);
        }
    }

    // Detect if app is installed
    window.addEventListener('appinstalled', function() {
        console.log('✅ PWA installed successfully!');
        // Hide install button if present
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.remove();
    });

    // Add CSS animation for install button
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

})();
