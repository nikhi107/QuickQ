package com.quickq.backend;

import com.quickq.backend.config.AppProperties;
import com.quickq.backend.entity.AdminUser;
import com.quickq.backend.entity.QueueDefinition;
import com.quickq.backend.repository.AdminUserRepository;
import com.quickq.backend.repository.QueueDefinitionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
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

    @Bean
    CommandLineRunner seedDefaultQueues(QueueDefinitionRepository queueDefinitionRepository) {
        return args -> {
            queueDefinitionRepository.save(
                queueDefinition(
                    "main-clinic",
                    "General OPD",
                    "General consultation and reception desk",
                    "General consultations, check-in, and reception.",
                    "Counter A",
                    "#0f766e",
                    "#115e59",
                    1
                )
            );
            queueDefinitionRepository.save(
                queueDefinition(
                    "pharmacy",
                    "Dispensary",
                    "Prescription pickup and medicine support",
                    "Prescription pickup and medicine support.",
                    "Counter B",
                    "#b45309",
                    "#92400e",
                    2
                )
            );
            queueDefinitionRepository.save(
                queueDefinition(
                    "support-desk",
                    "Billing Counter",
                    "Billing, documents, and service assistance",
                    "Billing, documents, and assistance requests.",
                    "Counter C",
                    "#1d4ed8",
                    "#1e3a8a",
                    3
                )
            );
        };
    }

    private QueueDefinition queueDefinition(
        String queueId,
        String displayName,
        String adminSubtitle,
        String clientDescription,
        String counterLabel,
        String accentFrom,
        String accentTo,
        int sortOrder
    ) {
        QueueDefinition queueDefinition = new QueueDefinition();
        queueDefinition.setQueueId(queueId);
        queueDefinition.setDisplayName(displayName);
        queueDefinition.setAdminSubtitle(adminSubtitle);
        queueDefinition.setClientDescription(clientDescription);
        queueDefinition.setCounterLabel(counterLabel);
        queueDefinition.setAccentFrom(accentFrom);
        queueDefinition.setAccentTo(accentTo);
        queueDefinition.setSortOrder(sortOrder);
        queueDefinition.setActive(true);
        return queueDefinition;
    }
}
