#!/bin/sh

# Handle SIGINT signal
handle_sigint() {
    echo "Shutting down..."
    
    # Loop through all the subprocesses and kill them
    for proc in $pids
    do
        kill $proc
    done
}

# Set a trap to call the function on Ctrl+C
trap handle_sigint INT

# Start the app
cd api
npm install
npm run start &
pids="$pids $!"
cd ..
cd client
npm install
npm run start &
pids="$pids $!"
cd ..
nginx -c "$PWD/nginx.conf" &
pids="$pids $!"

# Wait for the subprocesses to finish
wait
