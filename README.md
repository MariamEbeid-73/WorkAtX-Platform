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

The deployment script fetches the selected GitHub branch, exports only tracked
files from that exact commit, and submits them to Cloud Build. Cloud Build
builds the backend, frontend, and worker images for `linux/amd64`, pushes them
to Artifact Registry, and asks the VM to pull the exact commit images. The VM
does not clone this repository and does not build images.

```bash
export WORKX_GCP_CREDENTIALS=/secure/path/gcp-deployer.json
make deploy BRANCH=last-touch
```

The ignored default credential path is `secrets/gcp-deployer.json`.

```bash
make build BRANCH=last-touch
make deploy-status
make rollback SHA=<full-40-char-sha>
make logs                          # all Docker-retained platform logs
make logs SERVICE=worker TAIL=200  # intentionally request a short tail
make logs-follow SERVICE=worker    # retained logs, then live output
make logs-services                 # discover all valid services
make logs-failures                 # saved failed-deployment build IDs
make logs-failure BUILD_ID=<id>    # diagnostics captured before rollback
make logs-bundle                   # bounded incident export
make vm-ssh
make down
```

`make logs` now displays the deployed runtime instead of creating an export
file. The previous export behavior is `make logs-bundle`. Without `TAIL`, the
helper shows every line Docker currently retains. Docker still protects the VM
disk by rotating each service at 50 MB across 3 files. `TAIL=0` with
`make logs-follow` streams only new lines. The valid services are read from the
deployed Compose file, including the one-shot `minio-init` service.

These commands use the isolated team deployment identity. They do not require
personal project access or change the developer's normal gcloud account.
Runtime and failure logs may contain private operational data and should remain
inside the engineering team.

The deployment scripts derive paths from this repository and use a temporary
gcloud configuration. They do not depend on a personal username, clone path,
personal GCP account, or the AI repository being next to this one.
