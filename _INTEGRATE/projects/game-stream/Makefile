OS := $(shell uname -s)
LIMA_PROFILE ?= emulocity
UBUNTU_CODENAME ?= noble
UBUNTU_VERSION ?= 24.04

envfile := $(shell yq eval '. as $$item ireduce (""; . + "\n" + ($$item | to_entries[] | "\(.key)=\(.value|tostring)"))' ./.env.yaml)

# TODO: validate yaml env schema, makefile commands (rest are private): up, down, restart

.PHONY: docker-up docker-up-linux docker-up-lima docker-up-windows \
        setup-lima run-lima install-lima check-lima-profile

check-deps:
	@echo "🔍 Checking required tools..."
	@BASE_DEPS="docker envsubst grep uname yq"; \
	MAC_DEPS="nerdctl"; \
	for dep in $$BASE_DEPS; do \
		if ! command -v $$dep >/dev/null 2>&1; then \
			echo "❌ Missing dependency: $$dep"; \
			MISSING=true; \
		else \
			echo "✅ Found: $$dep"; \
		fi; \
	done; \
	if [ "$(OS)" = "Darwin" ]; then \
		for dep in $$MAC_DEPS; do \
			if ! command -v $$dep >/dev/null 2>&1; then \
				echo "❌ Missing dependency (macOS only): $$dep"; \
				MISSING=true; \
			else \
				echo "✅ Found: $$dep"; \
			fi; \
		done; \
	fi; \
	if [ "$$MISSING" = "true" ]; then \
		echo "💡 Please install the missing tools before continuing."; \
		exit 1; \
	fi

## === Main entrypoint (detects OS and dispatches) ===
docker-up: check-deps
	@if grep -qi microsoft /proc/version 2>/dev/null; then \
		$(MAKE) docker-up-windows; \
	elif [ "$(OS)" = "Linux" ]; then \
		$(MAKE) docker-up-linux; \
	elif [ "$(OS)" = "Darwin" ]; then \
		$(MAKE) docker-up-lima; \
	else \
		echo "❌ Unsupported OS: $(OS)"; exit 1; \
	fi

## === Linux-native Docker with /dev/uinput passthrough ===
docker-up-linux: check-deps
	@echo "🐧 Starting Docker Compose (Linux)..."
	$(envfile) docker compose $(foreach file,$(wildcard services/docker-compose.*.yml),-f $(file)) up --profile linux

## === macOS via Lima VM with GPU + /dev/uinput ===
docker-up-lima: check-deps check-lima-profile
	@echo "🍎 Starting Docker Compose inside Lima VM..."
	$(envfile) lima nerdctl compose $(foreach file,$(wildcard services/docker-compose.*.yml),-f $(file)) up

## === Windows (WSL2) Docker (assumes Docker Desktop is installed) ===
docker-up-windows: check-deps
	@echo "🪟 Starting Docker Compose (Windows WSL2)..."
	$(envfile) docker compose $(foreach file,$(wildcard services/docker-compose.*.yml),-f $(file)) up

## === Install Lima on macOS (if missing) ===
install-lima: check-deps
	@if ! command -v brew >/dev/null 2>&1; then \
		echo "❌ Homebrew is required on macOS. Install it from https://brew.sh/"; \
		exit 1; \
	fi
	@if ! command -v lima >/dev/null; then \
		echo "🔧 Installing Lima..."; \
		brew install lima; \
	else \
		echo "✅ Lima is already installed."; \
	fi

## === Setup Lima profile with GPU + /dev/uinput ===
setup-lima: install-lima
	@echo "⚙️  Provisioning Lima profile '$(LIMA_PROFILE)'..."
	@mkdir -p ~/.lima/$(LIMA_PROFILE)

	@ARCH_RAW="$$(uname -m)"; \
	if [ "$(OS)" = "Darwin" ]; then \
		if sysctl -n hw.optional.arm64 2>/dev/null | grep -q 1; then \
			ARCH_RAW="arm64"; \
		fi; \
	fi; \
	case $$ARCH_RAW in \
		arm64|aarch64) ARCH="aarch64"; IMG_ARCH="arm64" ;; \
		x86_64|amd64) ARCH="x86_64"; IMG_ARCH="amd64" ;; \
		*) echo "❌ Unsupported architecture: $$ARCH_RAW"; exit 1 ;; \
	esac; \
	LIMA_PROFILE="$(LIMA_PROFILE)" ARCH="$$ARCH" IMG_ARCH="$$IMG_ARCH" \
	UBUNTU_CODENAME="$(UBUNTU_CODENAME)" UBUNTU_VERSION="$(UBUNTU_VERSION)" \
	envsubst < lima.yaml.template > ~/.lima/$(LIMA_PROFILE)/lima.yaml

	@lima start $(LIMA_PROFILE)

## === Ensure Lima profile exists before using it
check-lima-profile:
	@if ! lima list | grep -q $(LIMA_PROFILE); then \
		echo "❌ Lima profile '$(LIMA_PROFILE)' not found. Run: make setup-lima"; \
		exit 1; \
	fi

## === Start Lima VM manually
run-lima: check-deps
	@echo "▶️  Starting Lima VM..."
	lima start $(LIMA_PROFILE)
