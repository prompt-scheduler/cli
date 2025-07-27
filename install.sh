#!/bin/bash

# Prompt Scheduler - One-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/prompt-scheduler/cli/main/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji support
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$TERM" == *"256color"* ]]; then
    CHECKMARK="✅"
    CROSSMARK="❌"
    ROCKET="🚀"
    GEAR="⚙️"
    PACKAGE="📦"
else
    CHECKMARK="[OK]"
    CROSSMARK="[ERROR]"
    ROCKET=">>>"
    GEAR="***"
    PACKAGE="***"
fi

print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════╗"
    echo "║         Prompt Scheduler CLI           ║"
    echo "║     Modern AI Agent Automation Tool    ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}${GEAR} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECKMARK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSSMARK} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    print_step "Checking system requirements..."
    
    local missing_deps=()
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        if [ "$major_version" -ge 16 ]; then
            print_success "Node.js $node_version found"
        else
            print_error "Node.js version 16+ required (found: $node_version)"
            missing_deps+=("nodejs")
        fi
    else
        print_error "Node.js not found"
        missing_deps+=("nodejs")
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_success "npm $npm_version found"
    else
        print_error "npm not found"
        missing_deps+=("npm")
    fi
    
    # Check tmux
    if command_exists tmux; then
        local tmux_version=$(tmux -V | cut -d' ' -f2)
        print_success "tmux $tmux_version found"
    else
        print_error "tmux not found"
        missing_deps+=("tmux")
    fi
    
    # Check git
    if command_exists git; then
        local git_version=$(git --version | cut -d' ' -f3)
        print_success "git $git_version found"
    else
        print_error "git not found"
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        print_info "Please install missing dependencies:"
        
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "  # Ubuntu/Debian:"
            echo "  sudo apt update && sudo apt install -y nodejs npm tmux git"
            echo ""
            echo "  # RHEL/CentOS/Fedora:"
            echo "  sudo yum install -y nodejs npm tmux git"
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            echo "  # macOS (with Homebrew):"
            echo "  brew install node tmux git"
        fi
        
        exit 1
    fi
    
    print_success "All requirements satisfied"
}

# Detect installation directory
get_install_dir() {
    if [ -w "/usr/local/bin" ]; then
        echo "/usr/local"
    elif [ -w "$HOME/.local" ]; then
        echo "$HOME/.local"
    else
        echo "$HOME"
    fi
}

# Install Prompt Scheduler
install_prompt_scheduler() {
    print_step "Installing Prompt Scheduler..."
    
    local install_dir=$(get_install_dir)
    local app_dir="$install_dir/lib/prompt-scheduler"
    local bin_dir="$install_dir/bin"
    
    print_info "Installation directory: $install_dir"
    
    # Create directories
    mkdir -p "$app_dir" "$bin_dir"
    
    # Clone repository
    print_step "Downloading source code..."
    if [ -d "$app_dir/.git" ]; then
        cd "$app_dir"
        git pull origin main >/dev/null 2>&1
    else
        git clone https://github.com/prompt-scheduler/cli.git "$app_dir" >/dev/null 2>&1
    fi
    
    cd "$app_dir"
    
    # Install dependencies
    print_step "Installing dependencies..."
    npm install --production >/dev/null 2>&1
    
    # Create executable wrapper
    print_step "Creating command wrapper..."
    cat > "$bin_dir/prompt-scheduler" << EOF
#!/bin/bash
exec node "$app_dir/src/claude-schedule.ts" "\$@"
EOF
    
    chmod +x "$bin_dir/prompt-scheduler"
    
    # Setup configuration
    print_step "Setting up configuration..."
    if [ ! -f "$app_dir/prompts/prompts.jsonl" ]; then
        cp "$app_dir/prompts/prompts.jsonl.sample" "$app_dir/prompts/prompts.jsonl"
        print_info "Created default configuration at $app_dir/prompts/prompts.jsonl"
    fi
    
    print_success "Installation completed!"
}

# Add to PATH if needed
setup_path() {
    local bin_dir=$(get_install_dir)/bin
    
    if [[ ":$PATH:" != *":$bin_dir:"* ]]; then
        print_step "Adding to PATH..."
        
        local shell_rc=""
        if [ -n "$ZSH_VERSION" ]; then
            shell_rc="$HOME/.zshrc"
        elif [ -n "$BASH_VERSION" ]; then
            shell_rc="$HOME/.bashrc"
        else
            shell_rc="$HOME/.profile"
        fi
        
        echo "" >> "$shell_rc"
        echo "# Added by Prompt Scheduler installer" >> "$shell_rc"
        echo "export PATH=\"$bin_dir:\$PATH\"" >> "$shell_rc"
        
        print_success "Added $bin_dir to PATH in $shell_rc"
        print_warning "Please run: source $shell_rc"
        print_warning "Or restart your terminal to use 'prompt-scheduler' command"
    else
        print_success "PATH is already configured"
    fi
}

# Post-installation instructions
show_usage() {
    echo ""
    print_success "🎉 Prompt Scheduler installed successfully!"
    echo ""
    print_info "Quick start:"
    echo "  1. Edit configuration: $(get_install_dir)/lib/prompt-scheduler/prompts/prompts.jsonl"
    echo "  2. Run: prompt-scheduler help"
    echo "  3. Start automation: prompt-scheduler run"
    echo ""
    print_info "Common commands:"
    echo "  prompt-scheduler status    # Show prompt status"
    echo "  prompt-scheduler next      # Execute next prompt"
    echo "  prompt-scheduler help      # Show all commands"
    echo ""
    print_info "Documentation: https://github.com/prompt-scheduler/cli#readme"
}

# Check if running with sudo (not recommended)
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root/sudo is not recommended"
        print_warning "Consider installing to user directory instead"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Installation cancelled"
            exit 1
        fi
    fi
}

# Main installation flow
main() {
    print_header
    
    check_sudo
    check_requirements
    install_prompt_scheduler
    setup_path
    show_usage
    
    echo ""
    print_success "${ROCKET} Ready to automate your AI workflows!"
}

# Handle Ctrl+C
trap 'echo -e "\n${RED}Installation cancelled by user${NC}"; exit 1' INT

# Run main function
main "$@"