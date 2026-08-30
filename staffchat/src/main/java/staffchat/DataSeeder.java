package staffchat;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;

//@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedDatabase(EmployeeRepository employeeRepository) {
        return args -> {
            if (employeeRepository.count() > 10) {
                System.out.println("✅ Database already has employees. Skipping seed.");
                return;
            }

            PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
            String defaultPassword = "Origins@2024";
            String hashedPassword = passwordEncoder.encode(defaultPassword);
            System.out.println("🔒 Password hashed successfully!");

            // Create employees directly without helper method
            Employee emp1 = new Employee();
            emp1.setEmployeeId("969");
            emp1.setFullName("Nakul Reddy Aerram");
            emp1.setEmail("originsivf.keka@gmail.com");
            emp1.setRole("ADMIN");
            emp1.setPasswordHash(hashedPassword);
            emp1.setActive(true);

            Employee emp2 = new Employee();
            emp2.setEmployeeId("975");
            emp2.setFullName("Keshab Kumar M");
            emp2.setEmail("hr@originsivf.com");
            emp2.setRole("ADMIN");
            emp2.setPasswordHash(hashedPassword);
            emp2.setActive(true);

            Employee emp3 = new Employee();
            emp3.setEmployeeId("1047");
            emp3.setFullName("Hansika Devulapally");
            emp3.setEmail("hansikad2005@gmail.com");
            emp3.setRole("ADMIN");
            emp3.setPasswordHash(hashedPassword);
            emp3.setActive(true);

            // Add all employees to list
            List<Employee> employees = Arrays.asList(emp1, emp2, emp3
                    // Add remaining 45 employees here if needed
            );

            for (Employee emp : employees) {
                employeeRepository.save(emp);
                System.out.println("✔ Added: " + emp.getFullName() + " (" + emp.getEmployeeId() + ") - Role: " + emp.getRole());
            }

            System.out.println("\n SUCCESS! 3 ADMIN users added to PostgreSQL!");
            System.out.println("🔑 Default Password for everyone: " + defaultPassword);
        };
    }
}