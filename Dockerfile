FROM node:22-bookworm-slim

ENV SOLC_VERSION="0.8.26"
ENV RESOLC_VERSION="0.0.1"

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download and install solc
RUN wget https://github.com/ethereum/solidity/releases/download/v${SOLC_VERSION}/solc-static-linux \
    -O /usr/local/bin/solc && chmod +x /usr/local/bin/solc

# Download and install re-solc
RUN wget https://github.com/smiasojed/revive/releases/download/${RESOLC_VERSION}/resolc \
    -O /usr/local/bin/resolc && chmod +x /usr/local/bin/resolc

RUN chown node:node /usr/local/bin/resolc
RUN chown node:node /usr/local/bin/solc
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY utils/ ./utils
COPY server.js ./
RUN chown -R node:node /app

USER node
ENV NODE_ENV production

EXPOSE 3000
CMD ["npm", "start"]
