
## Instructions for using with Remix

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
`http://localhost:3000/wrapper.js`

Alternatively, you can patch `remix-project` with

```sh
git apply ../remix-project.patch
```

This will force the compiler to our custom wrapper and make the change persistent.
