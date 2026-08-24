package staffchat;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public EmployeeController(EmployeeRepository employeeRepository, JwtUtil jwtUtil) {
        this.employeeRepository = employeeRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    @PostMapping
    public Employee createEmployee(@RequestBody Employee employee) {
        // CLEAN THE DATA BEFORE SAVING
        employee.setEmployeeId(employee.getEmployeeId().trim().toUpperCase());
        employee.setFullName(capitalizeWords(employee.getFullName()));
        employee.setRole(employee.getRole().trim().toUpperCase());
        employee.setPasswordHash(passwordEncoder.encode(employee.getPasswordHash()));
        return employeeRepository.save(employee);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> req,
                                            HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        String employeeId = jwtUtil.extractEmployeeId(token);

        Employee employee = employeeRepository.findById(employeeId).orElse(null);
        if (employee == null) {
            return ResponseEntity.status(401).body("Invalid token");
        }

        String oldPassword = req.get("oldPassword");
        String newPassword = req.get("newPassword");

        if (!passwordEncoder.matches(oldPassword, employee.getPasswordHash())) {
            return ResponseEntity.status(401).body("Old password is wrong");
        }

        employee.setPasswordHash(passwordEncoder.encode(newPassword));
        employeeRepository.save(employee);
        return ResponseEntity.ok("Password changed successfully");
    }

    // HELPER: "ravi kumar" → "Ravi Kumar"
    private String capitalizeWords(String name) {
        if (name == null || name.trim().isEmpty()) return name;
        String[] words = name.trim().toLowerCase().split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (result.length() > 0) result.append(" ");
            result.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) result.append(word.substring(1));
        }
        return result.toString();
    }
}