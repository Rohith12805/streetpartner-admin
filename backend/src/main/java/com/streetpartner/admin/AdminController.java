package com.streetpartner.admin;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api")
public class AdminController {

    // Helper method to verify the Firebase ID token sent from the frontend
    private boolean isAuthorized(String idToken) {
        if (idToken == null || idToken.isEmpty()) return false;
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            String email = decodedToken.getEmail();
            if (email == null) return false;

            // Optional: Check if this email exists in an "allowed_admins" Firestore collection
            Firestore db = FirestoreClient.getFirestore();
            ApiFuture<QuerySnapshot> query = db.collection("allowed_admins").whereEqualTo("email", email).get();
            QuerySnapshot querySnapshot = query.get();
            
            // Enforce Whitelist Security:
            if (querySnapshot.isEmpty()) {
                System.out.println("Access Denied: Email " + email + " is not in the allowed_admins collection.");
                return false;
            }
            return true; 
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    @PostMapping("/auth/verify")
    public ResponseEntity<String> verifyAuth(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        if (isAuthorized(token)) {
            return ResponseEntity.ok("Authorized");
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
    }

    @GetMapping("/emergencies")
    public ResponseEntity<List<Map<String, Object>>> getEmergencies(@RequestHeader(value = "Authorization", defaultValue = "") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        if (!isAuthorized(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            Firestore db = FirestoreClient.getFirestore();
            // Get all active emergencies (where isActive is true or just all of them)
            ApiFuture<QuerySnapshot> query = db.collection("emergencies").get();
            QuerySnapshot querySnapshot = query.get();
            
            List<Map<String, Object>> emergencies = new ArrayList<>();
            for (QueryDocumentSnapshot document : querySnapshot.getDocuments()) {
                Map<String, Object> data = document.getData();
                data.put("id", document.getId()); // inject document ID
                emergencies.add(data);
            }
            return ResponseEntity.ok(emergencies);
        } catch (InterruptedException | ExecutionException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
