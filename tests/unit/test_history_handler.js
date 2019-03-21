const assert = require('assert')
const sinon = require('sinon')
const githubClient = require('../../history_nodejs/githubClient')
const handler = require('../../history_nodejs/index').lambda_handler

describe('handler', function () {
  before(function () {
    this.findAllRepos = sinon
      .stub(githubClient, 'findAllRepos')
  })
  beforeEach(function () {
    this.testEvent = {
      queryStringParameters: {}
    }
  })
  after(function () {
    githubClient.findAllRepos.restore()
  })
  it('should return status 400 when GITHUB_ORG is not present', function (done) {
    handler(this.testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 400)
      assert.strictEqual(JSON.parse(resp.body).error, 'parameter GITHUB_ORG is missing')
      done()
    })
  })
  it('should return status 400 when GITHUB_ACCESS_TOKEN is not present', function (done) {
    this.testEvent.queryStringParameters.GITHUB_ORG = 'org'
    handler(this.testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 400)
      assert.strictEqual(JSON.parse(resp.body).error, 'parameter GITHUB_ACCESS_TOKEN is missing')
      done()
    })
  })
  it('should return status 400 when SINCE is not present', function (done) {
    this.testEvent.queryStringParameters.GITHUB_ORG = 'org'
    this.testEvent.queryStringParameters.GITHUB_ACCESS_TOKEN = 'token'
    handler(this.testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 400)
      assert.strictEqual(JSON.parse(resp.body).error, 'parameter SINCE was invalid, should be YYYY-MM-DD')
      done()
    })
  })
  it('should return status 400 when SINCE is incorrect', function (done) {
    this.testEvent.queryStringParameters.GITHUB_ORG = 'org'
    this.testEvent.queryStringParameters.GITHUB_ACCESS_TOKEN = 'token'
    this.testEvent.queryStringParameters.SINCE = 'foobar'
    handler(this.testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 400)
      assert.strictEqual(JSON.parse(resp.body).error, 'parameter SINCE was invalid, should be YYYY-MM-DD')
      done()
    })
  })
  it('should return status 400 when SINCE is in future', function (done) {
    this.testEvent.queryStringParameters.GITHUB_ORG = 'org'
    this.testEvent.queryStringParameters.GITHUB_ACCESS_TOKEN = 'token'
    let t = new Date()
    t.setMonth(t.getMonth() + 1)
    this.testEvent.queryStringParameters.SINCE = t.toISOString().split('T')[0]
    handler(this.testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 400)
      assert.strictEqual(JSON.parse(resp.body).error, 'parameter SINCE cannot be in future')
      done()
    })
  })
  it('should return status 400 as search throws', function (done) {
    this.findAllRepos.throws()
    this.testEvent.queryStringParameters.GITHUB_ORG = 'org'
    this.testEvent.queryStringParameters.GITHUB_ACCESS_TOKEN = 'token'
    this.testEvent.queryStringParameters.SINCE = '2018-12-12'
    handler(this.testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 400)
      let responseBody = JSON.parse(resp.body)
      assert.strictEqual(responseBody.error, 'could not connect to Github')
      done()
    })
  })
  it('should return status 200 with results', function (done) {
    this.findAllRepos.resolves(['x'])
    this.testEvent.queryStringParameters.GITHUB_ORG = 'org'
    this.testEvent.queryStringParameters.GITHUB_ACCESS_TOKEN = 'token'
    this.testEvent.queryStringParameters.SINCE = '2018-12-12'
    handler(this.testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 200)
      let responseBody = JSON.parse(resp.body)
      assert.strictEqual(responseBody.total, 1)
      assert.deepStrictEqual(responseBody.items, ['x'])
      done()
    })
  })
})
