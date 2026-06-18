FROM maven:3.9.6-eclipse-temurin-21-jammy AS builder
WORKDIR /build

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build the application
COPY src ./src
COPY resources ./resources
RUN mvn package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Create a non-root user
RUN groupadd -r quickq && useradd -r -g quickq quickq
USER quickq

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8000
ENTRYPOINT ["java", "-jar", "app.jar"]
