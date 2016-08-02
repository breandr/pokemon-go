'use strict';
console.log('Loading function');
const pokeTrackr = require('./poke-trackr')
let user
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

    const scanRequest = Object.assign({}, {
      numNeighborCells: 10,
      radius: 5,
      mapZoomLevel: 13,
      attemptToCatch: false,
      searchPokeStops: false,
      method: 'WALK',
      centerLocation: {
          type: 'coords',
          coords: {
            latitude: -24.572491,
            longitude: 149.973769
          }
      }
    }, event)

    const username = process.env.PGO_USERNAME || 'poke.go.sentry2@gmail.com';
    const password = process.env.PGO_PASSWORD || 'pokegosentry2';
    const provider = process.env.PGO_PROVIDER || 'google';

    let userInit = Promise.resolve()

    // caching user
    // if(!user) {
    //   user = pokeTrackr.getUser({username, password, provider})
    //   userInit = user.init({user, centerLocation: scanRequest.centerLocation})
    // }
    // console.log(userInit)
const user = pokeTrackr.getUser({username, password, provider})
    return user.init({user, centerLocation: scanRequest.centerLocation})
    .then(() => {
      console.log('inited')
      return user.scanForPokemon(scanRequest)
      .then(({pokemonLocations, pokeStops, gyms, coordsScanned, cellsScanned}) => {
        const response = {pokemonLocations, pokeStops, gyms}
        if(event.includeCoordsScanned) {
          response.coordsScanned = coordsScanned
          response.cellsScanned = cellsScanned
        }

      const pokemonNames = pokemonLocations.map(p => user.getPokedexInfo({pokemonId: p.data.PokedexTypeId}).name).sort()
      console.log(pokemonNames)
        callback(null, response)
      })
      .catch(e => {
        console.log(e)
        callback(e)
      })
    })
      .catch(e => {
        console.log(e)
        callback(e)
      })
};
