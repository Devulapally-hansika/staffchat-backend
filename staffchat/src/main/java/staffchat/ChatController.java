package staffchat;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final EmployeeRepository employeeRepository;

    public ChatController(ChatRepository chatRepository,
                          MessageRepository messageRepository,
                          EmployeeRepository employeeRepository) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.employeeRepository = employeeRepository;
    }

    @PostMapping("/chats")
    public Chat createChat(@RequestBody Chat chat) {
        if (chat.getMembers() == null && "PRIVATE".equalsIgnoreCase(chat.getChatType()) && chat.getChatName() != null) {
            String[] parts = chat.getChatName().split("↔|<->|-");
            if (parts.length >= 2) {
                chat.setMembers(parts[0].trim() + "," + parts[1].trim());
            }
        }
        return chatRepository.save(chat);
    }

    @PostMapping("/chats/private")
    public Chat createPrivateChat(@RequestParam String employeeId1, @RequestParam String employeeId2) {
        String id1 = employeeId1.trim();
        String id2 = employeeId2.trim();
        String u1 = id1.toUpperCase();
        String u2 = id2.toUpperCase();

        for (Chat chat : chatRepository.findAll()) {
            if ("PRIVATE".equalsIgnoreCase(chat.getChatType())) {
                String members = chat.getMembers() != null ? chat.getMembers().toUpperCase() : "";
                String name = chat.getChatName() != null ? chat.getChatName().toUpperCase() : "";

                boolean matchInMembers = members.contains(u1) && members.contains(u2);
                boolean matchInName = name.contains(u1) && name.contains(u2);

                if (matchInMembers || matchInName) {
                    return chat;
                }
            }
        }

        Chat newChat = new Chat();
        newChat.setChatName(id1 + " ↔ " + id2);
        newChat.setChatType("PRIVATE");
        newChat.setMembers(id1 + "," + id2);
        return chatRepository.save(newChat);
    }

    @GetMapping("/chats")
    public List<Chat> getAllChats() {
        return chatRepository.findAll();
    }

    @GetMapping("/chats/my")
    public List<Chat> getMyChats(@RequestParam String employeeId) {
        if (employeeId == null || employeeId.trim().isEmpty()) {
            return chatRepository.findAll();
        }

        String targetId = employeeId.trim().toUpperCase();
        Employee employee = employeeRepository.findById(employeeId.trim()).orElse(null);

        List<Chat> myChats = new ArrayList<>();
        List<Chat> allChats = chatRepository.findAll();

        for (Chat chat : allChats) {
            String cType = chat.getChatType() != null ? chat.getChatType().toUpperCase() : "";
            String cName = chat.getChatName() != null ? chat.getChatName().toUpperCase() : "";
            String cMembers = chat.getMembers() != null ? chat.getMembers().toUpperCase() : "";

            boolean isMyPrivate = "PRIVATE".equals(cType) && (cMembers.contains(targetId) || cName.contains(targetId));
            boolean isMyDepartment = employee != null
                    && "DEPARTMENT".equals(cType)
                    && cName.equalsIgnoreCase(employee.getDepartment());
            boolean isMyGroup = "GROUP".equals(cType) && cMembers.contains(targetId);
            boolean isAdmin = employee != null && "ADMIN".equalsIgnoreCase(employee.getRole());

            if (isMyPrivate || isMyDepartment || isMyGroup || isAdmin) {
                myChats.add(chat);
            }
        }
        return myChats;
    }

    // --- Send Message: Clean return for link app + IST for phone app ---
    @PostMapping("/messages")
    public Message sendMessage(@RequestBody Message message) {
        // Sets time strictly to Indian Standard Time (Asia/Kolkata)
        message.setSentAt(LocalDateTime.now(ZoneId.of("Asia/Kolkata")));
        return messageRepository.save(message);
    }

    // --- Get Messages: Guaranteed sequential sorting by database ID ---
    @GetMapping("/messages/{chatId}")
    public List<Message> getMessages(@PathVariable Long chatId) {
        List<Message> allMessages = messageRepository.findAll();
        List<Message> chatMessages = new ArrayList<>();

        for (Message m : allMessages) {
            if (m.getChatId() != null && m.getChatId().equals(chatId)) {
                chatMessages.add(m);
            }
        }

        // Guarantees earlier messages are first, latest messages are last
        chatMessages.sort((a, b) -> Long.compare(a.getId() != null ? a.getId() : 0L,
                b.getId() != null ? b.getId() : 0L));
        return chatMessages;
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long messageId) {
        if (messageRepository.existsById(messageId)) {
            messageRepository.deleteById(messageId);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}