.PHONY: setup run down build deploy rollback logs deploy-status vm-ssh

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

logs:
	@./scripts/collect_logs.sh

deploy-status:
	@./scripts/deploy_status.sh

vm-ssh:
	@./scripts/vm_ssh.sh

