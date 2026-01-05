#!/bin/bash

# AnkiQuiz Application Launcher
# This script will start all services using Podman Compose

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if Podman is installed
check_podman() {
    if ! command -v podman &> /dev/null; then
        print_error "Podman is not installed or not in PATH"
        print_error "Please install Podman first: https://podman.io/getting-started/"
        exit 1
    fi
    
    if ! command -v podman-compose &> /dev/null; then
        print_error "Podman Compose is not installed or not in PATH"
        print_error "Please install Podman Compose: pip install podman-compose"
        exit 1
    fi
}

# Check for .env file
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating with default values..."
        cat > .env << EOF
# AnkiQuiz Environment Variables
POSTGRES_PASSWORD=ankiquiz123
EOF
        print_status "Created .env file with default password"
    fi
}

# Stop existing services
stop_services() {
    print_status "Stopping existing services..."
    podman-compose -f podman-compose.yml down 2>/dev/null || true
    podman-compose -f podman-compose.yml -f podman-compose.prod.yml down 2>/dev/null || true
}

# Clean up old containers and images
cleanup() {
    print_status "Cleaning up old containers and images..."
    podman system prune -f 2>/dev/null || true
}

# Build and start services
start_services() {
    print_status "Building and starting all services..."
    
    # Check if production secrets exist
    if podman secret inspect postgres_password &>/dev/null; then
        print_status "Using production configuration with secrets..."
        podman-compose -f podman-compose.yml -f podman-compose.prod.yml up --build -d
    else
        print_warning "Production secrets not found, using development configuration..."
        print_warning "To use production secrets, create them with:"
        echo "  echo 'your_secure_password' | podman secret create postgres_password -"
        echo "  echo 'Host=postgres;Port=5432;Database=ankiquizdb;Username=postgres;Password=your_secure_password' | podman secret create postgres_connection_string -"
        podman-compose -f podman-compose.yml up --build -d
    fi
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    print_status "Waiting for PostgreSQL..."
    for i in {1..30}; do
        if podman exec ankiquiz-postgres pg_isready -U postgres &>/dev/null; then
            print_status "PostgreSQL is ready!"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Wait for Backend
    print_status "Waiting for Backend API..."
    for i in {1..60}; do
        if curl -f http://localhost:8080/health &>/dev/null; then
            print_status "Backend API is ready!"
            break
        fi
        echo -n "."
        sleep 1
    done
    
    # Wait for Frontend
    print_status "Waiting for Frontend..."
    for i in {1..60}; do
        if curl -f http://localhost:8000 &>/dev/null; then
            print_status "Frontend is ready!"
            break
        fi
        echo -n "."
        sleep 1
    done
}

# Show service status
show_status() {
    print_header "Service Status"
    podman-compose -f podman-compose.yml ps
    
    print_header "Access URLs"
    echo -e "${GREEN}Frontend:${NC}     http://localhost:8000"
    echo -e "${GREEN}Backend API:${NC}  http://localhost:8080"
    echo -e "${GREEN}Health Check:${NC} http://localhost:8080/health"
    echo ""
    echo -e "${BLUE}Database:${NC}      PostgreSQL on port 5432 (internal only)"
    echo ""
    echo -e "${YELLOW}To view logs:${NC} podman-compose -f podman-compose.yml logs -f [service-name]"
    echo -e "${YELLOW}To stop:${NC}     podman-compose -f podman-compose.yml down"
}

# Main execution
main() {
    print_header "AnkiQuiz Application Launcher"
    
    check_podman
    check_env_file
    
    # Parse command line arguments
    case "${1:-}" in
        "stop")
            stop_services
            exit 0
            ;;
        "restart")
            stop_services
            sleep 2
            start_services
            wait_for_services
            show_status
            exit 0
            ;;
        "clean")
            stop_services
            cleanup
            exit 0
            ;;
        "status")
            show_status
            exit 0
            ;;
        "logs")
            shift
            podman-compose -f podman-compose.yml logs -f "$@"
            exit 0
            ;;
        "prod"|"production")
            print_status "Forcing production mode..."
            if ! podman secret inspect postgres_password &>/dev/null; then
                print_error "Production secrets not found. Please create them first:"
                echo "  echo 'your_secure_password' | podman secret create postgres_password -"
                echo "  echo 'Host=postgres;Port=5432;Database=ankiquizdb;Username=postgres;Password=your_secure_password' | podman secret create postgres_connection_string -"
                exit 1
            fi
            stop_services
            podman-compose -f podman-compose.yml -f podman-compose.prod.yml up --build -d
            wait_for_services
            show_status
            exit 0
            ;;
        "help"|"-h"|"--help")
            echo "AnkiQuiz Launcher Script"
            echo ""
            echo "Usage: $0 [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  (no args)    Start all services in development mode"
            echo "  prod           Start in production mode (requires secrets)"
            echo "  stop           Stop all services"
            echo "  restart        Restart all services"
            echo "  clean          Stop services and clean up containers/images"
            echo "  status         Show service status and access URLs"
            echo "  logs [service] Show logs for all services or specific service"
            echo "  help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0              # Start in development mode"
            echo "  $0 prod         # Start in production mode"
            echo "  $0 logs backend # Show backend logs"
            echo "  $0 status       # Show service status"
            exit 0
            ;;
        "")
            # Default action - start services
            stop_services
            start_services
            wait_for_services
            show_status
            exit 0
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Trap Ctrl+C to gracefully shutdown
trap 'print_status "Interrupted. Use '$0 stop' to shutdown services gracefully."' INT

# Run main function with all arguments
main "$@"
