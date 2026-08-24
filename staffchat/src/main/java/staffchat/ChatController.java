package staffchat;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final EmployeeRepository employeeRepository;

    public ChatController(ChatRepository chatRepository, MessageRepository messageRepository, EmployeeRepository employeeRepository) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
        this.employeeRepository = employeeRepository;
    }

    @PostMapping("/chats")
    public Chat createChat(@RequestBody Chat chat) {
        return chatRepository.save(chat);
    }

    @PostMapping("/chats/private")
    public Chat createPrivateChat(@RequestParam String employeeId1, @RequestParam String employeeId2) {
        for (Chat chat : chatRepository.findAll()) {
            if (chat.getChatType().equals("PRIVATE")
                    && chat.getChatName().contains(employeeId1)
                    && chat.getChatName().contains(employeeId2)) {
                return chat; // already exists, return same room
            }
        }
        Chat chat = new Chat();
        chat.setChatName(employeeId1 + " ↔ " + employeeId2);
        chat.setChatType("PRIVATE");
        return chatRepository.save(chat);
    }

    @GetMapping("/chats")
    public List<Chat> getAllChats() {
        return chatRepository.findAll();
    }

    @GetMapping("/chats/my")
    public List<Chat> getMyChats(@RequestParam String employeeId) {
        Employee employee = employeeRepository.findById(employeeId).orElseThrow();

        List<Chat> myChats = new ArrayList<>();
        for (Chat chat : chatRepository.findAll()) {
            boolean isMyDepartment = chat.getChatType().equals("DEPARTMENT")
                    && chat.getChatName().equals(employee.getDepartment());
            boolean isMyPrivate = chat.getChatType().equals("PRIVATE")
                    && chat.getChatName().contains(employeeId);

            // NEW: Check if user is in a custom group
            boolean isMyGroup = chat.getChatType().equals("GROUP")
                    && chat.getMembers() != null
                    && chat.getMembers().contains(employeeId);

            boolean isAdmin = employee.getRole().equals("ADMIN");

            if (isMyDepartment || isMyPrivate || isMyGroup || isAdmin) {
                myChats.add(chat);
            }
        }
        return myChats;
    }

    @PostMapping("/messages")
    public Message sendMessage(@RequestBody Message message) {
        message.setSentAt(LocalDateTime.now());
        return messageRepository.save(message);
    }

    @GetMapping("/messages/{chatId}")
    public List<Message> getMessages(@PathVariable Long chatId) {
        return messageRepository.findByChatIdOrderBySentAtAsc(chatId);
    }
}