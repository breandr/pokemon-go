const promisify = require('promisify-node')
const PokeIo = require('pokemon-go-node-api/poke.io')
const s2Geo = require('s2geometry-node')
const async = require('async')
const GOOGLE_MAPS_ZOOM = 17.5
const pokeIo = promisify(PokeIo, undefined, true)

module.exports.init = function init({username, password, centerLocation, provider}) {
  return pokeIo.init(username, password, centerLocation, provider)
  .then(() => {
      console.log(`Current location ${pokeIo.playerInfo.locationName}`)
      console.log(`lat/long: ${pokeIo.playerInfo.latitude},${pokeIo.playerInfo.longitude}`)

      return pokeIo.GetProfile()
      .then(profile => {
          const pokeCoin = profile.currency[0].amount || 0;
          const starDust = profile.currency[1].amount || 0;

          console.log(`Username: ${profile.username}`)
          console.log(`Pokemon Storage: ${profile.poke_storage}`)
          console.log(`Item Storage: ${profile.item_storage}`)
          console.log(`Pokecoin: ${pokeCoin}`)
          console.log(`Stardust: ${starDust}`)
      })
  })
}

function printCellData({cell, ignore}) {
    Object.keys(cell)
    .filter(key => ignore.indexOf(key) === -1)
    .forEach(key => {
      const cellValue = cell[key]

      if(Array.isArray(cellValue)) {
        if(cellValue.length) console.log(key, cellValue)
      } else {
        console.log(key, cellValue)
      }
    })
}

function millisecondsToTime(ms) {
      const milliseconds = ms % 1000;
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (60 * 1000)) % 60);
      const hours = Math.floor((ms / (60 * 60 * 1000)) % (60 * 60));

      let message = ''

      if (hours) message += `${hours} hours, `
      if (minutes) message += `${minutes} minutes, `
      if (seconds) message += `${seconds} seconds, `

      return message.substring(0, message.length - 2)
}

function getPokedexInfo({pokemonId}) {
  return pokeIo.pokemonlist[parseInt(pokemonId) - 1]
}

// function getCellFacet({facet, color, label}) {
//   return facet.map(f => {
//       // console.log(`spawn point at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${f.Latitude}+${f.Longitude}&ll=${f.Latitude}+${f.Longitude}">${f.Latitude},${f.Longitude}</a>`)
//       return {
//         latitude: f.Latitude,
//         longitude: f.Longitude,
//         color,
//         label
//       }
//   })
// }

// function getSpawnPoints({spawnPoints}) {
//   return getCellFacet({facet: spawnPoints, color: 'green', label: 'S'})
// }

function getSpawnPoints({spawnPoints}) {
  return spawnPoints.map(spawnPoint => {
      // console.log(`spawn point at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${spawnPoint.Latitude}+${spawnPoint.Longitude}&ll=${spawnPoint.Latitude}+${spawnPoint.Longitude}">${spawnPoint.Latitude},${spawnPoint.Longitude}</a>`)
      return {
        type: 'spawnPoint',
        latitude: spawnPoint.Latitude,
        longitude: spawnPoint.Longitude,
        color: 'green',
        label: 'S'
      }
  })
}

function getDecimatedSpawnPoints({decimatedSpawnPoints}) {
  return decimatedSpawnPoints.map(decimatedSpawnPoint => {
      // console.log(`decimated spawn point at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${decimatedSpawnPoint.Latitude}+${decimatedSpawnPoint.Longitude}&ll=${decimatedSpawnPoint.Latitude}+${decimatedSpawnPoint.Longitude}">${decimatedSpawnPoint.Latitude},${decimatedSpawnPoint.Longitude}</a>`)
      return {
        type: 'decimatedSpawnPoint',
        latitude: decimatedSpawnPoint.Latitude,
        longitude: decimatedSpawnPoint.Longitude,
        color: 'brown',
        label: 'D'
      }
  })
}

function getGyms({gyms}) {
  return gyms.map(gym => {
      // console.log(`gym at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${gym.Latitude}+${gym.Longitude}&ll=${gym.Latitude}+${gym.Longitude}">${gym.Latitude},${gym.Longitude}</a>`)
      return {
        type: 'gym',
        latitude: gym.Latitude,
        longitude: gym.Longitude,
        color: 'black',
        label: 'G'
      }
  })
}

function getPokeStops({pokeStops}) {
  return pokeStops.map(pokestop => {
      // console.log(pokestop)
      return {
        type: 'pokeStop',
        latitude: pokestop.Latitude,
        longitude: pokestop.Longitude,
        color: 'white',
        label: 'P'
      }
  })
}

