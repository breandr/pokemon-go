'use strict';
console.log('Loading function');
import pokeTrackr from './poke-trackr'
import logPokemonSightings from './pokemon-sightings'
console.log(logPokemonSightings)

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
          latitude: -24.574473,
          longitude: 149.966701
        }
    }

    const username = process.env.PGO_USERNAME || 'poke.go.sentry1@gmail.com';
    const password = process.env.PGO_PASSWORD || 'pokegosentry1';
    const provider = process.env.PGO_PROVIDER || 'google';
    const initCallback = function(error, response) {
      if(error) throw error
    }
    const heartbeatCallback = function(error, {pokemonSightings, pointsOfInterestMapUrl}) {
      if(error) throw error
      console.log('=========')
      console.log(pointsOfInterestMapUrl)
      console.log('=========')
      // logPokemonSightings({pokemonSightings})
    }

    pokeTrackr.init({username, password, centerLocation, provider, initCallback, heartbeatCallback})
};
