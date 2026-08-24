package staffchat;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final ChatFileRepository repo;

    public FileController(ChatFileRepository repo) {
        this.repo = repo;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> upload(@RequestParam("chatId") Long chatId,
                                         @RequestParam("senderId") String senderId,
                                         @RequestParam("file") MultipartFile file) {
        try {
            ChatFile cf = new ChatFile();
            cf.setChatId(chatId);
            cf.setSenderId(senderId);
            cf.setFileName(file.getOriginalFilename());
            cf.setFileType(file.getContentType());
            cf.setData(file.getBytes());
            cf.setSentAt(LocalDateTime.now());
            ChatFile saved = repo.save(cf);
            return ResponseEntity.ok("{\"id\":" + saved.getId() + "}");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Upload failed");
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        return repo.findById(id).map(cf -> {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    cf.getFileType() != null ? cf.getFileType() : "application/octet-stream"));
            headers.setContentDispositionFormData("attachment", cf.getFileName());
            return new ResponseEntity<>(cf.getData(), headers, HttpStatus.OK);
        }).orElse(ResponseEntity.notFound().build());
    }
}