import dynamoDataMapper from 'dynamodb-data-types'
console.log(dynamoDataMapper)
const REQUESTS_TABLE = require('constants')
module.exports = function({event, request}) {
    const dynamodb = new AWS.DynamoDB();
    const Item = dynamoDataMapper.wrap(request)
    dynamodb.putItem({
        TableName: REQUESTS_TABLE,
        Item
    }, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
}
