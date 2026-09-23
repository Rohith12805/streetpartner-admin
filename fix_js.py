import sys
import re

file_path = 'C:\\Users\\rohit\\OneDrive\\Desktop\\streetpartner-admin\\backend\\src\\main\\resources\\static\\scripts\\dashboard.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken string
broken_part = """const text = EMERGENCY SOS!
Name: ${currentEmergency.userName || 'Unknown'}
Phone: ${currentEmergency.mobileNumber || 'N/A'}
Blood Group: ${currentEmergency.bloodGroup || 'N/A'}
Live Tracking: ${currentEmergency.liveLocationLink || 'N/A'};"""

fixed_part = """const text = `EMERGENCY SOS!
Name: ${currentEmergency.userName || 'Unknown'}
Phone: ${currentEmergency.mobileNumber || 'N/A'}
Blood Group: ${currentEmergency.bloodGroup || 'N/A'}
Live Tracking: ${currentEmergency.liveLocationLink || 'N/A'}`;"""

content = content.replace(broken_part, fixed_part)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed JS syntax error')
