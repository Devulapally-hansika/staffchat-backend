package staffchat;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        if (path.startsWith("/api/auth")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (path.startsWith("/ws")) {
            String token = request.getParameter("token");
            if (token == null || !jwtUtil.isValid(token)) {
                response.setStatus(401);
                response.getWriter().write("Invalid or expired token");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            response.setStatus(401);
            response.getWriter().write("Missing token");
            return;
        }

        String token = header.substring(7);

        if (!jwtUtil.isValid(token)) {
            response.setStatus(401);
            response.getWriter().write("Invalid or expired token");
            return;
        }

        // ONLY ADMIN can create employees
        if (path.equals("/api/employees") && request.getMethod().equalsIgnoreCase("POST")) {
            String role = jwtUtil.extractRole(token);
            if (!"ADMIN".equals(role)) {
                response.setStatus(403);
                response.getWriter().write("Only ADMIN can create employees");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}