const https = require('https');
const util = require("util")
const {URL} = require('url');

exports.lambda_handler = async function (event, context, callback) {

    const queryStringParameters = event["queryStringParameters"] || {};
    let GITHUB_ORG = queryStringParameters.GITHUB_ORG
    if (!GITHUB_ORG) {
        return sendErrors(callback, "parameter GITHUB_ORG is missing");
    }
    let GITHUB_ACCESS_TOKEN = queryStringParameters.GITHUB_ACCESS_TOKEN
    if (!GITHUB_ACCESS_TOKEN) {
        return sendErrors(callback, "parameter GITHUB_ACCESS_TOKEN is missing");
    }
    let timestamp = Date.parse(queryStringParameters.SINCE)
    if (isNaN(timestamp)) {
        return sendErrors(callback, "parameter SINCE was invalid, should be YYYY-MM-DD");
    }
    let DATE_SINCE = new Date(timestamp);
    if (DATE_SINCE > new Date()) {
        return sendErrors(callback, "parameter SINCE cannot be in future");
    }
    let repos
    try {
        repos = await findAllRepos(GITHUB_ORG, GITHUB_ACCESS_TOKEN)
    } catch (e) {
        return sendErrors(callback, util.inspect(e));
    }

    let filteredRepos = repos.filter(repo => {
       return new Date(repo.pushed_at) >= DATE_SINCE;
    });

    callback(null, {
        statusCode: 200,
        body: {
            repos: filteredRepos
        }
    });
}

function sendErrors(callback, error) {
    return callback(null, {
        statusCode: 400,
        body: {
            error: error
        }
    })
}

async function findAllRepos(org, access_token) {
    let repos = [];
    const max = 100;

    async function _find(pageNo) {
        return findRepos(org, access_token, max, pageNo)
            .then(pageRepos => {
                repos = repos.concat(pageRepos)
                if (pageRepos < max) {
                    return _find(max, pageNo + 1)
                } else {
                    return repos;
                }
            })
    }

    return _find(1)
}

async function findRepos(org, access_token, max, pageNo) {
    const api = new URL("/orgs/" + org + "/repos", "https://api.github.com");
    api.searchParams.set('access_token', access_token);
    api.searchParams.set('per_page', max);
    api.searchParams.set('page', pageNo);

    return asyncHttpsGetRequest(api.href)
        .then(jsonResponse => {
            if (!Array.isArray(jsonResponse)) {
                throw new Error("unexpected response:" + JSON.stringify(jsonResponse));
            }
            return jsonResponse
        })
}

async function asyncHttpsGetRequest(uri) {
    return new Promise(function (resolve, reject) {
        https.get(uri, (resp) => {
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
