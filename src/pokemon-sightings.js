import dynamoDataMapper from 'dynamodb-data-types'
console.log(dynamoDataMapper)
const AWS = require('aws-sdk');
const SIGHTINGS_TABLE = require('constants')
export default function({
    event,
    pokemonSightings
}) {
    const dynamodb = new AWS.DynamoDB();
    const sightingPutRequests = pokemonSightings.map(pokemonSighting => {
        return {
            PutRequest: {
                Item: dynamoDataMapper.wrap(pokemonSighting)
            }
        }
    })
    dynamodb.batchWriteItem({
        RequestItems: {
            [SIGHTINGS_TABLE]: sightingPutRequests
        }
    }, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else console.log(data); // successful response
    })
};
