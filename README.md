# WorkX application

WorkX contains the ASP.NET Core backend, React frontend, Celery worker,
PostgreSQL, Redis, and MinIO services.

## Local development

Supported environments are macOS, Linux, and Windows through WSL2. Docker and
Docker Compose are the only host runtime requirements for the supported full
stack workflow.

```bash
make setup       # validates Docker and creates .env only when missing
# review .env
make run         # builds and starts the complete local stack
```

Local URLs:

```text
Frontend:      http://localhost:4200
Backend:       http://localhost:5000
Swagger:       http://localhost:5000/swagger
MinIO API:     http://localhost:9000
MinIO console: http://localhost:9001
```

`.env.development` is retained as existing development reference data, but
Docker Compose automatically reads the ignored root `.env`. `make setup`
creates it from `.env.example` without overwriting an existing file.

## Staging deployment

Cloud Build checks out the selected private GitHub branch, builds the backend,
frontend, and worker images for `linux/amd64`, pushes them to Artifact
Registry, and asks the VM to pull the exact commit images. The VM does not
clone this repository and does not build images.

```bash
export WORKX_GCP_CREDENTIALS=/secure/path/gcp-deployer.json
make deploy BRANCH=last-touch
```

The ignored default credential path is `secrets/gcp-deployer.json`.

```bash
make build BRANCH=last-touch
make deploy-status
make rollback SHA=<full-40-char-sha>
make logs
make vm-ssh
make down
```

The deployment scripts derive paths from this repository and use a temporary
gcloud configuration. They do not depend on a personal username, clone path,
personal GCP account, or the AI repository being next to this one.
