#!/bin/bash
# entrypoint.sh para Koyeb: escribe el secret en un archivo antes de iniciar la app

if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
  echo "$GOOGLE_CREDENTIALS_JSON" > /app/google-credentials.json
fi
exec node server.js
