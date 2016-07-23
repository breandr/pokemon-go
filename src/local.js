const pokeTrackr = require('./poke-trackr')
const POKEMON_IGNORE_LIST = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 27, 41, 42, 42, 44, 46, 48, 50, 52, 56, 58, 63, 69, 74, 84, 104, 127]

const centerLocation = {
  type: 'coords',
  coords: {
    // latitude: -24.574473,
    // longitude: 149.966701
      latitude: -24.573167,
      longitude: 149.977612
  }
}

const username = process.env.PGO_USERNAME || 'poke.go.sentry1@gmail.com';
const password = process.env.PGO_PASSWORD || 'pokegosentry1';
const provider = process.env.PGO_PROVIDER || 'google';
const callback = function(error, response) {
  if(error) throw error
}
const heartbeatCallback = function({pokemonSightings, pointsOfInterestMapUrl, cellsMapUrl}) {
  console.log('=======')
  console.log('pointsOfInterestMapUrl')
  console.log(pointsOfInterestMapUrl)
  console.log('cellsMapUrl')
  console.log(cellsMapUrl)
  console.log('=======')
}

pokeTrackr.init({username, password, centerLocation, provider})
.then(() => {
  function scanForPokemon() {
    console.log(pokeTrackr)
      return pokeTrackr.scanForPokemon({centerLocation})
      .then(({pokemonLocations}) => {
        console.log(pokemonLocations)
      })
  }

  scanForPokemon()
  function search() {
      return pokeTrackr.searchCurrentLocation({centerLocation})
      .then(({pokemonSightings, pointsOfInterestMapUrl, cellsMapUrl}) => {
        return heartbeatCallback({pokemonSightings, pointsOfInterestMapUrl, cellsMapUrl})
      })
  }

  search()
  setInterval(search, 10000)
  console.log('searching')
})
