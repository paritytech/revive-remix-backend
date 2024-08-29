
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

or start it in cluster

```sh
npm install pm2@latest -g
pm2 start server.js
```

- Configure Remix

In Remix you will need to set the compiler to
`http://localhost:3000/wrapper.js`

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
