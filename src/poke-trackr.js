const promisify = require('promisify-node')
const PokemonGo = require('pokemon-go-node-api/poke.io')
const s2Geo = require('s2geometry-node')
const async = require('async')
const winston = require('winston')
winston.level = 'info'

const DEFAULT_MAP_ZOOM_LEVEL = 15
const DEFAULT_WALK_DISTANCE = 0.0009
const TEAMS = ['Neutral', 'Blue', 'Red', 'Yellow']

function getUser({username, password, provider}){
  const pokeIo = new PokemonGo.Pokeio()
  const user = promisify(pokeIo, undefined, true)
  function init({centerLocation}) {
    return user.init(username, password, centerLocation, provider)
    .then(() => {
        winston.info(`Current location ${user.playerInfo.locationName}`)
        winston.info(`latitude/longitude: ${user.playerInfo.latitude},${user.playerInfo.longitude}`)

        return user.GetProfile()
        .then(profile => {
            const pokeCoin = profile.currency[0].amount || 0;
            const starDust = profile.currency[1].amount || 0;

            winston.info(`Username: ${profile.username}`)
            winston.info(`Pokemon Storage: ${profile.poke_storage}`)
            winston.info(`Item Storage: ${profile.item_storage}`)
            winston.info(`Pokecoin: ${pokeCoin}`)
            winston.info(`Stardust: ${starDust}`)
        })
    })
  }

  function printCellData({cell, ignore = ['S2CellId', 'AsOfTimeMs', 'IsTruncatedList']}) {
      Object.keys(cell)
      .filter(key => ignore.indexOf(key) === -1)
      .forEach(key => {
        const cellValue = cell[key]

        if(Array.isArray(cellValue)) {
          if(cellValue.length) winston.debug(key, cellValue)
        } else {
          winston.debug(key, cellValue)
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
    return user.pokemonlist[parseInt(pokemonId) - 1]
  }

  // function getCellFacet({facet, color, label}) {
  //   return facet.map(f => {
  //       winston.debug(`spawn point at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${f.Latitude}+${f.Longitude}&ll=${f.Latitude}+${f.Longitude}">${f.Latitude},${f.Longitude}</a>`)
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
        winston.debug(`spawn point at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${spawnPoint.Latitude}+${spawnPoint.Longitude}&ll=${spawnPoint.Latitude}+${spawnPoint.Longitude}">${spawnPoint.Latitude},${spawnPoint.Longitude}</a>`)
        return {
          type: 'spawnPoint',
          latitude: spawnPoint.Latitude,
          longitude: spawnPoint.Longitude,
          color: 'green',
          label: 'S',
          data: spawnPoint
        }
    })
  }

  function getDecimatedSpawnPoints({decimatedSpawnPoints}) {
    return decimatedSpawnPoints.map(decimatedSpawnPoint => {
        winston.debug(`decimated spawn point at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${decimatedSpawnPoint.Latitude}+${decimatedSpawnPoint.Longitude}&ll=${decimatedSpawnPoint.Latitude}+${decimatedSpawnPoint.Longitude}">${decimatedSpawnPoint.Latitude},${decimatedSpawnPoint.Longitude}</a>`)
        return {
          type: 'decimatedSpawnPoint',
          latitude: decimatedSpawnPoint.Latitude,
          longitude: decimatedSpawnPoint.Longitude,
          color: 'brown',
          label: 'D',
          data: decimatedSpawnPoint
        }
    })
  }

  function getGyms({gyms}) {
    return gyms.map(gym => {
        winston.debug(`gym at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${gym.Latitude}+${gym.Longitude}&ll=${gym.Latitude}+${gym.Longitude}">${gym.Latitude},${gym.Longitude}</a>`)
        return {
          type: 'gym',
          latitude: gym.Latitude,
          longitude: gym.Longitude,
          color: 'black',
          label: 'G',
          data: gym
        }
    })
  }

  function getPokeStops({pokeStops}) {
    return pokeStops.map(pokeStop => {
        winston.debug(pokeStop)
        return {
          type: 'pokeStop',
          latitude: pokeStop.Latitude,
          longitude: pokeStop.Longitude,
          color: 'white',
          label: 'P',
          data: pokeStop
        }
    })
  }

  function getWildPokemon ({wildPokemons}) {
    return wildPokemons.map(wildPokemon => {
        const pokedexInfo = getPokedexInfo({pokemonId: wildPokemon.pokemon.PokemonId})
        winston.debug(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${wildPokemon.Latitude}+${wildPokemon.Longitude}&ll=${wildPokemon.Latitude}+${wildPokemon.Longitude}">${wildPokemon.Latitude},${wildPokemon.Longitude}</a>. You have ${millisecondsToTime(wildPokemon.TimeTillHiddenMs)} to catch it.`)
        const markerIcon = `http://icons.iconarchive.com/icons/hektakun/pokemon/48/${pokedexInfo.num}-${pokedexInfo.name}-icon.png`

        return {
          type: 'wildPokemon',
          latitude: wildPokemon.Latitude,
          longitude: wildPokemon.Longitude,
          color: 'blue',
          label: 'M',
          // icon: markerIcon
          data: wildPokemon
        }
      })
  }

  // How is this different to WildPokemon?
  function getMapPokemon({mapPokemons}) {
    return mapPokemons.map(mapPokemon => {
        const pokedexInfo = getPokedexInfo({pokemonId: mapPokemon.PokedexTypeId})
        const expiresTime = new Date(parseInt(mapPokemon.ExpirationTimeMs.toString()))
        winston.debug(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${mapPokemon.Latitude}+${mapPokemon.Longitude}&ll=${mapPokemon.Latitude}+${mapPokemon.Longitude}">${mapPokemon.Latitude},${mapPokemon.Longitude}</a>. You have until ${expiresTime}.`)
        const markerIcon = `http://icons.iconarchive.com/icons/hektakun/pokemon/48/${pokedexInfo.num}-${pokedexInfo.name}-icon.png`

        return {
          type: 'mapPokemon',
          latitude: mapPokemon.Latitude,
          longitude: mapPokemon.Longitude,
          color: 'blue',
          label: 'M',
          icon: markerIcon,
          data: mapPokemon
        }
    })
  }

  function getNearbyPokemon({nearbyPokemons}) {
    return nearbyPokemons.map(nearbyPokemon => {
        const pokedexInfo = getPokedexInfo({pokemonId: nearbyPokemon.PokedexNumber})
        // winston.debug(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> ${nearbyPokemon.DistanceMeters}m away.`)

        return {
          type: 'nearbyPokemon',
          distance: nearbyPokemon.DistanceMeters,
          color: 'blue',
          label: 'N',
          data: nearbyPokemon
        }
      })
    }

  function setLocationAndSearch({centerLocation, numNeighborCells}) {
    return user.SetLocation(centerLocation)
        .then(coordinates => {
          winston.debug(`Moved to ${coordinates.latitude},${coordinates.longitude}`)
          return user.Heartbeat(numNeighborCells)
        })
  }

  // NOTE: not working - getting unexpected cells
  function walkNeighboringCells({centerLocation, neighboringCells, attemptToCatch = false}) {
    const pokemonLocations = []
    const cellsScanned = []

    const steps = neighboringCells.map(cell => {
      return function () {
              const {latitude, longitude} = getCellCenterLatLng({cell})
              const nextLocation = {
                type: 'coords',
                coords: {
                  latitude,
                  longitude
                }
              }

            return setLocationAndSearch({centerLocation: nextLocation, numNeighborCells: 0})
            .then(heartbeat => {
                  const cell = heartbeat.cells[0]
                  cellsScanned.push(getCellFromId(cell.S2CellId))
                  printCellData({cell})
                  const wildPokemonFound = getWildPokemon({wildPokemons: cell.WildPokemon})
                  if(wildPokemonFound.length) {
                    winston.debug(wildPokemonFound)
                    pokemonLocations.push(...wildPokemonFound)
                  }

                  if(attemptToCatch) {
                    wildPokemonFound.forEach(pokemon => {
                      const pokedexInfo = getPokedexInfo({pokemonId: pokemon.pokemon.PokemonId})
                      winston.debug(`Found a ${pokedexInfo.name}! Attempting to catch...`)
                      catchPokemon({pokemon})
                    })
                  }
              })
          }
    })

    return steps.reduce((promise, step) => promise.then(step), Promise.resolve())
    .then(() => {
      return {pokemonLocations, cellsScanned}
    })
  }

  function walkArea({centerLocation, radius, attemptToCatch = false, delta = DEFAULT_WALK_DISTANCE}) {
    const pokemonLocations = []
    const cellsScanned = []
    const latitude = centerLocation.coords.latitude-(radius/2)*delta;
    const longitude = centerLocation.coords.longitude-(radius/2)*delta;
    const coords = [];

    for (let i = 0; i <= radius; i++) {
      for (let j = 0; j <= radius; j++) {
        coords.push({
          latitude: latitude+j*delta,
          longitude: longitude+i*delta
        })
      }
    }

    const steps = coords.map(({latitude, longitude}) => {
      return function () {
          const nextLocation = {
            type: 'coords',
            coords: {
              latitude,
              longitude
            }
          }

        return setLocationAndSearch({centerLocation: nextLocation, numNeighborCells: 0})
        .then(heartbeat => {
            const cell = heartbeat.cells[0]

            cellsScanned.push(getCellFromId(cell.S2CellId))
            printCellData({cell})
            const wildPokemonFound = getWildPokemon({wildPokemons: cell.WildPokemon})
            if(wildPokemonFound.length) {
              pokemonLocations.push(...wildPokemonFound)

              if(attemptToCatch) {
                wildPokemonFound.forEach(wildPokemon => {
                  const pokemon = wildPokemon.data
                  const pokedexInfo = getPokedexInfo({pokemonId: pokemon.pokemon.PokemonId})
                  winston.info(`Found a ${pokedexInfo.name}! Attempting to catch...`)
                  //////////////////////////
                          // console.log('[+] There is a ' + pokedexInfo.name + ' near!! I can try to catch it!');
                          //
                          // user.EncounterPokemon(pokemon)
                          // .then(dat => {
                          //     console.log('Encountering pokemon ' + pokedexInfo.name + '...');
                          //     return user.CatchPokemon(pokemon, 1, 1.950, 1, 1)
                          //     .then(xdat =>  {
                          //         var status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
                          //         console.log(status[xdat.Status]);
                          //     })
                          // })
                          // .catch(e => {
                          //   console.error(e)
                          // });
                  ////////////////////////
                  catchPokemon({pokemon}).then(response => {
                    console.log(response)
                    winston.info(response)
                  }).catch(e => {
                    console.error(e)
                  })
                })
              }
            }
        })
      }
    })

    return steps.reduce((promise, step) => promise.then(step), Promise.resolve())
    .then(() => {
      return {pokemonLocations, coords, cellsScanned}
    })
  }

  function catchPokemon({pokemon}) {
    const pokedexInfo = getPokedexInfo({pokemonId: pokemon.pokemon.PokemonId})
    return user.EncounterPokemon(pokemon)
    .then(encounterPokemonResponse => {
        winston.info(`Encountering pokemon ${pokedexInfo.name}...`)
        const normalizedHitPosition = 1
        const normalizedReticleSize = 1.950
        const spinModifier = 1
        const pokeball = 1

        return user.CatchPokemon(pokemon, normalizedHitPosition, normalizedReticleSize, spinModifier, pokeball)
        .then(catchPokemonResponse => {
            const status = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch'];
            winston.debug('catchPokemonResponseStatus', status[catchPokemonResponse.Status]);
            winston.debug('catchPokemonResponse', catchPokemonResponse)
        })
    })
  }

  function searchCurrentLocation({centerLocation, numNeighborCells = 20, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL}) {
      const currentCoords = user.GetLocationCoords()
      winston.debug(`searching ${currentCoords.latitude},${currentCoords.longitude} and ${numNeighborCells} neighboring cells`)

      return user.Heartbeat(numNeighborCells)
      .then(heartbeat => {

          const neighboringCells = []
          const spawnPoints = []
          const decimatedSpawnPoints = []
          const gyms = []
          const pokeStops = []
          const wildPokemon = []
          // const mapPokemon = []
          const nearbyPokemon = []
          heartbeat.cells.forEach(cell => {
              printCellData({cell, ignore: ['S2CellId', 'AsOfTimeMs', 'IsTruncatedList', 'SpawnPoint', 'DecimatedSpawnPoint', 'Fort', 'WildPokemon', 'MapPokemon', 'NearbyPokemon']})
              const gymForts = cell.Fort.filter(fort => fort.FortType === null)
              const pokeStopForts = cell.Fort.filter(fort => fort.FortType === 1)

              const cellSpawnPoints = getSpawnPoints({spawnPoints: cell.SpawnPoint})
              const cellDecimatedSpawnPoints = getDecimatedSpawnPoints({decimatedSpawnPoints: cell.DecimatedSpawnPoint})
              const cellGyms = getGyms({gyms: gymForts})
              const cellPokeStops = getPokeStops({pokeStops: pokeStopForts})
              const cellWildPokemon = getWildPokemon({wildPokemons: cell.WildPokemon})
              // const cellMapPokemon = getMapPokemon({mapPokemons: cell.MapPokemon})
              const cellNearbyPokemon = getNearbyPokemon({nearbyPokemons: cell.NearbyPokemon}) // can't usefully map these as they do not have latitude/longitude - best you can do is map based on cell location and show distance

              if(cellSpawnPoints.length) spawnPoints.push(cellSpawnPoints)
              if(cellDecimatedSpawnPoints.length) spawnPoints.push(cellDecimatedSpawnPoints)
              if(cellGyms.length) spawnPoints.push(cellGyms)
              if(cellPokeStops.length) spawnPoints.push(cellPokeStops)
              if(cellWildPokemon.length) spawnPoints.push(cellWildPokemon)
              // if(cellMapPokemon.length) spawnPoints.push(cellMapPokemon)
              if(cellNearbyPokemon.length) spawnPoints.push(cellNearbyPokemon)

              const s2Cell = getCellFromId(cell.S2CellId)
              neighboringCells.push(s2Cell)
          });

          const pointsOfInterest = [centerLocation.coords, ...spawnPoints, ...decimatedSpawnPoints, ...gyms, ...pokeStops, ...wildPokemon]

          return {
            pokemonSightings: [],
            pointsOfInterest,
            neighboringCells,
            spawnPoints,
            decimatedSpawnPoints,
            gyms,
            pokeStops,
            wildPokemon,
            // mapPokemon,
            nearbyPokemon
          }
      })
  }

  function getCellFromId(cellId) {
      const s2CellId = new s2Geo.S2CellId(cellId.toString())
      const cell = new s2Geo.S2Cell(s2CellId);

      return cell
  }

  function getStaticMapUrl({centerLocation, markers, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL}) {
      const markersQueryStrings = '&markers=' + markers.map((poi, index) => {
        const icon = poi.icon ? `icon:${poi.icon}|` : ''
        const label = poi.label ? `label:${poi.label}|` : ''
        const color = poi.color ? `color:${poi.color}|` : ''
        const coords = `${poi.latitude},${poi.longitude}`
        return `${icon}${label}${color}${coords}`
      }).join('&markers=')
      return `http://maps.google.com/maps/api/staticmap?center=${centerLocation.coords.latitude}+${centerLocation.coords.longitude}&zoom=${mapZoomLevel}&size=1024x1024&maptype=terrain${markersQueryStrings}`
  }

  function getCellsMapUrl({centerLocation, cells, includeCenterLocation = true, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL}) {
    const markers = cells.map(cell => getCellCenterLatLng({cell}))

    if(includeCenterLocation) {
      markers.push(centerLocation.coords)
    }

    return getStaticMapUrl({centerLocation, markers, mapZoomLevel})
  }

  function getDirectionMapUrl({latitude, longitude}) {
    return `https://www.google.com/maps/dir/Current+Location/${latitude},${longitude}`
  }


  function getDistanceBetweenPoints({point1, point2}){
      return GeoLib.getDistance({
        latitude: point1.latitude,
        longitude: point1.longitude
      }, {
        latitude: point2.latitude,
        longitude: point2.longitude
      })
    }

  function getCellCenterLatLng({cell}) {
    const s2CellCenter = cell.getCenter();
    const s2CellCenterLatLng = new s2Geo.S2LatLng(s2CellCenter)
    // NOTE: latLng.latitude|longitude is not implemented by lib yet
    const [latitude,longitude] = s2CellCenterLatLng.toString().split(',')

    return {latitude: parseFloat(latitude), longitude: parseFloat(longitude)}
  }

  function scanForPokemon({centerLocation, radius = 8, numNeighborCells = 20, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL, attemptToCatch, method = 'WALK'}) {
    winston.info('Scanning for pokemon...')
    const scan = searchCurrentLocation({centerLocation, numNeighborCells, mapZoomLevel})

    switch(method) {
      case 'CELLS':
        return scan.then(({neighboringCells}) => walkNeighboringCells({centerLocation, neighboringCells, mapZoomLevel, attemptToCatch}))
      default:
        return scan.then(({neighboringCells}) => walkArea({centerLocation, radius, mapZoomLevel, attemptToCatch}))
    }
  }

  return {user, init, searchCurrentLocation, scanForPokemon, setLocationAndSearch, getStaticMapUrl, getCellsMapUrl, getPokedexInfo}
}


module.exports = {getUser}
