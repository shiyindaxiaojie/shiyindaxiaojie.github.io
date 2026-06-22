#!/bin/bash

# ==============================================================================
# Script Name: mysql_migrate.sh
# Description: Securely migrates a MySQL database from a source to a target.
#              Supports scheduled execution, multiple schemas, logging and more.
# Author: mengxiangge
# Version: 1.0
# Usage: ./mysql_migrate.sh [options]
# ==============================================================================

# --- Script Behavior & Safety ---
set -euo pipefail

# --- Color Codes for Output ---
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_RED='\033[0;31m'
readonly COLOR_YELLOW='\033[0;33m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_RESET='\033[0m'

# --- Global Variables ---
SCRIPT_VERSION="1.0"

SOURCE_HOST=""
SOURCE_USERNAME=""
SOURCE_PASSWORD=""
SOURCE_PORT="3306"
SOURCE_DB=""

TARGET_HOST=""
TARGET_USERNAME=""
TARGET_PASSWORD=""
TARGET_PORT="3306"
TARGET_DB=""

SCHEDULE_TIME=""
LOG_FILE="mysql_migrate.log"

TMP_SQL_FILE=""
TMP_SOURCE_CONFIG_FILE=""
TMP_TARGET_CONFIG_FILE=""

# --- Utility Functions ---

strip_colors() {
    sed 's/\x1b\[[0-9;]*m//g'
}

log_to_file() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | strip_colors >> "${LOG_FILE}"
}

log_info() { 
    local msg
    msg=$(printf "${COLOR_BLUE}[INFO]${COLOR_RESET} %s" "$1")
    echo -e "$msg"
    log_to_file "$msg"
}
log_success() { 
    local msg
    msg=$(printf "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} %s" "$1")
    echo -e "$msg"
    log_to_file "$msg"
}
log_warning() { 
    local msg
    msg=$(printf "${COLOR_YELLOW}[WARNING]${COLOR_RESET} %s" "$1")
    echo -e "$msg" >&2
    log_to_file "$msg"
}
log_error() { 
    local msg
    msg=$(printf "${COLOR_RED}[ERROR]${COLOR_RESET} %s" "$1")
    echo -e "$msg" >&2
    log_to_file "$msg"
    exit 1
}

usage() {
    echo "mysqlmigrate v${SCRIPT_VERSION}"
    echo "Usage: $0 [options]"
    echo "Securely migrates MySQL databases from a source to a target."
    echo ""
    echo "Source Options (lowercase):"
    echo "  -s <source_host>        Source database hostname or IP."
    echo "  -u <source_username>    Source database username."
    echo "  -p <source_password>    Source database password."
    echo "  -d <source_db>          Source database name(s). Comma-separated for multiple."
    echo "  -o <source_port>        Source database port. (Default: 3306)"
    echo ""
    echo "Target Options (uppercase):"
    echo "  -S <target_host>        Target database hostname or IP."
    echo "  -U <target_username>    Target database username."
    echo "  -P <target_password>    Target database password."
    echo "  -D <target_db>          Target database name(s). Comma-separated. (Optional, defaults to source_db)"
    echo "  -O <target_port>        Target database port. (Default: 3306)"
    echo ""
    echo "Execution Options:"
    echo "  -T <time>               Schedule execution time (e.g., '2026-03-12 10:00:00')."
    echo "  -L <log_file>           Specify log file path. (Default: mysql_migrate.log)"
    echo ""
    echo "Utility:"
    echo "  -install                Install this script as a global command 'mysqlmigrate'."
    echo "  -uninstall              Uninstall the global command 'mysqlmigrate'."
    echo "  -h                      Display this help and exit."
    exit 0
}

# --- Installation & Uninstallation ---

