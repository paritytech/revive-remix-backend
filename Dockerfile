FROM node:22-bookworm-slim

ENV SOLC_VERSION="0.8.26"
ENV RESOLC_VERSION="0.1.0-dev"

# Install dependencies
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    wget=1.21.3-1+b2 \
    ca-certificates=20230311 \
    && rm -rf /var/lib/apt/lists/*

# Download and install solc
RUN wget --progress=dot:mega https://github.com/ethereum/solidity/releases/download/v${SOLC_VERSION}/solc-static-linux \
    -O /usr/local/bin/solc && chmod +x /usr/local/bin/solc

# Download and install re-solc
RUN wget --progress=dot:mega https://github.com/paritytech/revive/releases/download/v${RESOLC_VERSION}/resolc \
    -O /usr/local/bin/resolc && chmod +x /usr/local/bin/resolc

RUN chown node:node /usr/local/bin/resolc /usr/local/bin/solc
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY public/ ./public
COPY utils/ ./utils
COPY config/ ./config
COPY controllers/ ./controllers
COPY middleware/ ./middleware
COPY routes/ ./routes
COPY server.js ./
RUN chown -R node:node /app

USER node
ENV NODE_ENV production

EXPOSE 3000
CMD ["npm", "start"]
