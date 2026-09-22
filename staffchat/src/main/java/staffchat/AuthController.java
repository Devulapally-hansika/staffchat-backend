package staffchat;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

record LoginRequest(String employeeId, String password) {}
record LoginResponse(String token, String employeeId, String fullName, String role) {}
record ForgotPasswordRequest(String employeeId, String email, String newPassword) {}

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final EmployeeRepository employeeRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthController(EmployeeRepository employeeRepository, JwtUtil jwtUtil) {
        this.employeeRepository = employeeRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            String searchId = request.employeeId().trim().toUpperCase();

            // Reverted to findById. It works perfectly because your ID is a String.
            Optional<Employee> found = employeeRepository.findById(searchId);

            if (found.isEmpty()) {
                return ResponseEntity.status(401).body("Invalid employee ID or password");
            }

            Employee employee = found.get();

            if (employee.getPasswordHash() == null || !passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
                return ResponseEntity.status(401).body("Invalid employee ID or password");
            }

            String token = jwtUtil.generateToken(employee.getEmployeeId(), employee.getRole());
            return ResponseEntity.ok(new LoginResponse(token, employee.getEmployeeId(), employee.getFullName(), employee.getRole()));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            String searchId = request.employeeId().trim().toUpperCase();
            Optional<Employee> found = employeeRepository.findById(searchId);

            if (found.isEmpty()) {
                return ResponseEntity.status(404).body("Employee ID not found");
            }

            Employee employee = found.get();

            if (employee.getEmail() == null || !employee.getEmail().equalsIgnoreCase(request.email().trim())) {
                return ResponseEntity.status(400).body("Email does not match our records");
            }

            employee.setPasswordHash(passwordEncoder.encode(request.newPassword()));
            employeeRepository.save(employee);

            return ResponseEntity.ok("Password reset successful");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
    }

    @GetMapping("/setup")
    public String setupAdmin() {
        Employee admin = new Employee();
        admin.setEmployeeId("ADMIN01");
        admin.setFullName("Hospital Admin");
        admin.setRole("ADMIN");
        admin.setEmail("admin@hospital.com");
        admin.setPasswordHash(passwordEncoder.encode("admin123"));
        admin.setActive(true);
        employeeRepository.save(admin);
        return "SUCCESS! ID: ADMIN01  Password: admin123";
    }

    @GetMapping("/ping")
    public String ping() {
        return "OK";
    }
}