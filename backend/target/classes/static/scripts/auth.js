import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCb8NaJUQk128aT3Ayl2mZsPwmUUNm_y3k",
    authDomain: "streetpartner-admin.firebaseapp.com",
    projectId: "streetpartner-admin",
    storageBucket: "streetpartner-admin.firebasestorage.app",
    messagingSenderId: "601907972037",
    appId: "1:601907972037:web:12fb87911ef1d50c0bedac"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

loginBtn.addEventListener('click', async () => {
    try {
        errorMsg.style.display = 'none';
        loginBtn.innerHTML = 'Signing in...';
        
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken();
        
        // Verify with Spring Boot Backend
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            window.location.href = 'dashboard.html';
        } else {
            // Not in whitelist: Delete their account from Firebase completely!
            const user = auth.currentUser;
            if (user) {
                await user.delete().catch(e => console.error(e));
            }
            
            errorMsg.innerText = "Access Denied. Your email is not authorized.";
            errorMsg.style.display = 'block';
            loginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Sign in with Google';
            auth.signOut();
        }
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Login failed: " + error.message;
        errorMsg.style.display = 'block';
        loginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Sign in with Google';
    }
});

// If already logged in, verify token before redirecting
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const token = await user.getIdToken();
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            window.location.href = 'dashboard.html';
        } else {
            // Not in whitelist, delete and sign them out so they don't get stuck in a loop
            const user = auth.currentUser;
            if (user) {
                await user.delete().catch(e => console.error(e));
            }
            auth.signOut();
            errorMsg.innerText = "Access Denied. Your email is not authorized.";
            errorMsg.style.display = 'block';
        }
    }
});
