package com.rmsproject.restaurant_management_system.utilSINGLETON;

import java.util.concurrent.ConcurrentHashMap;


//SessionManager is a Singleton class that manages all active user sessions.
// It makes sure only one instance exists and can be used to force logout
// users or send real‑time notifications.

public class SessionManager {
    private static SessionManager instance;
    private final ConcurrentHashMap<String, Object> sessions = new ConcurrentHashMap<>();

    private SessionManager() {}

    public static synchronized SessionManager getInstance() {
        if (instance == null) {
            instance = new SessionManager();
        }
        return instance;
    }

    public void addSession(String userId, Object session) { sessions.put(userId, session); }
    public void removeSession(String userId) { sessions.remove(userId); }
}