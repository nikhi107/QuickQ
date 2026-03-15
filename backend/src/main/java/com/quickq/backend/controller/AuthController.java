package com.quickq.backend.controller;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.entity.AdminUser;
import com.quickq.backend.repository.AdminUserRepository;
import com.quickq.backend.security.JwtService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(
        AdminUserRepository adminUserRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/admin/signup")
    public ResponseEntity<?> signUp(@RequestBody ApiDtos.AdminSignupRequest request) {
        if (adminUserRepository.existsByUsername(request.username())) {
            return ResponseEntity.badRequest().body(Map.of("detail", "Username already registered"));
        }

        AdminUser adminUser = new AdminUser();
        adminUser.setUsername(request.username());
        adminUser.setPasswordHash(passwordEncoder.encode(request.password()));
        adminUserRepository.save(adminUser);

        return ResponseEntity.ok(new ApiDtos.AuthResponse(
            jwtService.generateToken(adminUser.getUsername()),
            "bearer"
        ));
    }

    @PostMapping(
        value = "/admin/login",
        consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE
    )
    public ResponseEntity<?> login(
        @RequestParam String username,
        @RequestParam String password
    ) {
        return adminUserRepository.findByUsername(username)
            .filter(user -> passwordEncoder.matches(password, user.getPasswordHash()))
            .<ResponseEntity<?>>map(user -> ResponseEntity.ok(new ApiDtos.AuthResponse(
                jwtService.generateToken(user.getUsername()),
                "bearer"
            )))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("detail", "Incorrect username or password")));
    }
}
