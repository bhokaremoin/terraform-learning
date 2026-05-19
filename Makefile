# terraform-learning — top-level Makefile
#
# Primary entry point: `make up`. First run installs npm deps and starts the
# Vite dev server. Subsequent runs reuse the install cache and start fast.
#
# Prerequisite: Node.js 20+ (https://nodejs.org or via your package manager).
# Check with: `node -v` (must be >= 20).

URL ?= http://localhost:5173

.DEFAULT_GOAL := help

## help: show available targets
.PHONY: help
help:
	@printf "\nterraform-learning — make targets\n\n"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /' | column -t -s ':'
	@printf "\nQuickstart: make up\n"
	@printf "Requires: Node.js 20+ on PATH\n\n"

## up: install deps if needed, then start the Vite dev server (opens browser)
.PHONY: up
up: install
	@command -v open >/dev/null 2>&1 && (sleep 2 && open $(URL)) & \
	 command -v xdg-open >/dev/null 2>&1 && (sleep 2 && xdg-open $(URL)) &
	cd app && npm run dev

## install: install npm dependencies (idempotent; skipped if up to date)
.PHONY: install
install:
	@cd app && [ -d node_modules ] || npm install

## build: produce a production build at app/dist/
.PHONY: build
build: install
	cd app && npm run build

## preview: serve the production build at $(URL) for a smoke check
.PHONY: preview
preview: build
	cd app && npm run preview

## test: run the SPA unit tests
.PHONY: test
test: install
	cd app && npm test

## lint: run the TypeScript compiler in --noEmit mode
.PHONY: lint
lint: install
	cd app && npm run lint

## clean: remove install + build artifacts
.PHONY: clean
clean:
	rm -rf app/node_modules app/dist app/.vite app/coverage
