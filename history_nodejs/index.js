

exports.lambda_handler = function (event, context, callback) {



    callback(null, {
        statusCode: 200,
        body: 'ok'
    });
}
