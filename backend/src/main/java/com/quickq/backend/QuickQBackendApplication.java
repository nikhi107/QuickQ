package com.quickq.backend;

import com.quickq.backend.config.AppProperties;
import com.quickq.backend.entity.AdminUser;
import com.quickq.backend.repository.AdminUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class QuickQBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(QuickQBackendApplication.class, args);
    }

    @Bean
    CommandLineRunner seedDefaultAdmin(
        AdminUserRepository adminUserRepository,
        PasswordEncoder passwordEncoder,
        AppProperties appProperties
    ) {
        return args -> {
            AppProperties.BootstrapAdmin bootstrapAdmin = appProperties.getBootstrapAdmin();
            if (!bootstrapAdmin.isEnabled()
                || !StringUtils.hasText(bootstrapAdmin.getUsername())
                || !StringUtils.hasText(bootstrapAdmin.getPassword())) {
                return;
            }

            adminUserRepository.findByUsername(bootstrapAdmin.getUsername()).orElseGet(() -> {
                AdminUser admin = new AdminUser();
                admin.setUsername(bootstrapAdmin.getUsername());
                admin.setPasswordHash(passwordEncoder.encode(bootstrapAdmin.getPassword()));
                return adminUserRepository.save(admin);
            });
        };
    }
}
