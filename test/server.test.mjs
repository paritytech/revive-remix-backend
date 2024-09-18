import request from 'supertest';
import { expect } from 'chai';
import app from '../server.js';
import config from '../config/config.js';

//Compiler input
const compilerInput = {
  language: 'Solidity',
  sources: {
    'MyContract.sol': {
      content: `
        // SPDX-License-Identifier: GPL-3.0
        pragma solidity ^0.8.0; 
        contract MyContract { 
          function greet() public pure returns (string memory) { 
            return "Hello"; 
          } 
        }
      `,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi'],
      },
    },
  },
};

describe('Express Server', function () {
  describe('Shorter compilation timeout', () => {
    const originalCompilationTimeout = config.server.compilationTimeout;

    before(() => {
      config.server.compilationTimeout = 1; // Set shorter timeout for these tests
    });

    after(() => {
      // Restore the original compilation timeout after the tests
      config.server.compilationTimeout = originalCompilationTimeout;
    });

    it('should return 500 for compiler execution timeout on /solc endpoint', function (done) {
      const inputString = JSON.stringify(compilerInput);

      request(app)
        .post('/solc')
        .send({
          cmd: '--standard-json',
          input: inputString,
        })
        .end((err, res) => {
          if (err) return done(err);

          expect(res.status).to.equal(500);
          done();
        });
    });

    // Add more tests with the shorter timeout here
  });

  it('should return 200 on /metrics endpoint', function (done) {
    request(app).get('/metrics').expect(200, done);
  });

  it('should return 400 for invalid cmd on /solc endpoint', function (done) {
    request(app)
      .post('/solc')
      .send({ cmd: 'invalid-command' })
      .expect(400, done);
  });

  it('should return 200 OK for valid --standard-json cmd on /solc endpoint', function (done) {
    const inputString = JSON.stringify(compilerInput);

    request(app)
      .post('/solc')
      .send({
        cmd: '--standard-json',
        input: inputString,
      })
      .end((err, res) => {
        if (err) return done(err);

        // Assert status is 200 OK
        expect(res.status).to.equal(200);
        // Check that the response contains the compiled contract
        const response = JSON.parse(res.text);
        expect(response).to.have.property('contracts');
        expect(response.contracts['MyContract.sol']).to.have.property(
          'MyContract',
        );
        expect(
          response.contracts['MyContract.sol'].MyContract,
        ).to.have.property('evm');
        expect(
          response.contracts['MyContract.sol'].MyContract.evm,
        ).to.have.property('bytecode');

        done();
      });
  });

  it('should return 200 OK with missing import error for --standard-json cmd on /solc endpoint', function (done) {
    const compilerInputWithImport = {
      ...compilerInput,
      sources: {
        'MyContract.sol': {
          content: `
            // SPDX-License-Identifier: GPL-3.0
            pragma solidity ^0.8.0; 
            import "hardhat/console.sol";
            contract MyContract { 
              function greet() public pure returns (string memory) { 
                return "Hello"; 
              } 
            }
          `,
        },
      },
    };

    // Stringify the compiler input as required
    const inputString = JSON.stringify(compilerInputWithImport);

    request(app)
      .post('/solc')
      .send({
        cmd: '--standard-json',
        input: inputString,
      })
      .end((err, res) => {
        if (err) return done(err);

        // Assert status is 200 OK
        expect(res.status).to.equal(200);
        // Check that the response contains the compiled contract
        const response = JSON.parse(res.text);
        expect(response).to.have.property('errors');
        expect(response.errors).to.be.an('array');
        expect(response.errors.length).to.be.greaterThan(0);
        expect(response.errors[0]).to.have.property('message');
        expect(response.errors[0].message).to.contains(
          'Source "hardhat/console.sol" not found: File not found',
        );

        done();
      });
  });
});
