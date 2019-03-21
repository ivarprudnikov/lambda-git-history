const https = require('https')
const { URL } = require('url')
const GITHUB_BASE_URL = 'https://api.github.com'
const GITHUB_UA_STRING = 'Github commit history filter'

exports.findAllRepos = async function findAllRepos (org, accessToken, since) {
  let repos = []
  const maxPerPage = 100

  function _find (pageNo) {
    return findRepos(org, accessToken, maxPerPage, pageNo, since)
      .then(searchResponse => {
        let pageRepos = searchResponse.items || []
        repos = repos.concat(pageRepos)
        if (pageRepos.length < maxPerPage || searchResponse.total_count === repos.length) {
          return repos
        } else {
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              _find(pageNo + 1).then(resolve).catch(reject)
            }, 1000)
          })
        }
      })
  }

  return _find(1)
}

async function findRepos (org, accessToken, max, pageNo, since) {
  const api = new URL('/search/repositories', GITHUB_BASE_URL)
  api.searchParams.set('access_token', accessToken)
  api.searchParams.set('per_page', max)
  api.searchParams.set('page', pageNo)
  api.searchParams.set('q', 'org:' + org + ' pushed:>=' + since)

  return asyncHttpsGetRequest(api)
}

async function asyncHttpsGetRequest (url) {
  return new Promise(function (resolve, reject) {
    https.get({
      host: url.host,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        'User-Agent': GITHUB_UA_STRING
      }
    }, (resp) => {
      let data = ''
      resp.on('data', (chunk) => {
        data += chunk
      })
      resp.on('end', () => {
        try {
          let parsed = JSON.parse(data)
          resolve(parsed)
        } catch (e) {
          reject(data)
        }
      })
    }).on('error', (err) => reject(err))
  })
}
