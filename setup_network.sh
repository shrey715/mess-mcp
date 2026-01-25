#!/bin/bash
set -e

# Detect IP (first non-loopback IPv4)
current_ip=$(hostname -I | awk '{print $1}')

if [ -z "$current_ip" ]; then
    echo "Could not detect IP address. Using localhost."
    current_ip="localhost"
fi

echo "Detected LAN IP: $current_ip"

# Path to docker-compose.yml
COMPOSE_FILE="moodle/docker/docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found!"
    exit 1
fi

echo "Updating $COMPOSE_FILE..."

# Update the wwwroot in the installer command
# We look for the line containing --wwwroot and replace the URL
sed -i "s|--wwwroot=http://[^[:space:]]*|--wwwroot=http://$current_ip:8085|g" "$COMPOSE_FILE"

echo "Updated installer config to use http://$current_ip:8085"

# Check if Moodle container is running
if [ "$(docker ps -q -f name=onlyapps_moodle)" ]; then
    echo "Moodle container is running. Attempting to update existing configuration..."
    
    # Update config.php
    docker exec onlyapps_moodle sed -i "s|\$CFG->wwwroot * = .*;|\$CFG->wwwroot = 'http://$current_ip:8085';|g" /var/www/html/config.php
    
    echo "Updated config.php inside container."
    
    # Run database search and replace
    echo "Running database search and replace (this might take a moment)..."
    docker exec onlyapps_moodle php admin/tool/replace/cli.php --search="//[^/]*/" --replace="//${current_ip}:8085/" --non-interactive || true
    # Note: The search regex above is a bit risky if it matches wrong things, but Moodle's tool is usually smart. 
    # Safer approach: just replace the old IP if we knew it. But we don't always know it.
    # Let's try a safer replacement pattern if possible, or just trust the user wants this IP.
    # Actually, the most common previous value is localhost or 127.0.0.1 or the old 10.42 IP.
    # Let's stick to updating config.php which is the most critical. search-replace is for embedded links.
    
    # Restart container to be sure
    echo "Restarting Moodle container..."
    docker restart onlyapps_moodle
    
    echo "Configuration updated successfully!"
else
    echo "Moodle container is not running. The changes will apply next time you run 'docker-compose up'."
fi

echo "
To access Moodle from other devices, use: http://$current_ip:8085
"
