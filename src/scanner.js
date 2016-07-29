'use strict';
console.log('Loading function');
const pokeTrackr = require('./poke-trackr')

/**
 * Provide an event that contains the following keys:
 *
 *   - operation: one of the operations in the switch statement below
 *   - tableName: required for operations that interact with DynamoDB
 *   - payload: a parameter to pass to the operation being performed
 */
export default function (event, context, callback) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const POKEMON_IGNORE_LIST = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 27, 41, 42, 42, 44, 46, 48, 50, 52, 56, 58, 63, 69, 74, 84, 104, 127]

    const centerLocation = {
        type: 'coords',
        coords: {
          latitude: -24.572491,
          longitude: 149.973769
        }
    }

    const username = process.env.PGO_USERNAME || 'poke.go.sentry2@gmail.com';
    const password = process.env.PGO_PASSWORD || 'pokegosentry2';
    const provider = process.env.PGO_PROVIDER || 'google';

    const user = pokeTrackr.getUser({username, password, provider})
    return user.init({user, centerLocation})
    .then(() => {
      return user.scanForPokemon({centerLocation, numNeighborCells: 21, radius: 10, mapZoomLevel: 13, attemptToCatch: false, searchPokeStops: false, method: 'WALK'})
      .then(({pokemonLocations, pokemonCaught, pokeStopsSearched, itemsAwarded, coords, cellsScanned}) => {
        callback(null, {pokemonLocations, pokemonCaught, pokeStopsSearched, itemsAwarded, coords, cellsScanned})
      })
    })
};
