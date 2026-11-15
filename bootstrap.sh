#!/usr/bin/env bash
# macOS / Linux: install whatever of Node 22+, unzip and Docker is missing. Re-run safe. Windows: see README.
set -u
have() { command -v "$1" >/dev/null 2>&1; }
node_ok() { have node && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ]; }

if [ "$(uname)" = Darwin ]; then
  if ! have brew; then
    echo "Homebrew is needed to install the rest. Install it from https://brew.sh, then re-run ./bootstrap.sh"; exit 1
  fi
  node_ok || brew install node
  have docker || brew install --cask docker   # unzip ships with macOS
elif have apt-get; then
  have unzip || sudo apt-get install -y unzip
  node_ok || { sudo apt-get install -y curl && curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs; }
  have docker || { curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker "$USER" && echo "Log out and back in so Docker works without sudo."; }
else
  echo "Unsupported system. Install Node 22+, unzip and Docker by hand (links in the README)."; exit 1
fi

node_ok && have unzip && have docker || { echo "Something is still missing; see the messages above."; exit 1; }
echo
echo "All installed. If you just installed Docker Desktop, open it now, accept the terms, and wait until it says it is running."
echo "Then run: npm install && npm run setup"
