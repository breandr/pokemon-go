const pokeTrackr = require('./poke-trackr')
const POKEMON_IGNORE_LIST = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 27, 41, 42, 42, 44, 46, 48, 50, 52, 56, 58, 63, 69, 74, 84, 104, 127]

// Moura coverage: -24.572491,149.973769; radius: 22
// Go to Central Park
const centerLocation = {
  type: 'coords',
  coords: {
      //moura
      // latitude: -24.572491,
      // longitude: 149.973769
      //
      // olympia
      // latitude: 47.024726,
      // longitude: -122.891396
      //
      // central Park
      // latitude: 40.781217,
      // longitude: -73.963575
      //
      // santa monica pier
      latitude: 34.0081311709505,
      longitude: -118.49679708480834
  }
}

const username = process.env.PGO_USERNAME || 'poke.go.sentry2@gmail.com';
const password = process.env.PGO_PASSWORD || 'pokegosentry2';
const provider = process.env.PGO_PROVIDER || 'google';

const user = pokeTrackr.getUser({username, password, provider})
user.init({user, centerLocation})
.then(() => {
  function searchCurrentLocation() {
      return user.searchCurrentLocation({centerLocation})
      .then(({pokemonSightings, pointsOfInterest, neighboringCells}) => {
console.log(pokemonSightings, pointsOfInterest, neighboringCells)
        const pointsOfInterestMapUrl = getStaticMapUrl({centerLocation, markers: pointsOfInterest})
        const cellsMapUrl = getCellsMapUrl({centerLocation, cells: neighboringCells})
        console.log(cellsMapUrl)
        console.log(pointsOfInterestMapUrl)
      })
  }

  return user.scanForPokemon({centerLocation, numNeighborCells: 10, radius: 3, mapZoomLevel: 13, attemptToCatch: false, searchPokeStops: false, method: 'WALK'})
  .then(({pokemonLocations, pokemonCaught, pokeStopsSearched, itemsAwarded, coordsScanned, cellsScanned}) => {
    const coordMarkers = coordsScanned.map(coord => ({marker: coord}))
      const coordsMapUrl = user.getStaticMapUrl({centerLocation, markers: coordMarkers})
      const pokemonMapUrl = user.getStaticMapUrl({centerLocation, markers: pokemonLocations})
      console.log('pokemonMapUrl')
      console.log(pokemonMapUrl)
      console.log('===================')
      console.log('coordsMapUrl')
      console.log(coordsMapUrl)
      // console.log('===================')
      // console.log('pokemonCaught')
      // console.log(pokemonCaught)
      // console.log('===================')
      // console.log('pokeStopsSearched')
      // console.log(pokeStopsSearched.length)
      // console.log(itemsAwarded)
      // console.log('===================')
      // console.log('num pokemon found:',  pokemonLocations.length)
      // console.log('num cells explored:', coordsScanned.length)
      const pokemonNames = pokemonLocations.map(p => user.getPokedexInfo({pokemonId: p.data.PokedexTypeId}).name).sort()
      console.log(pokemonNames)
  })
  // return searchCurrentLocation()
  // setInterval(searchCurrentLocation, 10000)
})
.then(r => {
  console.log(r)
  return r
})
.catch(e => {
  console.error('finalerror', e)
})
