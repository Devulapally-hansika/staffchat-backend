package staffchat;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

record LoginRequest(String employeeId, String password) {}
record LoginResponse(String token, String employeeId, String fullName, String role) {}
record ForgotPasswordRequest(String employeeId, String email, String newPassword) {} // NEW

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
    public LoginResponse login(@RequestBody LoginRequest request) {
        String searchId = request.employeeId().trim().toUpperCase();
        Optional<Employee> found = employeeRepository.findById(searchId);

        if (found.isEmpty()) {
            throw new RuntimeException("Invalid employee ID or password");
        }

        Employee employee = found.get();

        if (!passwordEncoder.matches(request.password(), employee.getPasswordHash())) {
            throw new RuntimeException("Invalid employee ID or password");
        }

        String token = jwtUtil.generateToken(employee.getEmployeeId(), employee.getRole());
        return new LoginResponse(token, employee.getEmployeeId(), employee.getFullName(), employee.getRole());
    }

    // 🔹 NEW ENDPOINT FOR FORGOT PASSWORD
    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String searchId = request.employeeId().trim().toUpperCase();
        Optional<Employee> found = employeeRepository.findById(searchId);

        if (found.isEmpty()) {
            throw new RuntimeException("Employee ID not found");
        }

        Employee employee = found.get();

        // Verify the email matches the one in database
        if (employee.getEmail() == null || !employee.getEmail().equalsIgnoreCase(request.email().trim())) {
            throw new RuntimeException("Email does not match our records");
        }

        // Update password
        employee.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        employeeRepository.save(employee);

        return "Password reset successful";
    }
}