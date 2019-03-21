const githubClient = require('./githubClient')

exports.lambda_handler = async function (event, context, callback) {
  const queryStringParameters = event['queryStringParameters'] || {}
  const GITHUB_ORG = queryStringParameters.GITHUB_ORG
  if (!GITHUB_ORG) {
    return sendErrors(callback, 'parameter GITHUB_ORG is missing')
  }
  const GITHUB_ACCESS_TOKEN = queryStringParameters.GITHUB_ACCESS_TOKEN
  if (!GITHUB_ACCESS_TOKEN) {
    return sendErrors(callback, 'parameter GITHUB_ACCESS_TOKEN is missing')
  }

  const SINCE = queryStringParameters.SINCE
  const timestamp = Date.parse(SINCE)
  if (isNaN(timestamp)) {
    return sendErrors(callback, 'parameter SINCE was invalid, should be YYYY-MM-DD')
  }
  let DATE_SINCE = new Date(timestamp)
  if (DATE_SINCE > new Date()) {
    return sendErrors(callback, 'parameter SINCE cannot be in future')
  }
  let repos
  try {
    repos = await githubClient.findAllRepos(GITHUB_ORG, GITHUB_ACCESS_TOKEN, SINCE)
  } catch (e) {
    return sendErrors(callback, 'could not connect to Github')
  }

  callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      total: repos.length,
      items: repos
    })
  })
}

function sendErrors (callback, error) {
  return callback(null, {
    statusCode: 400,
    body: JSON.stringify({
      error: error
    })
  })
}
