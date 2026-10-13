import firebase_admin
from firebase_admin import credentials, firestore, auth

cred = credentials.Certificate(r"..\streetpartner-admin\backend\serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Delete all users
print("Deleting all users in Firebase Auth...")
page = auth.list_users()
while page:
    for user in page.users:
        print(f"Deleting user: {user.uid} ({user.email})")
        auth.delete_user(user.uid)
    page = page.get_next_page()

# Delete all collections
print("Deleting all collections in Firestore...")
def delete_collection(coll_ref, batch_size):
    docs = coll_ref.limit(batch_size).stream()
    deleted = 0
    for doc in docs:
        print(f"Deleting doc {doc.id} => {doc.to_dict()}")
        doc.reference.delete()
        deleted += 1
    if deleted >= batch_size:
        return delete_collection(coll_ref, batch_size)

collections = db.collections()
for coll in collections:
    print(f"Deleting collection: {coll.id}")
    delete_collection(coll, 50)

print("ALL DATA WIPED SUCCESSFULLY!")
