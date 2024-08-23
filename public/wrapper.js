//! This is the compiler worker executed byt Remix IDE
//! It proxies requests to the solc proxy server

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
      console.log('Sending compile request'); 
      const data = await proxyAsync('--standard-json', e.data.input)
      const msg = {...e.data, cmd: 'compiled', timestamp: Date.now(),  data };
      postMessage(msg);
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
  const versionMatch = stdout.match(/Version:\s*([\d.]+)/);
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
