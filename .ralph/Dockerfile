# Ralph Worker Container — isolated execution environment for AI coding agents.
#
# Based on the official Playwright Docker image which includes Chromium and all
# required system dependencies (X11 libs, fonts, dbus, etc.) pre-configured and
# tested by the Playwright team. We add Claude CLI, Git config, and jq.
#
# The host's git worktree is bind-mounted into the container. The container runs
# the agent session, which may spawn Playwright, Chromium, test servers, etc.
# When the container is killed (docker kill), cgroups guarantee ALL child
# processes die atomically — no orphans, no pattern matching, no cleanup loops.
#
# Build:  docker build -t ralph-worker -f .ralph/Dockerfile .
# Usage:  (managed by ralph.sh — not invoked directly)

FROM mcr.microsoft.com/playwright:v1.58.2-noble

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Remove browsers we don't need (the base image includes all of them) and
# install additional tooling for ralph workers.
RUN rm -rf /ms-playwright/firefox-* /ms-playwright/webkit-* \
    && apt-get update && apt-get install -y --no-install-recommends \
    jq \
    procps \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# --- Install Claude CLI ---
# --- Pin Node.js to v22 LTS ---
# The Playwright base image ships Node 24, but the project lockfile was
# generated with npm 10 (Node 22). Mismatched npm versions cause
# package-lock.json drift on every npm install.
RUN npm install -g n && n 22 && hash -r \n    && node --version && npm --version

# Claude Code is distributed as a standalone binary via npm.
# Install globally so it's available as `claude` in PATH.
RUN npm install -g @anthropic-ai/claude-code@latest \
    && claude --version

# --- Container configuration ---

# Git needs a user identity for commits inside the container
RUN git config --global user.email "ralph@opentabs.dev" \
    && git config --global user.name "Ralph Worker" \
    # Mark all directories as safe (worktree mounts from the host)
    && git config --global --add safe.directory '*'

# Default entrypoint — ralph.sh overrides the command for each worker
ENTRYPOINT ["/bin/bash", "-c"]
CMD ["echo 'Ralph worker container ready. This container is managed by ralph.sh.'"]
