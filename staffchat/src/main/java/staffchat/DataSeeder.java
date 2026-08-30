package staffchat;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedDatabase(EmployeeRepository employeeRepository) {
        return args -> {
            // REMOVED deleteAll() to prevent crashing the database!

            PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
            String defaultPassword = "Origins@2024"; // USE THIS PASSWORD TO LOGIN
            String hashedPassword = passwordEncoder.encode(defaultPassword);
            System.out.println(" Password hashed successfully!");

            List<Employee> employees = Arrays.asList(
                    // --- 3 ADMINS ---
                    createEmp("969", "Nakul Reddy Aerram", "originsivf.keka@gmail.com", "ADMIN", hashedPassword),
                    createEmp("102", "Karun Cheruku", "originsivf@gmail.com", "ADMIN", hashedPassword),
                    createEmp("1047", "Hansika Devulapally", "hansikad2005@gmail.com", "ADMIN", hashedPassword),

                    // --- 45 EMPLOYEES ---
                    createEmp("101", "Jhansi Rani Kankata", "jhansi.kankata@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("202", "Teja Domala", "domalateja@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("405", "Nagaraju Rachabanti", "rachabantinagaraju85@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("502", "Krishnaveni Rachabanti", "rkrishnaveni235@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("503", "Talamari Konkathi Mohan krishna", "mohankrishna8187@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("701", "Suhasini Muddemari", "originsivf.cm701@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("704", "Yukthasri Sri Machika", "originsivf.cm704@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("709", "Ashwini Gorige", "gorigeashwini02@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("711", "Rama Krishna Alugam", "originsivf.cm711@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("912", "Krishna Rao KV", "kriskary2@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("931", "Ramya Puli", "ramyasanthug1435@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("932", "Navya Konjeti", "navyakonjeti28@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("935", "Divya Suvva", "divyanagabushnam37@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("937", "Soujanya Penukula", "soujanyaperapu77@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("940", "Usha Erpula", "ushayadav8341@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("943", "Chevula Akshay", "akshaykumarch17@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("945", "Nithya Sivaramaan", "nithyasivaraaman@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("948", "Jannu Swetha", "swethashoba2123@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("959", "Sridhar K", "sridhargowda761@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("965", "Pallekanti Shyam", "nanu.shyam33@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("966", "Janakanoori Virinchi", "virinchijanak8@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("970", "Srinagavani Chunduru", "srinagavani.ch3797@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("975", "Keshab Kumar M", "hr@originsivf.com", "EMPLOYEE", hashedPassword),
                    createEmp("982", "Priyanka Neralla", "priyanakanerella@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("985", "Pravalika Mettu", "mettuvasantha123@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("986", "Prabhavathi Vadde", "prabhayadhav134@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("987", "Anusha Kampati", "sureshkampati7@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("988", "Swetha Reddy S", "sambiswetha@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("990", "Meghana Naddi", "chmeghana004@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1006", "Ravi Kumar K.S", "ravikumar6278@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1008", "Nikhil Suvva", "nikhilsuvva77@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1014", "Priyanka Alubaka", "alubakapriyanka@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1015", "Ravi Theja K R", "ravithejakr45@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1022", "Lakavathu Devi", "devilakavath9@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1026", "Jannu Varma", "jannuvarma6@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1027", "Gurram Mamatha", "mamathamamatha124568@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1029", "Ajay Sivaram Burri", "ajaysivaramburri@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1031", "Jalagam Divya", "jalagamdivya14@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1033", "Azmeera Meenakshi", "meenakshi.azmeera09@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1036", "Elthuri Chandrika", "aekuchandrika@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1041", "Punem Pavani Devi", "pavani.devi@originsivf.com", "EMPLOYEE", hashedPassword),
                    createEmp("1044", "Naga Manikya Veena .G", "gannabathulaveena@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1045", "Syed Fathima Zeenath", "syedfathimazeenath2003@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1046", "Gayathri Mokka", "mokkagayathri09@gmail.com", "EMPLOYEE", hashedPassword),
                    createEmp("1050", "Bandham Vani", "vanialeti3@gmail.com", "EMPLOYEE", hashedPassword)
            );

            for (Employee emp : employees) {
                employeeRepository.save(emp); // This safely updates roles without deleting data!
                System.out.println("✔ Saved: " + emp.getFullName() + " (" + emp.getEmployeeId() + ") - Role: " + emp.getRole());
            }

            System.out.println("\n SUCCESS! All 48 people updated in PostgreSQL!");
            System.out.println("👑 ADMINS: Nakul (969), Karun (102), Hansika (1047)");
            System.out.println(" Default Password for everyone: " + defaultPassword);
        };
    }

    private Employee createEmp(String id, String name, String email, String role, String hash) {
        Employee emp = new Employee();
        emp.setEmployeeId(id);
        emp.setFullName(name);
        emp.setEmail(email);
        emp.setRole(role);
        emp.setPasswordHash(hash);
        emp.setActive(true);
        return emp;
    }
}