package com.streetpartner.admin;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        try {
            // NOTE: For a real app, you would download the Firebase Admin SDK private key JSON file
            // from the Firebase Console (Settings -> Service Accounts) and place it in the project.
            // For now, we will assume it's located at "serviceAccountKey.json" in the root directory.
            
            // To get this working quickly, you MUST download the serviceAccountKey.json from Firebase
            // and place it in the backend folder!
            InputStream serviceAccount = new FileInputStream("serviceAccountKey.json");

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
        } catch (Exception e) {
            System.err.println("Failed to initialize Firebase Admin SDK. Did you add serviceAccountKey.json?");
            e.printStackTrace();
        }
    }
}
