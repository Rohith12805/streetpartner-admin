import sys
import re

file_path = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner\\android\\app\\src\\main\\kotlin\\com\\example\\streetpartner\\SosForegroundService.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                getSystemService(SmsManager::class.java)
            } else {
                SmsManager.getDefault()
            }"""

replacement = """            val smsManager: SmsManager = SmsManager.getDefault()"""

content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed SmsManager code')
