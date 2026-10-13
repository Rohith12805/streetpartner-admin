import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAtHdm7HlLgeNrMiFI2IYhXWLwv0WOUrAo",
    authDomain: "streetpartner.firebaseapp.com",
    projectId: "streetpartner",
    storageBucket: "streetpartner.firebasestorage.app",
    messagingSenderId: "36523415965",
    appId: "1:36523415965:web:6ad9e28eb654ddbc547774"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Always force Google account picker popup (no silent cached auto-selection)
provider.setCustomParameters({ prompt: 'select_account' });

const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

// Clear any residual session on the login screen
signOut(auth).catch(() => {});

loginBtn.addEventListener('click', async () => {
    try {
        errorMsg.style.display = 'none';
        loginBtn.innerHTML = 'Opening Google Sign-In...';

        const result = await signInWithPopup(auth, provider);
        loginBtn.innerHTML = 'Verifying permissions...';

        const token = await result.user.getIdToken();
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (response.ok) {
            loginBtn.innerHTML = 'Access Granted. Redirecting...';
            window.location.replace('dashboard.html');
        } else {
            await signOut(auth);
            errorMsg.innerText = "Access Denied. Your email is not authorized as an admin.";
            errorMsg.style.display = 'block';
            loginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Sign in with Google';
        }
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            loginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Sign in with Google';
            return;
        }
        console.error("Login error:", error);
        errorMsg.innerText = "Login failed: " + (error.message || 'Unknown error');
        errorMsg.style.display = 'block';
        loginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Sign in with Google';
    }
});
