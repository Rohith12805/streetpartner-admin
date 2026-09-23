import sys

file_path = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner-admin\\backend\\src\\main\\resources\\static\\scripts\\auth.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """// If already logged in, redirect
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // optionally verify token again here, or just redirect
        window.location.href = 'dashboard.html';
    }
});"""

replacement = """// If already logged in, verify token before redirecting
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
            // Not in whitelist, sign them out so they don't get stuck in a loop
            auth.signOut();
            errorMsg.innerText = "Access Denied. Your email is not authorized.";
            errorMsg.style.display = 'block';
        }
    }
});"""

content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed auth.js')
