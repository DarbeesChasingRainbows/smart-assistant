# Podman Secrets Management Setup

This guide explains how to set up secure secrets management for the AnkiQuiz containerized stack using Podman secrets instead of environment variables.

## Why Use Secrets?

- **Security**: Secrets are not stored in environment variables or container images
- **Isolation**: Secrets are only accessible to containers that explicitly need them
- **Auditability**: Better tracking of sensitive data access
- **Compliance**: Meets security requirements for production deployments

## Quick Setup

### 1. Create Secrets

```bash
# Create PostgreSQL password secret
echo "*Tx325z59aq" | podman secret create postgres_password -

# Create database connection string secret
echo "Host=postgres;Port=5432;Database=ankiquizdb;Username=postgres;Password=*Tx325z59aq" | podman secret create postgres_connection_string -

# List existing secrets
podman secret ls
```

### 2. Update podman-compose.yml

Replace environment variables with secrets:

```yaml
services:
  postgres:
    environment:
      POSTGRES_DB: ankiquizdb
      POSTGRES_USER: postgres
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

  backend:
    secrets:
      - postgres_connection_string
    environment:
      POSTGRES_CONNECTION_STRING_FILE: /run/secrets/postgres_connection_string
```

### 3. Production Secrets Script

Create `scripts/setup-secrets.sh`:

```bash
#!/bin/bash

# Generate secure password
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create secrets
echo "$POSTGRES_PASSWORD" | podman secret create postgres_password -
echo "Host=postgres;Port=5432;Database=ankiquizdb;Username=postgres;Password=$POSTGRES_PASSWORD" | podman secret create postgres_connection_string -

# Save password to secure location
echo "Generated PostgreSQL password: $POSTGRES_PASSWORD"
echo "Save this password securely in your password manager."

# Create .env.production with non-secret values
cat > .env.production << EOF
# Non-secret configuration
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=ankiquizdb
POSTGRES_USER=postgres
DENO_ENV=production
VITE_API_URL=http://localhost:8080
VITE_UPLOADS_URL=http://localhost:8080
EOF

echo "Created .env.production with non-secret configuration"
```

## Advanced Configuration

### Environment-Specific Secrets

```bash
# Development secrets
echo "dev_password" | podman secret create postgres_password_dev -

# Staging secrets  
echo "staging_password" | podman secret create postgres_password_staging -

# Production secrets
echo "prod_secure_password" | podman secret create postgres_password_prod -
```

### Using with Different Compose Files

```bash
# Development
podman-compose -f podman-compose.yml -f podman-compose.dev.yml up

# Production  
podman-compose -f podman-compose.yml -f podman-compose.prod.yml up
```

### External Secret Management

For enterprise environments, consider:

1. **HashiCorp Vault Integration**
2. **AWS Secrets Manager**
3. **Azure Key Vault**
4. **Kubernetes Secrets** (if running on K8s)

## Secret Management Best Practices

### 1. Rotation

```bash
# Rotate PostgreSQL password
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "$NEW_PASSWORD" | podman secret create postgres_password_new -
podman secret rm postgres_password
podman secret rename postgres_password_new postgres_password
```

### 2. Backup and Recovery

```bash
# Export secrets (encrypted)
podman secret export postgres_password | gpg --symmetric --cipher-algo AES256 -o postgres_password.secret.gpg

# Import secrets
gpg --decrypt postgres_password.secret.gpg | podman secret create postgres_password -
```

### 3. Access Control

```bash
# Set secret permissions
podman secret inspect postgres_password

# Remove unused secrets
podman secret prune
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Setup Podman Secrets
  run: |
    echo "${{ secrets.POSTGRES_PASSWORD }}" | podman secret create postgres_password -
    echo "${{ secrets.CONNECTION_STRING }}" | podman secret create postgres_connection_string -
    
- name: Deploy with Podman Compose
  run: |
    podman-compose -f podman-compose.yml -f podman-compose.prod.yml up -d
```

### GitLab CI Example

```yaml
setup_secrets:
  stage: deploy
  script:
    - echo "$POSTGRES_PASSWORD" | podman secret create postgres_password -
    - podman-compose up -d
  only:
    - production
```

## Monitoring and Auditing

### Secret Usage Monitoring

```bash
# Check which containers are using secrets
podman inspect $(podman ps -q) --format '{{.Name}}: {{.Config.Secrets}}'

# Audit secret access
podman logs ankiquiz-backend | grep -i secret
```

### Compliance Checklist

- [ ] No passwords in environment variables
- [ ] All secrets encrypted at rest
- [ ] Secret access logged and monitored
- [ ] Regular secret rotation schedule
- [ ] Backup and recovery procedures documented
- [ ] Access control policies implemented

## Troubleshooting

### Common Issues

1. **Secret not found**
   ```bash
   # Check if secret exists
   podman secret ls | grep postgres_password
   
   # Recreate if missing
   echo "password" | podman secret create postgres_password -
   ```

2. **Permission denied**
   ```bash
   # Check secret permissions
   podman secret inspect postgres_password
   
   # Ensure container user has read access
   podman exec ankiquiz-backend ls -la /run/secrets/
   ```

3. **Secret not updating**
   ```bash
   # Remove and recreate secret
   podman secret rm postgres_password
   echo "new_password" | podman secret create postgres_password -
   
   # Restart containers
   podman-compose down && podman-compose up -d
   ```

### Debug Commands

```bash
# Inspect secret in container
podman exec ankiquiz-backend cat /run/secrets/postgres_password

# Check container environment
podman exec ankiquiz-backend env | grep -i secret

# Verify secret mounting
podman inspect ankiquiz-backend | jq '.[0].Mounts[] | select(.Type=="secret")'
```

## Migration from Environment Variables

### Step-by-Step Migration

1. **Identify secrets in current setup**
   ```bash
   grep -r "PASSWORD\|SECRET\|KEY" .env* podman-compose.yml
   ```

2. **Create secrets for each sensitive value**
   ```bash
   # For each secret found
   echo "secret_value" | podman secret create secret_name -
   ```

3. **Update compose file**
   ```yaml
   # Replace: POSTGRES_PASSWORD=secret_value
   # With:
   secrets:
     - postgres_password
   environment:
     POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
   ```

4. **Update application code** (if needed)
   ```csharp
   // Read from file instead of environment
   var passwordFile = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD_FILE");
   var password = await File.ReadAllTextAsync(passwordFile);
   ```

5. **Test and validate**
   ```bash
   podman-compose down
   podman-compose up -d
   podman-compose logs backend | grep -i connection
   ```

## Production Deployment Checklist

- [ ] All secrets created and tested
- [ ] Environment variables cleaned of sensitive data
- [ ] Compose files updated to use secrets
- [ ] Backup procedures documented
- [ ] Rotation schedule established
- [ ] Monitoring and alerting configured
- [ ] Access control policies implemented
- [ ] Compliance requirements verified

## Support

For issues with Podman secrets:
- [Podman Secrets Documentation](https://docs.podman.io/en/latest/markdown/podman-secret.1.html)
- Check container logs for secret-related errors
- Verify secret existence and permissions
- Test with simple secrets first before complex configurations
