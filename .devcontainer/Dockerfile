# ============================================================
# UNIGEvents — Dev Container Image
# ============================================================
# Base : Microsoft Java 21 devcontainer (Debian Bookworm)
#        Inclut : Java 21, Maven, Git, nvm, user "vscode"
# Ajout : Node.js 20 LTS (via nvm)
# ============================================================

FROM mcr.microsoft.com/devcontainers/java:1-21-bookworm

ARG NODE_VERSION=20

RUN su vscode -c "source /usr/local/share/nvm/nvm.sh \
    && nvm install ${NODE_VERSION} \
    && nvm alias default ${NODE_VERSION} 2>&1"
