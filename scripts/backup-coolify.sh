#!/bin/bash

# =====================================================
# AGENTSALUD MVP - COOLIFY BACKUP SCRIPT
# =====================================================
# Automated backup script for Coolify deployment
# 
# @author AgentSalud DevOps Team
# @date January 2025

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
PROJECT_NAME="agentsalud-mvp"

# Database configuration
DB_CONTAINER="agentsalud-postgres"
DB_NAME="agentsalud"
DB_USER="agentsalud"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory..."
    
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/files"
    mkdir -p "$BACKUP_DIR/config"
    mkdir -p "$BACKUP_DIR/logs"
    
    success "Backup directories created"
}

# Backup database
backup_database() {
    log "Backing up PostgreSQL database..."
    
    local backup_file="$BACKUP_DIR/database/db_backup_$DATE.sql"
    local backup_file_compressed="$backup_file.gz"
    
    # Create database backup
    if docker-compose exec -T $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME > "$backup_file"; then
        success "Database backup created: $backup_file"
        
        # Compress backup
        gzip "$backup_file"
        success "Database backup compressed: $backup_file_compressed"
        
        # Verify backup integrity
        if gunzip -t "$backup_file_compressed"; then
            success "Database backup integrity verified"
        else
            error "Database backup integrity check failed"
        fi
    else
        error "Failed to create database backup"
    fi
}

# Backup application files
backup_files() {
    log "Backing up application files..."
    
    local backup_file="$BACKUP_DIR/files/files_backup_$DATE.tar.gz"
    
    # Backup uploaded files and important directories
    if tar -czf "$backup_file" \
        -C /app \
        uploads/ \
        .env \
        docker-compose.yml \
        nginx/ \
        2>/dev/null; then
        success "Files backup created: $backup_file"
    else
        warning "Some files may not have been backed up"
    fi
}

# Backup configuration
backup_config() {
    log "Backing up configuration..."
    
    local config_backup="$BACKUP_DIR/config/config_backup_$DATE.tar.gz"
    
    # Backup configuration files
    if tar -czf "$config_backup" \
        docker-compose.yml \
        .env \
        nginx/nginx.conf \
        scripts/ \
        2>/dev/null; then
        success "Configuration backup created: $config_backup"
    else
        warning "Some configuration files may not have been backed up"
    fi
}

# Backup logs
backup_logs() {
    log "Backing up logs..."
    
    local logs_backup="$BACKUP_DIR/logs/logs_backup_$DATE.tar.gz"
    
    # Get container logs
    docker-compose logs --no-color > "$BACKUP_DIR/logs/container_logs_$DATE.log" 2>/dev/null || true
    
    # Compress logs
    if tar -czf "$logs_backup" -C "$BACKUP_DIR/logs" "container_logs_$DATE.log" 2>/dev/null; then
        success "Logs backup created: $logs_backup"
        rm -f "$BACKUP_DIR/logs/container_logs_$DATE.log"
    else
        warning "Logs backup may have failed"
    fi
}

# Create backup manifest
create_manifest() {
    log "Creating backup manifest..."
    
    local manifest_file="$BACKUP_DIR/manifest_$DATE.json"
    
    cat > "$manifest_file" << EOF
{
    "backup_date": "$DATE",
    "project_name": "$PROJECT_NAME",
    "backup_type": "full",
    "files": {
        "database": "database/db_backup_$DATE.sql.gz",
        "files": "files/files_backup_$DATE.tar.gz",
        "config": "config/config_backup_$DATE.tar.gz",
        "logs": "logs/logs_backup_$DATE.tar.gz"
    },
    "retention_days": $RETENTION_DAYS,
    "created_by": "backup-coolify.sh",
    "version": "1.0"
}
EOF
    
    success "Backup manifest created: $manifest_file"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove backups older than retention period
    find "$BACKUP_DIR" -name "*backup_*" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "manifest_*" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    success "Old backups cleaned up (retention: $RETENTION_DAYS days)"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."
    
    local errors=0
    
    # Check database backup
    local db_backup="$BACKUP_DIR/database/db_backup_$DATE.sql.gz"
    if [ -f "$db_backup" ] && gunzip -t "$db_backup"; then
        success "Database backup integrity OK"
    else
        error "Database backup integrity check failed"
        ((errors++))
    fi
    
    # Check files backup
    local files_backup="$BACKUP_DIR/files/files_backup_$DATE.tar.gz"
    if [ -f "$files_backup" ] && tar -tzf "$files_backup" >/dev/null; then
        success "Files backup integrity OK"
    else
        warning "Files backup integrity check failed"
        ((errors++))
    fi
    
    # Check config backup
    local config_backup="$BACKUP_DIR/config/config_backup_$DATE.tar.gz"
    if [ -f "$config_backup" ] && tar -tzf "$config_backup" >/dev/null; then
        success "Config backup integrity OK"
    else
        warning "Config backup integrity check failed"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        success "All backups verified successfully"
    else
        warning "$errors backup(s) failed integrity check"
    fi
}

# Send backup notification (optional)
send_notification() {
    log "Sending backup notification..."
    
    local backup_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local message="AgentSalud MVP backup completed successfully on $DATE. Total size: $backup_size"
    
    # Add your notification logic here (email, Slack, etc.)
    # Example: curl -X POST -H 'Content-type: application/json' --data '{"text":"'$message'"}' YOUR_WEBHOOK_URL
    
    success "Backup notification sent"
}

# Main backup function
main() {
    log "Starting AgentSalud MVP backup process..."
    
    # Check if Docker Compose is running
    if ! docker-compose ps | grep -q "Up"; then
        error "Docker Compose services are not running"
    fi
    
    create_backup_dir
    backup_database
    backup_files
    backup_config
    backup_logs
    create_manifest
    verify_backups
    cleanup_old_backups
    send_notification
    
    success "🎉 Backup process completed successfully!"
    
    # Display backup summary
    echo ""
    log "Backup Summary:"
    echo "📁 Backup location: $BACKUP_DIR"
    echo "📅 Backup date: $DATE"
    echo "💾 Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo "🗂️  Files backed up:"
    echo "   - Database: db_backup_$DATE.sql.gz"
    echo "   - Files: files_backup_$DATE.tar.gz"
    echo "   - Config: config_backup_$DATE.tar.gz"
    echo "   - Logs: logs_backup_$DATE.tar.gz"
    echo "   - Manifest: manifest_$DATE.json"
    echo ""
    success "Backup completed at $(date)"
}

# Handle script interruption
trap 'error "Backup interrupted"' INT TERM

# Run main function
main "$@"
