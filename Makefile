.PHONY: setup run down build deploy rollback logs logs-follow logs-services logs-failures logs-failure logs-bundle jobs-status deploy-status vm-ssh

setup:
	command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
	docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required." >&2; exit 1; }
	test -f .env || cp .env.example .env

run:
	./startup.sh

down:
	docker compose down

build:
	@BRANCH='$(BRANCH)' ./scripts/deploy.sh --build-only

deploy:
	@BRANCH='$(BRANCH)' ./scripts/deploy.sh

rollback:
	@SHA='$(SHA)' ./scripts/rollback.sh

logs logs-follow: export WORKX_LOG_SERVICE = $(SERVICE)
logs logs-follow: export WORKX_LOG_TAIL = $(TAIL)
logs-failure: export WORKX_LOG_BUILD_ID = $(BUILD_ID)

logs:
	@./scripts/logs.sh

logs-follow:
	@WORKX_LOG_FOLLOW=1 ./scripts/logs.sh

logs-services:
	@./scripts/logs.sh --list-services

logs-failures:
	@./scripts/logs.sh --list-failures

logs-failure:
	@./scripts/logs.sh --failure "$$WORKX_LOG_BUILD_ID"

logs-bundle:
	@./scripts/collect_logs.sh

jobs-status:
	@./scripts/jobs_status.sh

deploy-status:
	@./scripts/deploy_status.sh

vm-ssh:
	@./scripts/vm_ssh.sh
