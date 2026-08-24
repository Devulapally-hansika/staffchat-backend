package staffchat;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class DeleteChatController {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;

    public DeleteChatController(ChatRepository chatRepository, MessageRepository messageRepository) {
        this.chatRepository = chatRepository;
        this.messageRepository = messageRepository;
    }

    @DeleteMapping("/chats/{id}")
    public ResponseEntity<?> deleteChat(@PathVariable Long id) {
        for (Message m : messageRepository.findByChatIdOrderBySentAtAsc(id)) {
            messageRepository.delete(m);
        }
        if (chatRepository.existsById(id)) {
            chatRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "deleted"));
        }
        return ResponseEntity.status(404).body(Map.of("error", "not found"));
    }
}