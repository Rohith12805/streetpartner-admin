import sys

def replace_in_file(path, old, new):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

auth_js = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner-admin\\backend\\src\\main\\resources\\static\\scripts\\auth.js'
dash_js = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner-admin\\backend\\src\\main\\resources\\static\\scripts\\dashboard.js'

replace_in_file(auth_js, 'http://localhost:8081/api', '/api')
replace_in_file(dash_js, 'http://localhost:8081/api', '/api')
