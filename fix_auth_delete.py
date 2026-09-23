import sys

file_path = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner-admin\\backend\\src\\main\\resources\\static\\scripts\\auth.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """        if (response.ok) {
            window.location.href = 'dashboard.html';
        } else {
            errorMsg.innerText = "Access Denied. Your email is not authorized.";
            errorMsg.style.display = 'block';
            loginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Sign in with Google';
            auth.signOut();
        }"""

replacement1 = """        if (response.ok) {
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
        }"""

content = content.replace(target1, replacement1)

target2 = """        if (response.ok) {
            window.location.href = 'dashboard.html';
        } else {
            // Not in whitelist, sign them out so they don't get stuck in a loop
            auth.signOut();
            errorMsg.innerText = "Access Denied. Your email is not authorized.";
            errorMsg.style.display = 'block';
        }"""

replacement2 = """        if (response.ok) {
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
        }"""

content = content.replace(target2, replacement2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated auth.js to delete unauthorized users')
