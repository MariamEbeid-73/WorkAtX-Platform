#!/bin/sh
# line endings must be \n, not \r\n!

echo "window._env_ = {" > /usr/share/nginx/html/env-config.js

# Loop through all environment variables
# If they start with VITE_, add them to the env-config.js file
env | grep "^VITE_" | while read -r line; do
  # Split the string by the first "="
  key=$(echo "$line" | cut -d '=' -f 1)
  value=$(echo "$line" | cut -d '=' -f 2-)
  
  # Append configuration property to JS file
  echo "  \"$key\": \"$value\"," >> /usr/share/nginx/html/env-config.js
done

echo "};" >> /usr/share/nginx/html/env-config.js
