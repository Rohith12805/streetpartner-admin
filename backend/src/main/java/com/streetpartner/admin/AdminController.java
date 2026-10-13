package com.streetpartner.admin;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api")
public class AdminController {

    private String verifyAndGetEmail(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String idToken = authHeader.replace("Bearer ", "");
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            String email = decodedToken.getEmail();
            
            if (email == null) return null;

            Firestore db = FirestoreClient.getFirestore();
            ApiFuture<QuerySnapshot> query = db.collection("allowed_admins").whereEqualTo("email", email).get();
            QuerySnapshot querySnapshot = query.get(); 
            
            if (querySnapshot.isEmpty()) {
                System.out.println("Access Denied: Google Account " + email + " is not in the allowed_admins whitelist.");
                return null; 
            }
            
            return email; 
        } catch (Exception e) {
            return null;
        }
    }
    
    @PostMapping("/auth/verify")
    public ResponseEntity<String> verifyAuth(@RequestHeader("Authorization") String authHeader) {
        String adminEmail = verifyAndGetEmail(authHeader);
        if (adminEmail != null) {
            return ResponseEntity.ok("Authorized");
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
    }

    @GetMapping("/emergencies")
    public ResponseEntity<List<Map<String, Object>>> getActiveEmergencies(@RequestHeader("Authorization") String authHeader) {
        String adminEmail = verifyAndGetEmail(authHeader);
        if (adminEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            Firestore db = FirestoreClient.getFirestore();
            ApiFuture<QuerySnapshot> query = db.collection("emergencies").whereEqualTo("isActive", true).get();
            QuerySnapshot querySnapshot = query.get();
            
            List<Map<String, Object>> emergencies = new ArrayList<>();
            for (QueryDocumentSnapshot document : querySnapshot.getDocuments()) {
                Map<String, Object> data = document.getData();
                if (data.get("handledBy") == null) {
                    data.put("id", document.getId());
                    emergencies.add(data);
                }
            }
            return ResponseEntity.ok(emergencies);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/emergencies/history")
    public ResponseEntity<List<Map<String, Object>>> getHistory(@RequestHeader("Authorization") String authHeader) {
        String adminEmail = verifyAndGetEmail(authHeader);
        if (adminEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            Firestore db = FirestoreClient.getFirestore();
            ApiFuture<QuerySnapshot> query = db.collection("emergencies")
                .whereEqualTo("handledBy", adminEmail)
                .get();
            QuerySnapshot querySnapshot = query.get();
            
            List<Map<String, Object>> emergencies = new ArrayList<>();
            for (QueryDocumentSnapshot document : querySnapshot.getDocuments()) {
                Map<String, Object> data = document.getData();
                data.put("id", document.getId());
                emergencies.add(data);
            }
            return ResponseEntity.ok(emergencies);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/emergencies/stats")
    public ResponseEntity<List<Map<String, Object>>> getStats(@RequestHeader("Authorization") String authHeader) {
        String adminEmail = verifyAndGetEmail(authHeader);
        if (adminEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            Firestore db = FirestoreClient.getFirestore();
            ApiFuture<QuerySnapshot> query = db.collection("area_safety_cells").get();
            QuerySnapshot querySnapshot = query.get();
            
            List<Map<String, Object>> stats = new ArrayList<>();
            for (QueryDocumentSnapshot document : querySnapshot.getDocuments()) {
                Map<String, Object> data = document.getData();
                data.put("cellId", document.getId());
                stats.add(data);
            }
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/emergencies/{id}/accept")
    public ResponseEntity<String> acceptEmergency(@PathVariable String id, @RequestHeader("Authorization") String authHeader) {
        String adminEmail = verifyAndGetEmail(authHeader);
        if (adminEmail == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            Firestore db = FirestoreClient.getFirestore();
            Map<String, Object> updates = new HashMap<>();
            updates.put("handledBy", adminEmail);
            updates.put("handledAt", com.google.cloud.firestore.FieldValue.serverTimestamp());

            ApiFuture<WriteResult> writeResult = db.collection("emergencies").document(id).update(updates);
            writeResult.get(); 

            return ResponseEntity.ok("Emergency accepted");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}



