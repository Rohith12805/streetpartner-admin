import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate(r"..\streetpartner-admin\backend\serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Recreate the allowed_admins collection and add the user's email
print("Creating allowed_admins whitelist...")
doc_ref = db.collection('allowed_admins').document()
doc_ref.set({
    'email': 'rohith.galam128@gmail.com'
})

print("Whitelist created successfully!")
