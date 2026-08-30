package staffchat;

import com.fasterxml.jackson.databind.ObjectMapper; // FIXED THIS LINE
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final MessageRepository messageRepository;
    private final ChatRepository chatRepository;
    private final EmployeeRepository employeeRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public ChatWebSocketHandler(MessageRepository messageRepository,
                                ChatRepository chatRepository,
                                EmployeeRepository employeeRepository) {
        this.messageRepository = messageRepository;
        this.chatRepository = chatRepository;
        this.employeeRepository = employeeRepository;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String employeeId = getParam(session, "employeeId");
        if (employeeId != null) {
            sessions.put(employeeId, session);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String employeeId = getParam(session, "employeeId");
        if (employeeId != null) {
            sessions.remove(employeeId);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Message incoming = objectMapper.readValue(message.getPayload(), Message.class);
        incoming.setSentAt(LocalDateTime.now());
        Message saved = messageRepository.save(incoming);

        Chat chat = chatRepository.findById(saved.getChatId()).orElse(null);
        if (chat == null) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", saved.getId());
        payload.put("chatId", saved.getChatId());
        payload.put("senderId", saved.getSenderId());
        payload.put("content", saved.getContent());
        payload.put("sentAt", saved.getSentAt().toString());
        String json = objectMapper.writeValueAsString(payload);

        for (Map.Entry<String, WebSocketSession> entry : sessions.entrySet()) {
            if (canSee(entry.getKey(), chat)) {
                entry.getValue().sendMessage(new TextMessage(json));
            }
        }
    }

    private boolean canSee(String employeeId, Chat chat) {
        Employee employee = employeeRepository.findById(employeeId).orElse(null);
        if (employee == null) return false;

        // Admin sees everything
        if ("ADMIN".equals(employee.getRole())) return true;

        // Department rooms
        if ("DEPARTMENT".equals(chat.getChatType()) && chat.getChatName().equals(employee.getDepartment())) {
            return true;
        }

        // Private rooms
        if ("PRIVATE".equals(chat.getChatType()) && chat.getChatName().contains(employeeId)) {
            return true;
        }

        // NEW: Custom Groups (check if employee is in the members list)
        if ("GROUP".equals(chat.getChatType()) && chat.getMembers() != null) {
            String[] membersList = chat.getMembers().split(",");
            for (String m : membersList) {
                if (m.trim().equals(employeeId)) {
                    return true;
                }
            }
        }

        return false;
    }

    private String getParam(WebSocketSession session, String name) {
        if (session.getUri() == null || session.getUri().getQuery() == null) {
            return null;
        }
        for (String pair : session.getUri().getQuery().split("&")) {
            String[] kv = pair.split("=");
            if (kv.length == 2 && kv[0].equals(name)) {
                return kv[1];
            }
        }
        return null;
    }
}