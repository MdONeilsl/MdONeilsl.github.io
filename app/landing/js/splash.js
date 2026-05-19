/**
 * ComfyUI Splash Screen Module
 * Shows a centered splash screen with ComfyUI section content on page load.
 * Displays only once per session (sessionStorage).
 * Includes a close button to dismiss.
 * Works on main page and all deprecated sub-pages.
 */
(function() {
    'use strict';

    const SESSION_KEY = 'comfyUISplashShown';

    // Splash screen content (mirrors the ComfyUI section from main page)
    const splashContent = {
        title: '⚡ ComfyUI Integrations',
        description: 'Moved many tools into ComfyUI. The workflows are designed to produce the same result using these tools.',
        linkText: 'Explore ComfyUI Tools →',
        linkUrl: 'https://github.com/MdONeilsl/comfyui-MdNodes',  // Update if you have a real URL
        placeholder: ''
    };

    // Styles for the splash screen (injected dynamically)
    const styles = `
        .comfyui-splash-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .comfyui-splash-overlay.show {
            opacity: 1;
        }
        .comfyui-splash-card {
            background: #0a0a0f;
            border: 1px solid #2a2a3a;
            border-radius: 16px;
            padding: 2rem 2.5rem;
            max-width: 600px;
            width: 90%;
            text-align: center;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            transform: scale(0.95);
            transition: transform 0.3s ease;
            animation: comfyuiFadeInScale 0.4s ease forwards;
        }
        .comfyui-splash-card::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, #9D4EDD 0%, #C77DFF 40%, #00F5D4 100%);
            border-radius: 18px;
            z-index: -1;
            opacity: 0.5;
        }
        @keyframes comfyuiFadeInScale {
            0% {
                opacity: 0;
                transform: scale(0.9);
            }
            100% {
                opacity: 1;
                transform: scale(1);
            }
        }
        .comfyui-splash-card h3 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #9D4EDD 0%, #C77DFF 40%, #00F5D4 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
        }
        .comfyui-splash-card p {
            color: #b0b0d0;
            margin-bottom: 1.5rem;
            font-size: 1rem;
            line-height: 1.5;
        }
        .comfyui-splash-link {
            display: inline-block;
            background: transparent;
            border: 2px solid #00F5D4;
            color: #00F5D4;
            padding: 0.6rem 1.5rem;
            border-radius: 40px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 1rem;
            cursor: pointer;
        }
        .comfyui-splash-link:hover {
            background: #00F5D4;
            color: #000000;
            box-shadow: 0 0 15px #00F5D4;
        }
        .comfyui-splash-placeholder {
            font-size: 0.8rem;
            color: #6a6a8a;
            margin-top: 1rem;
            border-top: 1px dashed #2a2a3a;
            padding-top: 1rem;
        }
        .comfyui-splash-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: rgba(255,255,255,0.1);
            border: none;
            color: #fff;
            font-size: 1.2rem;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        .comfyui-splash-close:hover {
            background: rgba(255,255,255,0.25);
            transform: scale(1.1);
        }
        @media (max-width: 640px) {
            .comfyui-splash-card {
                padding: 1.5rem;
            }
            .comfyui-splash-card h3 {
                font-size: 1.4rem;
            }
        }
    `;

    function injectStyles() {
        if (document.getElementById('comfyui-splash-styles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'comfyui-splash-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    function createSplashElement() {
        const overlay = document.createElement('div');
        overlay.className = 'comfyui-splash-overlay';
        overlay.id = 'comfyui-splash-overlay';

        const card = document.createElement('div');
        card.className = 'comfyui-splash-card';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'comfyui-splash-close';
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Close');

        const title = document.createElement('h3');
        title.textContent = splashContent.title;

        const description = document.createElement('p');
        description.textContent = splashContent.description;

        const link = document.createElement('a');
        link.className = 'comfyui-splash-link';
        link.textContent = splashContent.linkText;
        link.href = splashContent.linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const placeholder = document.createElement('div');
        placeholder.className = 'comfyui-splash-placeholder';
        placeholder.textContent = splashContent.placeholder;

        card.appendChild(closeBtn);
        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(link);
        card.appendChild(placeholder);
        overlay.appendChild(card);

        // Close event
        const closeSplash = () => {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
            sessionStorage.setItem(SESSION_KEY, 'true');
        };

        closeBtn.addEventListener('click', closeSplash);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSplash();
        });

        // Optional: close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeSplash();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        return overlay;
    }

    function showSplash() {
        // Only show once per session
        if (sessionStorage.getItem(SESSION_KEY) === 'true') return;

        injectStyles();
        const splash = createSplashElement();
        document.body.appendChild(splash);
        // trigger reflow for animation
        setTimeout(() => {
            splash.classList.add('show');
        }, 10);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showSplash);
    } else {
        showSplash();
    }
})();