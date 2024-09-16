const request = require('supertest');
const express = require('express');
const app = require('../src/server');
const assert = require('assert');

describe('Express Server', function () {
  it('should return 200 on /metrics endpoint', function (done) {
    request(app)
      .get('/metrics')
      .expect(200, done);
  });

  it('should return 400 for invalid cmd in /solc', function (done) {
    request(app)
      .post('/solc')
      .send({ cmd: 'invalid-command' })
      .expect(400, done);
  });
});

