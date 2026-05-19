# terraform-learning — top-level Makefile
#
# The primary entry point is `make up`. It builds the Docker image (first run
# only — subsequent runs reuse layers) and starts the container, then prints
# the URL.
#
# Contributors who want to iterate on the SPA without rebuilding the Docker
# image each time can use `make dev` instead (requires Node 20+ on the host).

URL ?= http://localhost:8080

.DEFAULT_GOAL := help

## help: show available targets
.PHONY: help
help:
	@printf "\nterraform-learning — make targets\n\n"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /' | column -t -s ':'
	@printf "\nQuickstart: make up\n\n"

## up: build (if needed) and start the web app; open it in the browser
.PHONY: up
up:
	docker compose up -d --build
	@echo ""
	@echo "Web tutorial running at $(URL)"
	@command -v open >/dev/null 2>&1 && open $(URL) || \
	 command -v xdg-open >/dev/null 2>&1 && xdg-open $(URL) || \
	 echo "(open $(URL) manually)"

## down: stop the web app container
.PHONY: down
down:
	docker compose down

## build: build the Docker image without starting it
.PHONY: build
build:
	docker compose build

## logs: tail container logs
.PHONY: logs
logs:
	docker compose logs -f web

## dev: run the Vite dev server on the host (requires Node 20+)
.PHONY: dev
dev:
	cd app && npm install && npm run dev

## test: run the SPA unit tests on the host (requires Node 20+)
.PHONY: test
test:
	cd app && npm install && npm test

## clean: stop and remove containers, images, and local build artifacts
.PHONY: clean
clean:
	-docker compose down -v --rmi local --remove-orphans
	rm -rf app/dist app/node_modules
