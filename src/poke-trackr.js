const promisify = require('promisify-node')
const PokemonGo = require('pokemon-go-node-api/poke.io')
const s2Geo = require('s2-geometry').S2
const async = require('async')
const Log = require('log')
const logLevel = 'info'
const log = console//new Log('logLevel')
log.debug = (...params) => {
  if(logLevel === 'debug') {
    return console.log(...params)
  }
}

log.info('logger works!')
const DEFAULT_MAP_ZOOM_LEVEL = 15
const DEFAULT_WALK_DISTANCE = 0.0009
const TEAMS = ['Neutral', 'Blue', 'Red', 'Yellow']
const ITEM_NAME_TO_ID_MAP = {
      ITEM_UNKNOWN: 0,
      ITEM_POKE_BALL: 1,
      ITEM_GREAT_BALL: 2,
      ITEM_ULTRA_BALL: 3,
      ITEM_MASTER_BALL: 4,
      ITEM_POTION: 101,
      ITEM_SUPER_POTION: 102,
      ITEM_HYPER_POTION: 103,
      ITEM_MAX_POTION: 104,
      ITEM_REVIVE: 201,
      ITEM_MAX_REVIVE: 202,
      ITEM_LUCKY_EGG: 301,
      ITEM_INCENSE_ORDINARY: 401,
      ITEM_INCENSE_SPICY: 402,
      ITEM_INCENSE_COOL: 403,
      ITEM_INCENSE_FLORAL: 404,
      ITEM_TROY_DISK: 501,
      ITEM_X_ATTACK: 602,
      ITEM_X_DEFENSE: 603,
      ITEM_X_MIRACLE: 604,
      ITEM_RAZZ_BERRY: 701,
      ITEM_BLUK_BERRY: 702,
      ITEM_NANAB_BERRY: 703,
      ITEM_WEPAR_BERRY: 704,
      ITEM_PINAP_BERRY: 705,
      ITEM_SPECIAL_CAMERA: 801,
      ITEM_INCUBATOR_BASIC_UNLIMITED: 901,
      ITEM_INCUBATOR_BASIC: 902,
      ITEM_POKEMON_STORAGE_UPGRADE: 1001,
      ITEM_ITEM_STORAGE_UPGRADE: 1002,
}
const ITEM_ID_TO_NAME_MAP = {
      0: 'ITEM_UNKNOWN',
      1: 'ITEM_POKE_BALL',
      2: 'ITEM_GREAT_BALL',
      3: 'ITEM_ULTRA_BALL',
      4: 'ITEM_MASTER_BALL',
      101: 'ITEM_POTION',
      102: 'ITEM_SUPER_POTION',
      103: 'ITEM_HYPER_POTION',
      104: 'ITEM_MAX_POTION',
      201: 'ITEM_REVIVE',
      202: 'ITEM_MAX_REVIVE',
      301: 'ITEM_LUCKY_EGG',
      401: 'ITEM_INCENSE_ORDINARY',
      402: 'ITEM_INCENSE_SPICY',
      403: 'ITEM_INCENSE_COOL',
      404: 'ITEM_INCENSE_FLORAL',
      501: 'ITEM_TROY_DISK',
      602: 'ITEM_X_ATTACK',
      603: 'ITEM_X_DEFENSE',
      604: 'ITEM_X_MIRACLE',
      701: 'ITEM_RAZZ_BERRY',
      702: 'ITEM_BLUK_BERRY',
      703: 'ITEM_NANAB_BERRY',
      704: 'ITEM_WEPAR_BERRY',
      705: 'ITEM_PINAP_BERRY',
      801: 'ITEM_SPECIAL_CAMERA',
      901: 'ITEM_INCUBATOR_BASIC_UNLIMITED',
      902: 'ITEM_INCUBATOR_BASIC',
      1001: 'ITEM_POKEMON_STORAGE_UPGRADE',
      1002: 'ITEM_ITEM_STORAGE_UPGRADE'
}
const CATCH_POKEMON_STATUS = ['Unexpected error', 'Successful catch', 'Catch Escape', 'Catch Flee', 'Missed Catch']
const SEARCH_POKE_STOPS_STATUS = ['No result set', 'Success', 'Out of range', 'In cooldown period', 'Inventory full']
function getUser({username, password, provider}){
  const pokeIo = new PokemonGo.Pokeio()
  const user = promisify(pokeIo, undefined, true)
  function init({centerLocation}) {
    function retryableInit() {
      return user.init(username, password, centerLocation, provider)
      .then(() => {
        console.log('yea')
          log.info(`Current location ${user.playerInfo.locationName}`)
          log.info(`latitude/longitude: ${user.playerInfo.latitude},${user.playerInfo.longitude}`)

          return user.GetProfile()
          .then(profile => {
              const pokeCoin = profile.currency[0].amount || 0;
              const starDust = profile.currency[1].amount || 0;
  console.log('ingetprofile')
              log.info(`Username: ${profile.username}`)
              log.info(`Pokemon Storage: ${profile.poke_storage}`)
              log.info(`Item Storage: ${profile.item_storage}`)
              log.info(`Pokecoin: ${pokeCoin}`)
              log.info(`Stardust: ${starDust}`)
          }).catch(e => {
            console.log(e)
          })
      })
      .catch((e) => {
        console.log(e)
        console.log('error on init...')
        log.info(e)
        log.info('Error on init; retyring')
        return retryableInit()
      })
    }

    return retryableInit()
  }

  function printCellData({cell, ignore = ['S2CellId', 'AsOfTimeMs', 'IsTruncatedList']}) {
    return
      Object.keys(cell)
      .filter(key => ignore.indexOf(key) === -1)
      .forEach(key => {
        const cellValue = cell[key]
        if(Array.isArray(cellValue)) {
          if(cellValue.length) log.debug(key, cellValue)
        } else {
          log.debug(key, cellValue)
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
  //       log.debug(`spawn point at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${f.Latitude}+${f.Longitude}&ll=${f.Latitude}+${f.Longitude}">${f.Latitude},${f.Longitude}</a>`)
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
        log.debug(`spawn point at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${spawnPoint.Latitude}+${spawnPoint.Longitude}&ll=${spawnPoint.Latitude}+${spawnPoint.Longitude}">${spawnPoint.Latitude},${spawnPoint.Longitude}</a>`)
        return {
          data: spawnPoint,
          marker: {
            type: 'spawnPoint',
            latitude: spawnPoint.Latitude,
            longitude: spawnPoint.Longitude,
            color: 'green',
            label: 'S'
          }
        }
    })
  }

  function getDecimatedSpawnPoints({decimatedSpawnPoints}) {
    return decimatedSpawnPoints.map(decimatedSpawnPoint => {
        log.debug(`decimated spawn point at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${decimatedSpawnPoint.Latitude}+${decimatedSpawnPoint.Longitude}&ll=${decimatedSpawnPoint.Latitude}+${decimatedSpawnPoint.Longitude}">${decimatedSpawnPoint.Latitude},${decimatedSpawnPoint.Longitude}</a>`)
        return {
          data: decimatedSpawnPoint,
          marker: {
            type: 'decimatedSpawnPoint',
            latitude: decimatedSpawnPoint.Latitude,
            longitude: decimatedSpawnPoint.Longitude,
            color: 'brown',
            label: 'D'
          }
        }
    })
  }

  function getGyms({gyms}) {
    return gyms.map(gym => {
        log.debug(`gym at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${gym.Latitude}+${gym.Longitude}&ll=${gym.Latitude}+${gym.Longitude}">${gym.Latitude},${gym.Longitude}</a>`)
        return {
          data: gym,
          marker: {
            type: 'gym',
            latitude: gym.Latitude,
            longitude: gym.Longitude,
            color: 'black',
            label: 'G'
          }
        }
    })
  }

  function getPokeStops({pokeStops}) {
    return pokeStops.map(pokeStop => {
        log.debug(`pokeStop at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${pokeStop.Latitude}+${pokeStop.Longitude}&ll=${pokeStop.Latitude}+${pokeStop.Longitude}">${pokeStop.Latitude},${pokeStop.Longitude}</a>`)
        return {
          data: pokeStop,
          marker: {
            type: 'pokeStop',
            latitude: pokeStop.Latitude,
            longitude: pokeStop.Longitude,
            color: 'white',
            label: 'P'
          }
        }
    })
  }

  function getWildPokemon ({wildPokemons}) {
    return wildPokemons.map(wildPokemon => {
        const pokedexInfo = getPokedexInfo({pokemonId: wildPokemon.pokemon.PokemonId})
        log.debug(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${wildPokemon.Latitude}+${wildPokemon.Longitude}&ll=${wildPokemon.Latitude}+${wildPokemon.Longitude}">${wildPokemon.Latitude},${wildPokemon.Longitude}</a>. You have ${millisecondsToTime(wildPokemon.TimeTillHiddenMs)} to catch it.`)
        const markerIcon = `http://icons.iconarchive.com/icons/hektakun/pokemon/48/${pokedexInfo.num}-${pokedexInfo.name}-icon.png`

        return {
          data: wildPokemon,
          marker: {
            type: 'wildPokemon',
            latitude: wildPokemon.Latitude,
            longitude: wildPokemon.Longitude,
            color: 'blue',
            label: 'M',
            // icon: markerIcon
          }
        }
      })
  }

  // How is this different to WildPokemon?
  function getMapPokemon({mapPokemons}) {
    return mapPokemons.map(mapPokemon => {
        const pokedexInfo = getPokedexInfo({pokemonId: mapPokemon.PokedexTypeId})
        const expiresTime = new Date(parseInt(mapPokemon.ExpirationTimeMs.toString()))
        log.debug(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> at <a href="http://maps.google.com/maps?&z=${DEFAULT_MAP_ZOOM_LEVEL}&q=${mapPokemon.Latitude}+${mapPokemon.Longitude}&ll=${mapPokemon.Latitude}+${mapPokemon.Longitude}">${mapPokemon.Latitude},${mapPokemon.Longitude}</a>. You have until ${expiresTime}.`)
        const markerIcon = `http://icons.iconarchive.com/icons/hektakun/pokemon/48/${pokedexInfo.num}-${pokedexInfo.name}-icon.png`

        return {
          data: mapPokemon,
          marker: {
            type: 'mapPokemon',
            latitude: mapPokemon.Latitude,
            longitude: mapPokemon.Longitude,
            color: 'blue',
            label: 'M',
            icon: markerIcon,
          }
        }
    })
  }

  function getNearbyPokemon({nearbyPokemons}) {
    return nearbyPokemons.map(nearbyPokemon => {
        const pokedexInfo = getPokedexInfo({pokemonId: nearbyPokemon.PokedexNumber})
        // log.debug(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokedexInfo.num}.shtml">${pokedexInfo.name}</a> ${nearbyPokemon.DistanceMeters}m away.`)

        return {
          data: nearbyPokemon,
          marker: {
            type: 'nearbyPokemon',
            distance: nearbyPokemon.DistanceMeters,
            color: 'blue',
            label: 'N',
          }
        }
      })
    }

  function setLocationAndSearch({centerLocation, numNeighborCells}) {
    return user.SetLocation(centerLocation)
      .then(coordinates => {
        // log.info(`Moved to ${coordinates.latitude},${coordinates.longitude}`)
        return user.Heartbeat(/*numNeighborCells*/)
        .catch(e => {
          log.info(e)
          log.info('Error on SetLocation; retrying')
          return setLocationAndSearch({centerLocation, numNeighborCells})
        })
      })
    }

  // NOTE: not working - getting unexpected cells, propbably bug in s2 lib
  // function walkNeighboringCells({centerLocation, neighboringCells, attemptToCatch = false}) {
  //   const pokemonLocations = []
  //   const cellsScanned = []
  //
  //   const steps = neighboringCells.map(cell => {
  //     return function () {
  //             const {latitude, longitude} = getCellCenterLatLng({cell})
  //             const nextLocation = {
  //               type: 'coords',
  //               coords: {
  //                 latitude,
  //                 longitude
  //               }
  //             }
  //
  //           return setLocationAndSearch({centerLocation: nextLocation, numNeighborCells: 0})
  //           .then(heartbeat => {
  //                 const cell = heartbeat.cells[0]
  //                 cellsScanned.push(getCellFromId(cell.S2CellId))
  //                 printCellData({cell})
  //                 const mapPokemonFound = getMapPokemon({mapPokemons: cell.MapPokemon})
  //                 if(mapPokemonFound.length) {
  //                   log.debug(mapPokemonFound)
  //                   pokemonLocations.push(...mapPokemonFound)
  //                 }
  //
  //                 if(attemptToCatch) {
  //                   mapPokemonFound.forEach(pokemon => {
  //                     const pokedexInfo = getPokedexInfo({pokemonId: pokemon.PokedexTypeId})
  //                     log.debug(`Found a ${pokedexInfo.name}! Attempting to catch...`)
  //                     catchPokemon({pokemon})
  //                   })
  //                 }
  //             })
  //         }
  //   })
  //
  //   return steps.reduce((promise, step) => promise.then(step), Promise.resolve())
  //   .then(() => {
  //     return {pokemonLocations, cellsScanned}
  //   })
  // }

  function walkArea({centerLocation, radius, attemptToCatch = false, searchPokeStops = false, delta = DEFAULT_WALK_DISTANCE}) {
    const pokemonLocations = []
    const pokemonCaught = []
    const pokeStopLocations = []
    const pokeStopsSearched = []
    const itemsAwarded = {}
    const cellsScanned = []
    const latitude = centerLocation.coords.latitude-(radius/2)*delta;
    const longitude = centerLocation.coords.longitude-(radius/2)*delta;
    const coordsScanned = [];

    for (let i = 0; i <= radius; i++) {
      for (let j = 0; j <= radius; j++) {
        coordsScanned.push({
          latitude: latitude+j*delta,
          longitude: longitude+i*delta
        })
      }
    }

    const steps = coordsScanned.map(({latitude, longitude}) => {
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
            const cellsWithPokemon = heartbeat.cells.filter(cell => cell.MapPokemon.length)
            cellsWithPokemon.forEach(cell => {
                cellsScanned.push(getCellFromId(cell.S2CellId))
                printCellData({cell})
                const unmappedPokemon = cell.MapPokemon.filter(mapPokemon => {
                  const encounterIds = pokemonLocations.map(pokemonLocation => pokemonLocation.data.EncounterId.toString())
                  return encounterIds.indexOf(mapPokemon.EncounterId.toString()) === -1
                })

                const mapPokemonFound = getMapPokemon({mapPokemons: unmappedPokemon})
                const pokeStopForts = cell.Fort.filter(fort => fort.FortType === 1)
                const pokeStopsFound = getPokeStops({pokeStops: pokeStopForts})

                let catchPokemonPromise = Promise.resolve()
                let searchPokeStopsPromise = Promise.resolve()
                if(mapPokemonFound.length) {
                  pokemonLocations.push(...mapPokemonFound)
                  log.info(`Found ${mapPokemonFound.length} pokemon`)
                  if(attemptToCatch) {
                    const catchPokemonActions = mapPokemonFound.map(mapPoke => {
                      return function() {
                          const pokemon = mapPoke.data
                          const pokedexInfo = getPokedexInfo({pokemonId: pokemon.PokedexTypeId})
                          log.info(`Found a ${pokedexInfo.name}! Attempting to catch...`)
                          return catchPokemon({pokemon})
                            .then(catchPokemonResponse => {
                              if(catchPokemonResponse.Status === 1) {
                                pokemonCaught.push(pokedexInfo.name)
                              }

                              return catchPokemonResponse
                            })
                            .catch(e => {
                              console.error(e)
                            })
                        }
                      })
                    catchPokemonPromise = catchPokemonActions.reduce((promise, catchPokemonAction) => promise.then(catchPokemonAction), Promise.resolve())
                  }
                }

                if(pokeStopsFound.length) {
                  pokeStopLocations.push(...pokeStopsFound)

                  if(searchPokeStops) {
                    const searchPokeStopActions = pokeStopsFound.map(pokeStopFound => {
                      return function() {
                          const waitPromise = new Promise(resolve => {
                            const pokeStop = pokeStopFound.data

                            log.debug(`Found a PokeStop! Attempting to search...`)

                            if(pokeStop.CooldownCompleteMs !== null) {
                              log.debug('pokeStop is on cooldown')
                              return resolve()
                            }

                            return searchFort({fortId: pokeStop.FortId, latitude: pokeStop.Latitude, longitude: pokeStop.Longitude})
                            .then(searchPokeStopResponse => {
                              log.debug('searchPokeStopResponse', searchPokeStopResponse)
                              if(searchPokeStopResponse.result === 1 && searchPokeStopResponse.items_awarded.length) {
                                pokeStopsSearched.push(searchPokeStopResponse)
                                searchPokeStopResponse.items_awarded.forEach(item => {
                                  const itemName = ITEM_ID_TO_NAME_MAP[item.item_id]
                                  itemsAwarded[itemName] = itemsAwarded[itemName] ? itemsAwarded[itemName] + item.item_count : item.item_count
                                })
                              }

                              log.debug('Human wait...')
                              setTimeout(() => resolve(searchPokeStopResponse), 10000)
                              return searchPokeStopResponse
                            })
                          })

                          return waitPromise
                        }
                      })
                      searchPokeStopsPromise = searchPokeStopActions.reduce((promise, searchPokeStopAction) => promise.then(searchPokeStopAction), Promise.resolve())
                  }
              }

              return Promise.all([catchPokemonPromise, searchPokeStopsPromise])
          })
        })
        .catch(e => {
          log.info(e)
          log.info('Error from setLocationAndSearch')
        })
      }
    })

    return steps.reduce((promise, step) => promise.then(step), Promise.resolve())
    .then(() => {
      return {pokemonLocations, pokemonCaught, pokeStopsSearched, itemsAwarded, coordsScanned, cellsScanned}
    })
    .catch(e => {
      log.info(e)
      log.info('Error from steps reduce')
      return e
    })
  }

  function catchPokemon({pokemon}) {
    const pokedexInfo = getPokedexInfo({pokemonId: pokemon.PokedexTypeId})

    return user.EncounterPokemon(pokemon)
    .then(encounterPokemonResponse => {
        log.info(`Encountering pokemon ${pokedexInfo.name}...`)
        const normalizedHitPosition = 1
        const normalizedReticleSize = 1.950
        const spinModifier = 1
        const pokeball = 1

        return user.CatchPokemon(pokemon, normalizedHitPosition, normalizedReticleSize, spinModifier, pokeball)
        .then(catchPokemonResponse => {
            if(catchPokemonResponse.Status === null) {
              log.info(`You either have no pokeballs or pokemon storage is full`)
            } else if(catchPokemonResponse.Status === 1) {
              log.info(`Caught ${pokedexInfo.name}!`)
            } else if(catchPokemonResponse.Status === 3) {
              log.info(`${pokedexInfo.name} ran away! If this keeps happening, you might have been soft-banned...`)
            }

            return catchPokemonResponse
        })
    })
  }

  function searchFort({fortId, latitude, longitude}) {
    log.debug('searching fort', fortId)

    const pokeStopLocation = {
      type: 'coords',
      coords: { latitude, longitude}
    }
    return user.SetLocation(pokeStopLocation)
    .then(() => user.GetFort(fortId, latitude, longitude))
    .then(searchFortResponse => {
      if(searchFortResponse.result === 1 && !searchFortResponse.items_awarded.length) {
        log.info(`Item storage is full, or you've been soft-banned`)
      }
      return searchFortResponse
    })
  }

  function searchCurrentLocation({centerLocation, numNeighborCells = 20, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL}) {
      const currentCoords = user.GetLocationCoords()
      log.debug(`searching ${currentCoords.latitude},${currentCoords.longitude} and ${numNeighborCells} neighboring cells`)

      function retryableHeartbeat() {
        return user.Heartbeat(/*numNeighborCells*/)
        .then(heartbeat => {

            const neighboringCells = []
            const spawnPoints = []
            const decimatedSpawnPoints = []
            const gyms = []
            const pokeStops = []
            const wildPokemon = []
            const mapPokemon = []
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
                const cellMapPokemon = getMapPokemon({mapPokemons: cell.MapPokemon})
                const cellNearbyPokemon = getNearbyPokemon({nearbyPokemons: cell.NearbyPokemon}) // can't usefully map these as they do not have latitude/longitude - best you can do is map based on cell location and show distance

                if(cellSpawnPoints.length) spawnPoints.push(cellSpawnPoints)
                if(cellDecimatedSpawnPoints.length) spawnPoints.push(cellDecimatedSpawnPoints)
                if(cellGyms.length) spawnPoints.push(cellGyms)
                if(cellPokeStops.length) spawnPoints.push(cellPokeStops)
                if(cellWildPokemon.length) spawnPoints.push(cellWildPokemon)
                if(cellMapPokemon.length) spawnPoints.push(cellMapPokemon)
                if(cellNearbyPokemon.length) spawnPoints.push(cellNearbyPokemon)

                const s2Cell = getCellFromId(cell.S2CellId)
                neighboringCells.push(s2Cell)
            });

            const pointsOfInterest = [centerLocation.coords, ...spawnPoints, ...decimatedSpawnPoints, ...gyms, ...pokeStops, ...wildPokemon, ...mapPokemon]

            return {
              pokemonSightings: [],
              pointsOfInterest,
              neighboringCells,
              spawnPoints,
              decimatedSpawnPoints,
              gyms,
              pokeStops,
              wildPokemon,
              mapPokemon,
              nearbyPokemon
            }
        })
        .catch((e) => {
          log.info(e)
          log.info('Error on searchCurrentLocation; retrying')
          return retryableHeartbeat()
        })
      }

      return retryableHeartbeat()
  }

  function getCellFromId(cellId) {
      // const s2CellId = s2Geo.toId(cellId.toString())
      const cell = s2Geo.fromId(cellId.toString());

      return cell
  }

  function getStaticMapUrl({centerLocation, markers, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL}) {
      const markersQueryStrings = '&markers=' + markers.map((poi, index) => {
        const {marker} = poi
        const icon = marker.icon ? `icon:${marker.icon}|` : ''
        const label = marker.label ? `label:${marker.label}|` : ''
        const color = marker.color ? `color:${marker.color}|` : ''
        const coords = `${marker.latitude},${marker.longitude}`
        return `${icon}${label}${color}${coords}`
      }).join('&markers=')
      return `http://maps.google.com/maps/api/staticmap?center=${centerLocation.coords.latitude}+${centerLocation.coords.longitude}&zoom=${mapZoomLevel}&size=1024x1024&maptype=terrain${markersQueryStrings}`
  }

  function getCellsMapUrl({centerLocation, cells, includeCenterLocation = true, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL}) {
    const markers = cells.map(cell => ({marker: getCellCenterLatLng({cell})}))

    if(includeCenterLocation) {
      markers.push({marker: centerLocation.coords})
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

  function scanForPokemon({centerLocation, radius = 8, numNeighborCells = 20, mapZoomLevel = DEFAULT_MAP_ZOOM_LEVEL, attemptToCatch = false, searchPokeStops = false, method = 'WALK'}) {
    log.info('Scanning for pokemon...')
    const scan = searchCurrentLocation({centerLocation, numNeighborCells, mapZoomLevel})

    switch(method) {
      case 'CELLS':
        return scan.then(({neighboringCells}) => walkNeighboringCells({centerLocation, neighboringCells, mapZoomLevel, attemptToCatch, searchPokeStops}))
      default:
        return scan.then(({neighboringCells}) => walkArea({centerLocation, radius, mapZoomLevel, attemptToCatch, searchPokeStops}))
    }
  }

  return {user, init, searchCurrentLocation, scanForPokemon, setLocationAndSearch, getStaticMapUrl, getCellsMapUrl, getPokedexInfo}
}


module.exports = {getUser}
