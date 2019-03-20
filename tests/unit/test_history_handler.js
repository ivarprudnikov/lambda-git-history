const assert = require('assert')
const handler = require('../../history_nodejs/index').lambda_handler

let testEvent = {
  queryStringParameters: {}
}

describe('handler', function () {
  it('should return status 400 when GITHUB_ORG is not present', function (done) {
    handler(testEvent, null, (err, resp) => {
      assert.strictEqual(err, null)
      assert.strictEqual(resp.statusCode, 400)
      done()
    })
  })
})
