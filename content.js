/**
 * EkkoR
 * Core logic for tracking scroll position and returning to comments.
 */

(function() {
    let lastScrollPos = 0;
    let returnButton = null;
    let isButtonShown = false;

    // Create the return button DOM element
    function createButton() {
        if (returnButton) return;

        returnButton = document.createElement('div');
        returnButton.className = 'yt-return-button';
        returnButton.innerHTML = `
            <div class="yt-return-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                    <path d="M13 18v-5H7v5l-5-6 5-6v5h8v7h-2zM19 6V4h2v14h-2V6z"></path>
                </svg>
            </div>
        `;

        document.body.appendChild(returnButton);

        let isDragging = false;
        let startX, startY;
        let translateX = 0, translateY = 0;
        let dragThreshold = 80; // Distance to trigger dismissal

        returnButton.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            returnButton.style.transition = 'none'; // Disable transition during drag
            returnButton.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            
            // Apply coordinates, maintaining the -50% horizontal center base
            returnButton.style.transform = `translate(calc(-50% + ${translateX}px), ${translateY}px) scale(0.95)`;
            
            // Visual feedback: change opacity if closer to dismissal
            const distance = Math.sqrt(translateX * translateX + translateY * translateY);
            returnButton.style.opacity = Math.max(0.3, 1 - distance / (dragThreshold * 2));
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            returnButton.classList.remove('dragging');
            
            const distance = Math.sqrt(translateX * translateX + translateY * translateY);
            
            if (distance > dragThreshold) {
                // Dismiss: fly away in the direction of drag
                const angle = Math.atan2(translateY, translateX);
                const flyX = Math.cos(angle) * 500;
                const flyY = Math.sin(angle) * 500;
                
                returnButton.style.transition = 'all 0.5s cubic-bezier(0.1, 0, 0.3, 1)';
                returnButton.style.transform = `translate(calc(-50% + ${flyX}px), ${flyY}px) scale(0.5)`;
                returnButton.style.opacity = '0';
                
                setTimeout(hideButton, 500);
            } else if (distance < 5) {
                // It's a simple click!
                window.scrollTo({
                    top: lastScrollPos,
                    behavior: 'smooth'
                });
                setTimeout(hideButton, 1000);
            } else {
                // Snap back to center
                returnButton.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                returnButton.style.transform = 'translate(-50%, 0) scale(1)';
                returnButton.style.opacity = '1';
            }
            
            // Reset temp variables
            translateX = 0;
            translateY = 0;
        });
    }

    function showButton() {
        if (!returnButton) createButton();
        
        // Only show if we actually scrolled significantly (e.g., to the top)
        setTimeout(() => {
            if (window.scrollY < lastScrollPos - 200) {
                returnButton.classList.add('show');
                isButtonShown = true;
            }
        }, 300); // Give YouTube time to scroll
    }

    function hideButton() {
        if (returnButton) {
            returnButton.classList.remove('show');
            isButtonShown = false;
        }
    }

    // Check if the clicked element is a timestamp
    function isTimestampLink(el) {
        if (!el || el.tagName !== 'A') return false;
        
        // YouTube timestamps usually have &t= or ?t= in the href
        const href = el.getAttribute('href') || '';
        const text = el.innerText.trim();
        
        // Matches format like 1:23, 0:05, 12:34:56
        const timestampRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
        
        return (href.includes('&t=') || href.includes('?t=')) && timestampRegex.test(text);
    }

    document.addEventListener('click', (e) => {
        const target = e.target.closest('a');
        if (isTimestampLink(target)) {
            // Wait! Before YouTube scrolls to top, save our current position
            lastScrollPos = window.scrollY;
            showButton();
        }
    }, true); // Capture phase to catch it before YouTube's listeners might stop propagation

    // Auto-hide button if user manually scrolls back down to the comment area
    window.addEventListener('scroll', () => {
        if (isButtonShown && window.scrollY > lastScrollPos - 100) {
            hideButton();
        }
    });

    // Handle SPA navigation (different video)
    document.addEventListener('yt-navigate-finish', hideButton);

    // Shortcut: Press 'R' to return (Ekko concept)
    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in an input field
        const activeEl = document.activeElement;
        const isTyping = activeEl.tagName === 'INPUT' || 
                         activeEl.tagName === 'TEXTAREA' || 
                         activeEl.isContentEditable;
        
        if (isTyping) return;

        if (e.key.toLowerCase() === 'r' && isButtonShown) {
            window.scrollTo({
                top: lastScrollPos,
                behavior: 'smooth'
            });
            // Visual feedback on the button
            if (returnButton) {
                returnButton.style.transform = 'translate(-50%, -10px) scale(1.2)';
                setTimeout(() => {
                    returnButton.style.transform = 'translate(-50%, 0) scale(1)';
                }, 200);
            }
            setTimeout(hideButton, 1000);
        }
    });

    console.log('EkkoR loaded. Press [R] to return to comments.');
})();
