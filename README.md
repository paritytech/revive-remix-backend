
## Instructions for using with Remix

- Install the `resolc` binary:

Follow the [installation instructions](https://github.com/xermicus/revive?tab=readme-ov-file#installation).

- Start Local Remix:

```sh
cd remix-project
yarn install
yarn serve
```

- Start the solc proxy server:

```sh
npm install
node server.js
```

- Configure Remix

In Remix you will need to set the compiler to
`http://localhost:3000/soljson.js`

Alternatively, you can patch `remix-project` with

```sh
git apply ../remix-project.patch
```

This will force the compiler to our custom wrapper and make the change persistent.

Change the compiler configuration to:

```json
{
  "language": "Solidity",
  "settings": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "outputSelection": {
      "*": {
        "": ["ast"],
        "*": ["abi", "devdoc", "userdoc", "storageLayout", "evm.legacyAssembly", "evm.deployedBytecode", "evm.methodIdentifiers"]
      }
    }
  }
}
```

Connect Remix to your Metamask wallet:

Navigate to the `Deploy & Run Transactions` section.
In the `Environment` dropdown menu, select `Injected Provider - MetaMask`.

## Deployment

You can use the provided Dockerfile to build and run the application as a Docker container.

```sh
docker build --platform=linux/amd64 -t paritytech/revive-remix-backend:latest .
docker run --rm -p 3000:3000 paritytech/revive-remix-backend:latest
```

Alternatively, you can use Kubernetes:

```sh
kubectl apply -f pod.yaml
kubectl port-forward pod/revive-remix-backend-pod 3000:3000
```
