package app;

import app.config.AppProperties;
import app.auth.AdminUser;
import app.queue.QueueDefinition;
import app.auth.AdminUserRepository;
import app.queue.QueueDefinitionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties(AppProperties.class)
@OpenAPIDefinition(info = @Info(title = "QuickQ API", version = "1.0", description = "Real-time queue management REST API"))
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
            // Bootstrap admin from AppProperties (driven by .env / environment variables)
            if (appProperties.getBootstrapAdmin().isEnabled()) {
                String username = appProperties.getBootstrapAdmin().getUsername();
                String password = appProperties.getBootstrapAdmin().getPassword();
                adminUserRepository.findByUsername(username).orElseGet(() -> {
                    AdminUser admin = new AdminUser();
                    admin.setUsername(username);
                    admin.setPasswordHash(passwordEncoder.encode(password));
                    admin.setRole("ROLE_ADMIN");
                    return adminUserRepository.save(admin);
                });
            }
            // Bootstrap guest account for view-only access
            adminUserRepository.findByUsername("guest").orElseGet(() -> {
                AdminUser guest = new AdminUser();
                guest.setUsername("guest");
                guest.setPasswordHash(passwordEncoder.encode("guest123"));
                guest.setRole("ROLE_GUEST");
                return adminUserRepository.save(guest);
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