install_command() {
    local script_path
    script_path=$(realpath "$0")
    local install_path="/usr/local/bin/mysqlmigrate"

    log_info "Attempting to install 'mysqlmigrate' command..."

    if [[ $EUID -ne 0 ]]; then
        log_info "Root privileges are required to install. Attempting to use sudo..."
        exec sudo "$0" -install
    fi

    if [[ -e "$install_path" ]]; then
        local installed_version
        installed_version=$(grep '^SCRIPT_VERSION=' "$install_path" | cut -d'"' -f2 || echo "unknown")
        if [[ -z "$installed_version" ]]; then
            installed_version="unknown"
        fi
        
        if [[ "$installed_version" == "$SCRIPT_VERSION" ]]; then
            log_warning "'mysqlmigrate' (v${SCRIPT_VERSION}) is already installed at $install_path."
            read -p "Do you want to overwrite it? (y/N): " confirm
            if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                log_info "Installation cancelled."
                exit 0
            fi
        else
            log_warning "Version mismatch detected!"
            echo -e "  Installed version: \033[0;33m${installed_version}\033[0m"
            echo -e "  New version:       \033[0;32m${SCRIPT_VERSION}\033[0m"
            read -p "Do you want to upgrade/overwrite? (y/N): " confirm
            if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                log_info "Installation cancelled."
                exit 0
            fi
        fi
    fi

    log_info "Copying script to '$install_path'..."
    cp "$script_path" "$install_path"
    chmod +x "$install_path"

    log_success "Installation complete! 'mysqlmigrate' (v${SCRIPT_VERSION}) is ready."
    exit 0
}

uninstall_command() {
    local install_path="/usr/local/bin/mysqlmigrate"
    
    log_info "Attempting to uninstall 'mysqlmigrate' command..."
    if [[ ! -e "$install_path" ]]; then
        log_warning "'mysqlmigrate' is not installed."
        exit 0
    fi
    
    if [[ $EUID -ne 0 ]]; then
        log_info "Root privileges are required to uninstall. Attempting to use sudo..."
        exec sudo "$0" -uninstall
    fi
    
    rm -f "$install_path"
    log_success "Uninstallation complete!"
    exit 0
}

# --- Core Logic Functions ---

validate_params() {
    local error_count=0
    [[ -z "$SOURCE_HOST" ]] && { log_warning "Source host (-s) is missing."; ((error_count++)); }
    [[ -z "$SOURCE_USERNAME" ]] && { log_warning "Source username (-u) is missing."; ((error_count++)); }
    [[ -z "$SOURCE_PASSWORD" ]] && { log_warning "Source password (-p) is missing."; ((error_count++)); }
    [[ -z "$SOURCE_DB" ]] && { log_warning "Source database (-d) is missing."; ((error_count++)); }
    [[ -z "$TARGET_HOST" ]] && { log_warning "Target host (-S) is missing."; ((error_count++)); }
    [[ -z "$TARGET_USERNAME" ]] && { log_warning "Target username (-U) is missing."; ((error_count++)); }
    [[ -z "$TARGET_PASSWORD" ]] && { log_warning "Target password (-P) is missing."; ((error_count++)); }

    if (( error_count > 0 )); then
        log_error "One or more required parameters are missing. See usage with -h."
    fi
}

wait_for_schedule() {
    if [[ -z "$SCHEDULE_TIME" ]]; then
        return
    fi

    local target_ts
    if target_ts=$(date -d "$SCHEDULE_TIME" +%s 2>/dev/null); then
        :
    elif target_ts=$(date -j -f "%Y-%m-%d %H:%M:%S" "$SCHEDULE_TIME" +%s 2>/dev/null); then
        :
    else
        log_error "Invalid schedule time format. Please use 'YYYY-MM-DD HH:MM:SS'."
    fi
    
    local current_ts
    current_ts=$(date +%s)
    local diff=$((target_ts - current_ts))
    
    if (( diff > 0 )); then
        log_info "Task is scheduled at '$SCHEDULE_TIME'. Waiting for $diff seconds..."
        sleep "$diff"
        log_info "Schedule reached. Starting execution now."
    else
        log_warning "Scheduled time '$SCHEDULE_TIME' is in the past. Executing immediately."
    fi
}

setup_temp_files() {
    log_info "Setting up secure temporary files..."
    TMP_SQL_FILE=$(mktemp)
    TMP_SOURCE_CONFIG_FILE=$(mktemp)
    TMP_TARGET_CONFIG_FILE=$(mktemp)
    trap cleanup EXIT
    chmod 600 "$TMP_SQL_FILE" "$TMP_SOURCE_CONFIG_FILE" "$TMP_TARGET_CONFIG_FILE"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    local temp_files=(
        "${TMP_SQL_FILE:-}"
        "${TMP_SOURCE_CONFIG_FILE:-}"
        "${TMP_TARGET_CONFIG_FILE:-}"
    )

    for file_path in "${temp_files[@]}"; do
        if [[ -n "$file_path" && -e "$file_path" ]]; then
            log_info "Removing temporary file: $file_path"
            rm -f "$file_path"
        fi
    done
}

