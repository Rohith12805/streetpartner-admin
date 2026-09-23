import sys

file_path = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner-admin\\backend\\src\\main\\resources\\static\\scripts\\dashboard.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        } else if (response.status === 401) {
            console.error("Unauthorized");
            window.location.href = 'index.html';
        }"""

replacement = """        } else if (response.status === 401) {
            console.error("Unauthorized");
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        }"""

content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed dashboard.js')
