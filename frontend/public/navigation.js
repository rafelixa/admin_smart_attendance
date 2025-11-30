// Navigation functionality for admin pages
document.addEventListener('DOMContentLoaded', function() {
    console.log('[INFO] Navigation.js loaded');
    
    // Add navigation functionality to all admin pages
    
    // Back button functionality (already handled by href, but add visual feedback)
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        console.log('[INFO] Back button found');
        backButton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(-2px)';
            this.style.transition = 'transform 0.2s ease';
        });

        backButton.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    } else {
        console.log('[WARNING] Back button not found');
    }

    // Navigation menu items
    const navLinks = document.querySelectorAll('.frame-12 a, .div-wrapper-2');
    console.log('[INFO] Found', navLinks.length, 'navigation links');
    
    navLinks.forEach(link => {
        if (link) {
            link.addEventListener('mouseenter', function() {
                this.style.opacity = '0.8';
                this.style.transition = 'opacity 0.2s ease';
            });

            link.addEventListener('mouseleave', function() {
                this.style.opacity = '1';
            });
        }
    });

    // Note: Filter button functionality is handled by inline scripts in each page
    // to allow for page-specific filtering logic

    // Add visual feedback for clickable elements
    const clickableElements = document.querySelectorAll('a, button, .clickable');
    clickableElements.forEach(element => {
        if (element && !element.classList.contains('no-hover')) {
            element.style.cursor = 'pointer';
        }
    });
});