create_config_files() {
    log_info "Creating temporary MySQL config files for credentials..."
    cat > "$TMP_SOURCE_CONFIG_FILE" <<EOF
[client]
host = "${SOURCE_HOST}"
port = "${SOURCE_PORT}"
user = "${SOURCE_USERNAME}"
password = "${SOURCE_PASSWORD}"
EOF

    cat > "$TMP_TARGET_CONFIG_FILE" <<EOF
[client]
host = "${TARGET_HOST}"
port = "${TARGET_PORT}"
user = "${TARGET_USERNAME}"
password = "${TARGET_PASSWORD}"
EOF
}

export_import_database() {
    local IFS=','
    local source_dbs=($SOURCE_DB)
    local target_dbs=()
    
    if [[ -z "$TARGET_DB" ]]; then
        target_dbs=("${source_dbs[@]}")
    else
        target_dbs=($TARGET_DB)
    fi
    
    if [[ ${#source_dbs[@]} -ne ${#target_dbs[@]} ]]; then
        log_error "The number of source databases does not match the number of target databases."
    fi
    
    local total=${#source_dbs[@]}
    
    for i in "${!source_dbs[@]}"; do
        local s_db="${source_dbs[$i]}"
        local t_db="${target_dbs[$i]}"
        
        log_info "Processing [$((i+1))/$total] - Source: '${s_db}' -> Target: '${t_db}'..."
        
        log_info "  [1/2] Exporting '${s_db}'..."
        if ! mysqldump --defaults-extra-file="$TMP_SOURCE_CONFIG_FILE" \
                  --single-transaction \
                  --routines \
                  --events \
                  --quick \
                  --lock-tables=false \
                  "${s_db}" > "$TMP_SQL_FILE"; then
            log_error "Export failed for '${s_db}'"
        fi
        log_success "  Export successful. Dump file size: $(du -h "$TMP_SQL_FILE" | cut -f1)"
                  
        log_info "  [2/2] Importing into '${t_db}'..."
        # Optional: ensure target DB exists
        mysql --defaults-extra-file="$TMP_TARGET_CONFIG_FILE" -e "CREATE DATABASE IF NOT EXISTS \`${t_db}\`;"
        if ! mysql --defaults-extra-file="$TMP_TARGET_CONFIG_FILE" "${t_db}" < "$TMP_SQL_FILE"; then
            log_error "Import failed for '${t_db}'"
        fi
        log_success "  Import successful for '${t_db}'."
    done
}

# --- Main Execution ---

main() {
    # Check for install/uninstall first
    for arg in "$@"; do
        if [[ "$arg" == "-install" ]]; then
            install_command
        elif [[ "$arg" == "-uninstall" ]]; then
            uninstall_command
        fi
    done

    while getopts ":s:u:p:d:o:S:U:P:D:O:T:L:h" opt; do
        case ${opt} in
            s) SOURCE_HOST=$OPTARG ;;
            u) SOURCE_USERNAME=$OPTARG ;;
            p) SOURCE_PASSWORD=$OPTARG ;;
            d) SOURCE_DB=$OPTARG ;;
            o) SOURCE_PORT=$OPTARG ;;
            S) TARGET_HOST=$OPTARG ;;
            U) TARGET_USERNAME=$OPTARG ;;
            P) TARGET_PASSWORD=$OPTARG ;;
            D) TARGET_DB=$OPTARG ;;
            O) TARGET_PORT=$OPTARG ;;
            T) SCHEDULE_TIME=$OPTARG ;;
            L) LOG_FILE=$OPTARG ;;
            h) usage ;;
            \?) log_error "Invalid option: -${OPTARG:-<unknown>}. Use -h for help." ;;
            :) log_error "Option -${OPTARG} requires an argument." ;;
        esac
    done
    
    # Touch log file to ensure it exists and is writable
    touch "${LOG_FILE}" || log_error "Cannot write to log file: ${LOG_FILE}"

    log_info "=========================================="
    log_info "Starting MySQL database migration task."
    log_info "Source:      ${SOURCE_USERNAME}@${SOURCE_HOST}:${SOURCE_PORT} / DB: ${SOURCE_DB}"
    log_info "Destination: ${TARGET_USERNAME}@${TARGET_HOST}:${TARGET_PORT} / DB: ${TARGET_DB:-<same as source>}"
    log_info "Log File:    ${LOG_FILE}"
    log_info "Schedule:    ${SCHEDULE_TIME:-Immediate}"
    log_info "=========================================="

    validate_params
    wait_for_schedule
    setup_temp_files
    create_config_files
    export_import_database

    log_info "=========================================="
    log_success "All migrations completed successfully!"
}

main "$@"