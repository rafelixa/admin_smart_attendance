// Dashboard script: handle sign-out and page navigation (correct relative paths)
document.addEventListener('DOMContentLoaded', function () {
    const signOut = document.querySelector('.sign-out');
    const requestListButton = document.querySelector('.request-list-button');
    const userListButton = document.querySelector('.user-list-button');
    const cameraButton = document.querySelector('.camera-button');

    function makeClickable(el) {
        if (!el) return;
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'transform 0.2s ease';
        });
        el.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });
        el.addEventListener('mousedown', function () {
            this.style.transform = 'translateY(0)';
        });
        el.addEventListener('mouseup', function () {
            this.style.transform = 'translateY(-2px)';
        });
    }

    // Sign out -> confirm then go to login
    if (signOut) {
        makeClickable(signOut);
        signOut.addEventListener('click', function () {
            if (confirm('Are you sure you want to log out?')) {
                window.location.href = '../login/index.html';
            }
        });
    }

    // Navigate to other pages (use correct relative paths to sibling pages)
    if (requestListButton) {
        makeClickable(requestListButton);
        requestListButton.addEventListener('click', function () {
            window.location.href = '../request_list/index.html';
        });
    }

    if (userListButton) {
        makeClickable(userListButton);
        userListButton.addEventListener('click', function () {
            window.location.href = '../userlist/index.html';
        });
    }

    if (cameraButton) {
        makeClickable(cameraButton);
        cameraButton.addEventListener('click', function () {
            window.location.href = '../camera/index.html';
        });
    }
});