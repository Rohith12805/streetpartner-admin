import sys
import re

file_path = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner-admin\\backend\\src\\main\\java\\com\\streetpartner\\admin\\AdminController.java'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """            // For now, if the allowed_admins collection is empty or doesn't exist, you might want to 
            // just return true to allow ANY google login for testing, but in production this should be restricted.
            // For this prototype, let's just return true if the token is valid, OR you can enforce the check.
            return true;"""

replacement = """            // Enforce Whitelist Security:
            if (querySnapshot.isEmpty()) {
                System.out.println("Access Denied: Email " + email + " is not in the allowed_admins collection.");
                return false;
            }
            return true;"""

content = content.replace(target, replacement)

# Also uncomment the check in getEmergencies
target_get = """        // String token = authHeader.replace("Bearer ", "");
        // if (!isAuthorized(token)) {
        //     return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        // }"""

replacement_get = """        String token = authHeader.replace("Bearer ", "");
        if (!isAuthorized(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }"""
content = content.replace(target_get, replacement_get)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
