const os = require('os');

function getCPUsNumber() {
  let numCPUs;

  // Get CPU request from the environment variable
  const cpuRequestEnv = process.env.CPU_REQUEST;

  if (cpuRequestEnv) {
    const cpuRequestValue = parseFloat(cpuRequestEnv);

    if (cpuRequestEnv.endsWith('m')) {
      // Convert millicores to cores, e.g., "500m" -> 0.5 cores, floor it
      numCPUs = Math.floor(cpuRequestValue / 1000);
    } else {
      // If the value is in whole cores, just floor it as is
      numCPUs = Math.floor(cpuRequestValue);
    }
  } else {
    // Fallback to the number of logical CPUs on the system
    numCPUs = os.cpus().length;
  }

  // Ensure that numCPUs is at least 1, fallback to 1 if it's 0 or undefined
  return numCPUs || 1;
}

module.exports = {
  getCPUsNumber,
};
