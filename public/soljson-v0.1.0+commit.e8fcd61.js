//! This is the compiler worker executed byt Remix IDE
//! It proxies requests to the revive-remix-backend server
if (typeof missingSources === "undefined") {
  var missingSources = []
}

function getBackednUrl() {
// Staging backend
// return 'https://remix-backend.parity-stg.parity.io'
  return 'http://localhost:3000';
}

function getVersion() {
  return '0.1.0'
}

// synchronous fetch
function proxySync(path, cmd, input) {
  const request = new XMLHttpRequest();
  const url = getBackednUrl();
  const version = getVersion();
  request.open('POST', `${url}/${path}?version=${version}`, false);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify({ cmd, input }));
  if (request.status === 200) {
    return request.responseText;
  }

  throw new Error(
    request.responseText || `HTTP error! status: ${request.status}`,
  );
}

// asynchronous fetch
async function proxyAsync(path, cmd, input) {
  const url = getBackednUrl();
  const version = getVersion();
  const resp = await fetch(`${url}/${path}?version=${version}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cmd, input }),
  });
  const responseText = await resp.text();

  if (!resp.ok) {
    throw new Error(responseText || `HTTP error! status: ${resp.status}`);
  }

  return responseText;
}

function _solidity_license() {
  const stdout = proxySync('resolc', '--license');
  return stdout;
}

function _solidity_version() {
  const stdout = proxySync('solc', '--version');
  const versionMatch = stdout.match(/[v\s]([\d.]+)/);
  return versionMatch[1];
}

function _solidity_alloc() {
  console.log('TODO solidity_alloc called with args', arguments);
}
function _solidity_reset() {
  console.log('TODO solidity_reset called with args', arguments);
}
function _compileJSON() {
  console.log('TODO compileJSON called with args', arguments);
}
function _compileJSONMulti() {
  console.log('TODO compileJSONMulti called with args', arguments);
}
function _compileJSONCallback() {
  console.log('TODO compileJSONCallback called with args', arguments);
}
function _compileStandard() {
  console.log('TODO compileStandard called with args', arguments);
}

// Noop function, this is invoked by Remix IDE when the worker is loaded
function cwrap(methodName) {
  switch (methodName) {
    case 'solidity_compile':
      return _solidity_compile;
    case 'solidity_license':
      return _solidity_license;
    case 'version':
        return _solidity_version;
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
      console.log(
        'soljson.js cwrap called with unknown methodName:',
        methodName,
      );
  }
}

self.onmessage = async function (e) {
  console.log('soljson.js received message', e.data);
  try {
    if (e.data.cmd === 'compile') {
      let result = await proxyAsync('resolc', '--standard-json', e.data.input);
      let data = JSON.parse(result);
      if (data.errors) {
        data.errors.forEach((err) => {
          if (err.message && err.message.includes('File not found')) {
            // Modify the messages to notify remix that additional sources are needed
            err.message = err.message.replace(
              'File not found',
              'Deferred import',
            );
            err.formattedMessage = err.formattedMessage.replace(
              'File not found',
              'Deferred import',
            );
            // Extract and collect the missing source
            const match = err.message.match(/Source "(.*?)"/);
            if (match) {
              missingSources.push(match[1]); // Add the missing source path to the array
            }
          }
        });
      }
      const msg = {
        ...e.data,
        cmd: 'compiled',
        timestamp: Date.now(),
        data: JSON.stringify(data),
        missingInputs: missingSources,
      };
      self.postMessage(msg);
      missingSources.length = 0;
    }
  } catch (ex) {
    const msg = {
      ...e.data,
      cmd: 'compiled',
      timestamp: Date.now(),
      data: JSON.stringify({ error: ex.message }),
    };
    self.postMessage(msg);
  }
};
