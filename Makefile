# Convenience wrappers. `make help` lists everything.
COMPOSE_DEV  := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
PROD_PROFILE := --profile standalone

.DEFAULT_GOAL := help
.PHONY: help setup up down restart logs ps shell dbshell migrate makemigrations \
        superuser seed collectstatic test build prod-up prod-down prod-logs \
        deploy backup restore frontend-install frontend-dev frontend-build clean

help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## copy .env.example -> .env (first run)
	@test -f .env || cp .env.example .env
	@echo "✓ .env ready — edit the secrets before starting"

up: ## start the development stack
	$(COMPOSE_DEV) up -d --build

down: ## stop the development stack (data volumes are kept)
	$(COMPOSE_DEV) down

restart: ## restart the development stack
	$(COMPOSE_DEV) restart

logs: ## follow all logs
	$(COMPOSE_DEV) logs -f --tail=100

ps: ## container status
	$(COMPOSE_DEV) ps

shell: ## bash inside the backend container
	$(COMPOSE_DEV) exec backend bash

dbshell: ## psql inside the postgres container
	$(COMPOSE_DEV) exec postgres psql -U $${POSTGRES_USER:-artist} -d $${POSTGRES_DB:-artistportfolio}

migrate: ## apply migrations
	$(COMPOSE_DEV) exec backend python manage.py migrate

makemigrations: ## create migrations
	$(COMPOSE_DEV) exec backend python manage.py makemigrations

superuser: ## create an admin user interactively
	$(COMPOSE_DEV) exec backend python manage.py createsuperuser

seed: ## import the legacy content (idempotent)
	$(COMPOSE_DEV) exec backend python manage.py seed_legacy

collectstatic: ## collect Django static files
	$(COMPOSE_DEV) exec backend python manage.py collectstatic --noinput

test: ## run the Django test suite
	$(COMPOSE_DEV) exec backend python manage.py test

build: ## rebuild all images
	$(COMPOSE_DEV) build --no-cache

frontend-install: ## install frontend dependencies
	cd frontend && npm install

frontend-dev: ## run Vite locally (outside Docker)
	cd frontend && npm run dev

frontend-build: ## production frontend build
	cd frontend && npm run build

prod-up: ## start the production stack
	$(COMPOSE_PROD) $(PROD_PROFILE) up -d --build

prod-down: ## stop the production stack
	$(COMPOSE_PROD) $(PROD_PROFILE) down

prod-logs: ## follow production logs
	$(COMPOSE_PROD) logs -f --tail=100

deploy: ## backup + pull + build + migrate + swap
	./ops/deploy.sh

backup: ## database + media backup
	./ops/backup.sh

restore: ## restore (DUMP=backups/db-....dump)
	./ops/restore.sh $(DUMP) $(MEDIA)

clean: ## remove build artifacts and caches (never touches volumes)
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf frontend/dist frontend/.vite