function getWildPokemon ({wildPokemons}) {
  return wildPokemons.map(wildPokemon => {
      const pokedexInfo = getPokedexInfo({pokemonId: wildPokemon.pokemon.PokemonId})
      console.log(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${wildPokemon.Latitude}+${wildPokemon.Longitude}&ll=${wildPokemon.Latitude}+${wildPokemon.Longitude}">${wildPokemon.Latitude},${wildPokemon.Longitude}</a>. You have ${millisecondsToTime(wildPokemon.TimeTillHiddenMs)} to catch it.`)

      return {
        type: 'wildPokemon',
        latitude: wildPokemon.Latitude,
        longitude: wildPokemon.Longitude,
        color: 'blue',
        label: 'M'
      }
    })
}

// How is this different to WildPokemon?
function getMapPokemon({mapPokemons}) {
  return mapPokemons.map(mapPokemon => {
      const pokedexInfo = getPokedexInfo({pokemonId: mapPokemon.PokedexTypeId})
      const expiresTime = new Date(parseInt(mapPokemon.ExpirationTimeMs.toString()))
      // console.log(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${mapPokemon.Latitude}+${mapPokemon.Longitude}&ll=${mapPokemon.Latitude}+${mapPokemon.Longitude}">${mapPokemon.Latitude},${mapPokemon.Longitude}</a>. You have until ${expiresTime}.`)
      const markerIcon = `http://icons.iconarchive.com/icons/hektakun/pokedexInfo/48/${pokedexInfo.num}-${pokedexInfo.name}-icon.png`

      return {
        type: 'mapPokemon',
        latitude: mapPokemon.Latitude,
        longitude: mapPokemon.Longitude,
        color: 'blue',
        label: 'M',
        icon: markerIcon
      }
  })
}

function getNearbyPokemon({nearbyPokemons}) {
  return nearbyPokemons.map(nearbyPokemon => {
      const pokedexInfo = getPokedexInfo({pokemonId: nearbyPokemon.PokedexNumber})
      // const expiresTime = new Date(parseInt(nearbyPokemon.ExpirationTimeMs.toString()))
      // console.log(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> ${nearbyPokemon.DistanceMeters}m away.`)

      return {
        type: 'nearbyPokemon',
        distance: nearbyPokemon.DistanceMeters,
        color: 'blue',
        label: 'N'
      }
    })
  }

function walkNeighboringCells({neighboringCells, attemptToCatch = false}) {
  const pokemonLocations = []
  neighboringCells.reduce(cell => {
    const {lat, lng} = getCellCenterLatLng({cell})
    const nextLocation = {
      type: 'coords',
      coords: {
        latitude: lat,
        longitude: lng
      }
    }
    console.log(`Walking to ${lat},${lng}`)
    return pokeIo.SetLocation(nextLocation)
    .then(coordinates => {
      console.log('I\'m here!', coordinates)
      return pokeIo.Heartbeat(1)
      .then(heartbeat => {
          const wildPokemonFound = getWildPokemon({wildPokemons: cell.WildPokemon})
          console.log(wildPokemonFound)
          pokemonLocations.push(...wildPokemonFound)

          if(attemptToCatch) {
            wildPokemonFound.forEach(pokemon => {
              const pokedexInfo = getPokedexInfo({pokemonId: pokemon.pokemon.PokemonId})
              console.log(`Found a ${pokedexInfo.name}! Attempting to catch...`)
              catchPokemon({pokemon})
            })
          }
      })
    })
  }, Promise.resolve())
  .then(() => {
    return pokemonLocations
  })
}

function catchPokemon({pokemon}) {
  const pokedexInfo = getPokedexInfo({pokemonId: wildPokemon.pokemon.PokemonId})
  return pokeIo.EncounterPokemon(pokemon)
  .then(encounterPokemonResponse => {
      console.log(`Encountering pokemon ${pokedexInfo.name}...`)
      const normalizedHitPosition = 1
      const normalizedReticleSize = 1.950
      const spinModifier = 1
      const pokeball = 1

      return pokeIo.CatchPokemon(pokemon, normalizedHitPosition, normalizedReticleSize, spinModifier, pokeball)
      .then(catchPokemonResponse => {
          const status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
          console.log(status[catchPokemonResponse.Status]);
          console.log(catchPokemonResponse)
      })
  })
}

module.exports.searchCurrentLocation = function searchCurrentLocation({centerLocation, distance = 20}) {
    const currentCoords = pokeIo.GetLocationCoords()
    console.log(`searching ${currentCoords.latitude},${currentCoords.longitude}`)

    return pokeIo.Heartbeat(distance)
    .then(heartbeat => {
        const pointsOfInterstMarkers = [centerLocation.coords]
        const neighboringCells = []

        heartbeat.cells.forEach(cell => {
            printCellData({cell, ignore: ['S2CellId', 'AsOfTimeMs', 'IsTruncatedList', 'SpawnPoint', 'DecimatedSpawnPoint', 'Fort', 'WildPokemon', 'MapPokemon', 'NearbyPokemon']})
            const gymForts = cell.Fort.filter(fort => fort.FortType === null)
            const pokeStopForts = cell.Fort.filter(fort => fort.FortType === 1)

            const spawnPoints = getSpawnPoints({spawnPoints: cell.SpawnPoint})
            const decimatedSpawnPoints = getDecimatedSpawnPoints({decimatedSpawnPoints: cell.DecimatedSpawnPoint})
            const gyms = getGyms({gyms: gymForts})
            const pokeStops = getPokeStops({pokeStops: pokeStopForts})
            const wildPokemon = getWildPokemon({wildPokemons: cell.WildPokemon})
            // const mapPokemon = getMapPokemon({mapPokemons: cell.MapPokemon})
            const nearbyPokemon = getNearbyPokemon({nearbyPokemons: cell.NearbyPokemon}) // can't usefully map these as they do not have lat/lng - best you can do is map based on cell location and show distance
            pointsOfInterstMarkers.push(...spawnPoints, ...decimatedSpawnPoints, ...gyms, ...pokeStops, ...wildPokemon)
            const s2CellId = new s2Geo.S2CellId(cell.S2CellId.toString())
            const s2Cell = new s2Geo.S2Cell(s2CellId);
            neighboringCells.push(s2Cell)
        });

        const markersQueryStrings = '&markers=' + pointsOfInterstMarkers.map((poi, index) => {
          const icon = poi.icon ? `icon:${poi.icon}|` : ''
          const label = poi.label ? `label:${poi.label}|` : ''
          const color = poi.color ? `color:${poi.color}|` : ''
          const coords = `${poi.latitude},${poi.longitude}`
          return `${icon}${label}${color}${coords}`
        }).join('&markers=')
        const pointsOfInterestMapUrl = `http://maps.google.com/maps/api/staticmap?center=${centerLocation.coords.latitude}+${centerLocation.coords.longitude}&zoom=15&size=1024x1024&maptype=terrain${markersQueryStrings}`
        const cellMarkersQueryStrings = '&markers=' + neighboringCells.map((cell, index) => {
          const {lat, lng} = getCellCenterLatLng({cell})
          const coords = `${lat},${lng}`
          return `${coords}`
        }).join('&markers=')
        const cellsMapUrl = `http://maps.google.com/maps/api/staticmap?center=${centerLocation.coords.latitude}+${centerLocation.coords.longitude}&zoom=15&size=1024x1024&maptype=terrain${cellMarkersQueryStrings}`

        return {
          pokemonSightings: [],
          pointsOfInterestMapUrl,
          neighboringCells,
          cellsMapUrl,
          spawnPoints,
          decimatedSpawnPoints,
          gyms,
          pokeStops,
          wildPokemon,
          // mapPokemon,
          nearbyPokemon
        }
    })

    function getCellCenterLatLng({cell}) {
      const s2CellCenter = cell.getCenter();
      const s2CellCenterLatLng = new s2Geo.S2LatLng(s2CellCenter)
      // NOTE: latLng.lat|lng is not implemented by lib yet
      const [lat,lng] = s2CellCenterLatLng.toString().split(',')

      return {lat, lng}
    }

module.exports.scanForPokemon = function scanForPokemon({centerLocation, distance = 20}) {
      console.log('Scanning for pokemon...')
      return searchCurrentLocation({centerLocation, distance})
      .then(({neighboringCells}) => {
        console.log(neighboringCells)
        return walkNeighboringCells({neighboringCells, attemptToCatch: true})
      })
      .then(pokemonLocations => {
        console.log(pokemonLocations)
        return pokemonLocations
      })
    }
    console.log(scanForPokemon)

    // const COORD_INCREMENTER = 0.001
    // const nextLocation = {
    //   type: 'coords',
    //   coords: {
    //     latitude: currentCoords.latitude + COORD_INCREMENTER,
    //     longitude: currentCoords.longitude + COORD_INCREMENTER
    //   }
    // }

    // pokeIo.SetLocation(nextLocation)
    // .then(coordinates => {
    //  setTimeout(searchCurrentLocation, 10000)
    // })
}
