package staffchat;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PasswordController {

    private final EmployeeRepository employeeRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public PasswordController(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @PostMapping("/auth/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        String employeeId = body.get("employeeId");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        Employee employee = employeeRepository.findById(employeeId).orElse(null);
        if (employee == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Employee not found"));
        }
        if (!encoder.matches(oldPassword, employee.getPasswordHash())) {
            return ResponseEntity.status(400).body(Map.of("error", "Current password is wrong"));
        }
        employee.setPasswordHash(encoder.encode(newPassword));
        employeeRepository.save(employee);
        return ResponseEntity.ok(Map.of("message", "Password changed"));
    }
}