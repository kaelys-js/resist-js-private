#!/usr/bin/env bash
#
# resist.js Secret Management Bootstrap
#
# One-command setup for developers. Installs dependencies,
# authenticates with Infisical, and initializes project config.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/resist-js/resist/main/shared/infisical/scripts/bootstrap.sh | bash
#   # or
#   pnpm secrets:bootstrap
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Header
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}     🔐 resist.js Secret Management Setup              ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

OS=$(detect_os)
log_info "Detected OS: $OS"

# Check for required tools
check_requirements() {
    local missing=()

    if ! command -v curl &> /dev/null; then
        missing+=("curl")
    fi

    if ! command -v git &> /dev/null; then
        missing+=("git")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        exit 1
    fi
}

# Install Infisical CLI
install_infisical() {
    if command -v infisical &> /dev/null; then
        local version
        version=$(infisical --version 2>/dev/null || echo "unknown")
        log_success "Infisical CLI already installed ($version)"
        return 0
    fi

    log_info "Installing Infisical CLI..."

    case "$OS" in
        macos)
            if command -v brew &> /dev/null; then
                brew install infisical/get-cli/infisical
            else
                log_warning "Homebrew not found. Installing via npm..."
                npm install -g @infisical/cli
            fi
            ;;
        linux)
            # Try apt first (Debian/Ubuntu)
            if command -v apt-get &> /dev/null; then
                curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
                sudo apt-get update && sudo apt-get install -y infisical
            # Try yum (RHEL/CentOS/Fedora)
            elif command -v yum &> /dev/null; then
                curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.rpm.sh' | sudo -E bash
                sudo yum install -y infisical
            # Fallback to npm
            else
                log_warning "No supported package manager found. Installing via npm..."
                npm install -g @infisical/cli
            fi
            ;;
        windows)
            if command -v scoop &> /dev/null; then
                scoop install infisical
            elif command -v winget &> /dev/null; then
                winget install infisical
            else
                npm install -g @infisical/cli
            fi
            ;;
        *)
            log_warning "Unknown OS. Installing via npm..."
            npm install -g @infisical/cli
            ;;
    esac

    if command -v infisical &> /dev/null; then
        log_success "Infisical CLI installed successfully"
    else
        log_error "Failed to install Infisical CLI"
        echo ""
        echo "Please install manually:"
        echo "  macOS:   brew install infisical/get-cli/infisical"
        echo "  Linux:   See https://infisical.com/docs/cli/overview"
        echo "  npm:     npm install -g @infisical/cli"
        exit 1
    fi
}

# Authenticate with Infisical
authenticate() {
    if infisical user &> /dev/null; then
        log_success "Already authenticated with Infisical"
        return 0
    fi

    log_info "Authenticating with Infisical..."
    echo ""
    echo "A browser window will open for authentication."
    echo "Please log in with your Infisical account."
    echo ""

    if ! infisical login; then
        log_error "Authentication failed"
        exit 1
    fi

    log_success "Authentication successful"
}

# Initialize project configuration
initialize_project() {
    local config_file=".infisical.json"

    if [ -f "$config_file" ]; then
        log_success "Project configuration already exists"
        return 0
    fi

    log_info "Initializing project configuration..."

    # Check for INFISICAL_PROJECT_ID environment variable
    if [ -n "${INFISICAL_PROJECT_ID:-}" ]; then
        log_info "Using project ID from environment: $INFISICAL_PROJECT_ID"
        PROJECT_ID="$INFISICAL_PROJECT_ID"
    else
        echo ""
        echo "Enter your Infisical Project ID."
        echo "You can find this in the Infisical dashboard under Project Settings."
        echo ""
        read -rp "Project ID: " PROJECT_ID

        if [ -z "$PROJECT_ID" ]; then
            log_error "Project ID is required"
            exit 1
        fi
    fi

    # Create config file
    cat > "$config_file" << EOF
{
	"workspaceId": "$PROJECT_ID",
	"defaultEnvironment": "local",
	"gitBranchToEnvironmentMapping": {
		"main": "prod",
		"master": "prod",
		"staging": "staging",
		"develop": "staging",
		"release/*": "staging",
		"feature/*": "feature",
		"fix/*": "feature",
		"chore/*": "feature",
		"*": "local"
	}
}
EOF

    log_success "Created $config_file"
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."

    # Try to fetch secrets
    if infisical secrets --env=local &> /dev/null; then
        log_success "Successfully connected to Infisical"
    else
        log_warning "Could not fetch secrets (project may be empty or require different permissions)"
    fi
}

# Main execution
main() {
    check_requirements
    echo ""
    install_infisical
    echo ""
    authenticate
    echo ""
    initialize_project
    echo ""
    verify_setup

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}     ✨ Setup Complete!                                ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Verify your setup:"
    echo "     pnpm secrets:doctor"
    echo ""
    echo "  2. Start development (secrets auto-injected):"
    echo "     pnpm dev"
    echo ""
    echo "  3. Manage secrets in browser:"
    echo "     pnpm secrets:edit"
    echo ""
    echo "  4. Migrate existing .env files (if any):"
    echo "     pnpm secrets:migrate"
    echo ""
}

main "$@"
