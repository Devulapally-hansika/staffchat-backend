package staffchat;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "chats")
public class Chat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String chatName;
    private String chatType; // DEPARTMENT, PRIVATE, or GROUP
    private String members;  // NEW: comma-separated IDs (e.g., "LAB01,REC01")

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getChatName() { return chatName; }
    public void setChatName(String chatName) { this.chatName = chatName; }

    public String getChatType() { return chatType; }
    public void setChatType(String chatType) { this.chatType = chatType; }

    public String getMembers() { return members; }
    public void setMembers(String members) { this.members = members; }
}