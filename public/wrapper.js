//! This is the compiler worker executed byt Remix IDE
//! It proxies requests to the solc proxy server
let missingSources = [];

// synchronous fetch
function proxySync(cmd, input) {
  const request = new XMLHttpRequest();
  request.open("POST", "http://localhost:3000/solc", false);
  request.setRequestHeader("Content-Type", "application/json");
  request.send(JSON.stringify({cmd, input}));
  if (request.status === 200) {
    return request.responseText;
  } 
  throw new Error('fetch failed');
}

// asynchronous fetch
async function proxyAsync(cmd, input) {
  const resp = await fetch('http://localhost:3000/solc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({cmd, input}),
  })

  if (!resp.ok) {
    throw new Error(`HTTP error! status: ${resp.status}`);
  }

  return await resp.text();
}

self.onmessage = async function(e) {
  console.log('wrapper.js received message', e.data);
  try {
    if (e.data.cmd === 'compile') {
      let result = await proxyAsync('--standard-json', e.data.input)
      let data = JSON.parse(result)
      if (data.errors) {
        data.errors.forEach(err => {
          if (err.message && err.message.includes('File not found')) {
            // Modify the messages to notify remix that additional sources are needed
            err.message = err.message.replace("File not found", "Deferred import");
            err.formattedMessage = err.formattedMessage.replace("File not found","Deferred import");
            // Extract and collect the missing source
            const match = err.message.match(/Source "(.*?)"/);
            if (match) {
                missingSources.push(match[1]); // Add the missing source path to the array
            }
          }
        });
      }
      const msg = {...e.data, cmd: 'compiled', timestamp: Date.now(), data: JSON.stringify(data), missingInputs: missingSources};
      self.postMessage(msg);
      missingSources.length = 0;
    }
  } catch (e) {
    console.error('Mesage handling failed', e);
  }
}

// Noop function, this is invoked by Remix IDE when the worker is loaded
function cwrap(methodName) {
  console.log(`wrapper.js cwrap called with ${methodName}`);
  switch (methodName) {
    case 'solidity_compile':
      return _solidity_compile;
    case 'solidity_license':
      return _solidity_license;
    case 'solidity_version':
      return _solidity_version;
    case 'solidity_alloc':
      return _solidity_alloc;
    case 'solidity_reset':
      return _solidity_reset;
    case 'compileJSON':
      return _compileJSON;
    case 'compileJSONMulti':
      return _compileJSONMulti;
    case 'compileJSONCallback':
      return _compileJSONCallback;
    case 'compileStandard':
      return _compileStandard;
    default:
      console.log('wrapper.js cwrap called with unknown methodName:', methodName);
      }
}

function _solidity_license() {
  const stdout = proxySync('--license', '');
  return stdout;
}

function _solidity_version() {
  const stdout = proxySync('--version', '');
  const versionMatch = stdout.match(/[v\s]([\d.]+)/);
  return versionMatch[1];
}

function _solidity_alloc() {
  console.log('TODO solidity_alloc called with args', arguments)
}
function _solidity_reset() {
  console.log('TODO solidity_reset called with args', arguments)
}
function _compileJSON() {
  console.log('TODO compileJSON called with args', arguments)
}
function _compileJSONMulti() {
  console.log('TODO compileJSONMulti called with args', arguments)
}
function _compileJSONCallback() {
  console.log('TODO compileJSONCallback called with args', arguments)
}
function _compileStandard() {
  console.log('TODO compileStandard called with args', arguments)
}
