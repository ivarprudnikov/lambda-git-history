const https = require('https');
const util = require("util")
const {URL} = require('url');

exports.lambda_handler = async function (event, context, callback) {

    const queryStringParameters = event["queryStringParameters"] || {};
    const GITHUB_ORG = queryStringParameters.GITHUB_ORG
    if (!GITHUB_ORG) {
        return sendErrors(callback, "parameter GITHUB_ORG is missing");
    }
    const GITHUB_ACCESS_TOKEN = queryStringParameters.GITHUB_ACCESS_TOKEN
    if (!GITHUB_ACCESS_TOKEN) {
        return sendErrors(callback, "parameter GITHUB_ACCESS_TOKEN is missing");
    }

    const SINCE = queryStringParameters.SINCE
    const timestamp = Date.parse(SINCE)
    if (isNaN(timestamp)) {
        return sendErrors(callback, "parameter SINCE was invalid, should be YYYY-MM-DD");
    }
    let DATE_SINCE = new Date(timestamp);
    if (DATE_SINCE > new Date()) {
        return sendErrors(callback, "parameter SINCE cannot be in future");
    }
    let repos
    try {
        repos = await findAllRepos(GITHUB_ORG, GITHUB_ACCESS_TOKEN, SINCE)
    } catch (e) {
        return sendErrors(callback, util.inspect(e));
    }

    callback(null, {
        statusCode: 200,
        body: JSON.stringify({
            total: repos.length,
            items: repos
        })
    });
}

function sendErrors(callback, error) {
    return callback(null, {
        statusCode: 400,
        body: JSON.stringify({
            error: error
        })
    })
}

async function findAllRepos(org, access_token, since) {
    let repos = [];
    const maxPerPage = 100;

    function _find(pageNo) {
        return findRepos(org, access_token, maxPerPage, pageNo, since)
            .then(searchResponse => {
                let pageRepos = searchResponse.items || []
                repos = repos.concat(pageRepos)
                if (pageRepos.length < maxPerPage || searchResponse.total_count === repos.length) {
                    return repos;
                } else {
                    return new Promise(function (resolve, reject) {
                        setTimeout(function () {
                            _find(pageNo + 1).then(resolve).catch(reject)
                        }, 1000);
                    })
                }
            })
    }

    return _find(1)
}

async function findRepos(org, access_token, max, pageNo, since) {
    const api = new URL("/search/repositories", "https://api.github.com");
    api.searchParams.set('access_token', access_token);
    api.searchParams.set('per_page', max);
    api.searchParams.set('page', pageNo);
    api.searchParams.set('q', 'org:' + org + ' pushed:>=' + since)

    return asyncHttpsGetRequest(api);
}

async function asyncHttpsGetRequest(url) {

    return new Promise(function (resolve, reject) {
        https.get({
            host: url.host,
            path: url.pathname + url.search,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Github commit history filter'
            }
        }, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                try {
                    let parsed = JSON.parse(data)
                    resolve(parsed)
                } catch (e) {
                    reject(data)
                }
            });
        }).on("error", (err) => reject(err));
    });
}
