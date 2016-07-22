'use strict';

var Pokeio = require('pokemon-go-node-api/poke.io');
var s2 = require('s2geometry-node');
const GOOGLE_MAPS_ZOOM = 17.5

function init({username, password, centerLocation, provider, initCallback, heartbeatCallback}) {
  Pokeio.init(username, password, centerLocation, provider, function(err) {
      if (err) return initCallback(err);

      console.log('[i] Current location: ' + Pokeio.playerInfo.locationName);
      console.log('[i] lat/long/alt: : ' + Pokeio.playerInfo.latitude + ' ' + Pokeio.playerInfo.longitude + ' ' + Pokeio.playerInfo.altitude);

      Pokeio.GetProfile(function(err, profile) {
          if (err) return initCallback(err);

          console.log('[i] Username: ' + profile.username);
          console.log('[i] Poke Storage: ' + profile.poke_storage);
          console.log('[i] Item Storage: ' + profile.item_storage);

          var poke = 0;
          if (profile.currency[0].amount) {
              poke = profile.currency[0].amount;
          }

          console.log('[i] Pokecoin: ' + poke);
          console.log('[i] Stardust: ' + profile.currency[1].amount);

          function search() {
              const currentCoords = Pokeio.GetLocationCoords()
              console.log(`searching ${currentCoords.latitude},${currentCoords.longitude}`)

              Pokeio.Heartbeat(function(err, heartbeat) {
                  if (err) return heartbeatCallback(err)
                  const pointsOfInterstMarkers = [/*{
                    latitude: centerLocation.coords.latitude,
                    longitude: centerLocation.coords.longitude,
                    color: 'red'
                  }*/]

                  heartbeat.cells.forEach(cell => {
                      // console.log(cell.S2CellId)
                      // const a = new s2.S2CellId(cell.S2CellId.toString())
                      // console.log(a)
                      // Object.keys(cell)
                      // .forEach(key => {
                      //   const cellValue = cell[key]
                      //
                      //   if(Array.isArray(cellValue) && cellValue.length) {
                      //     console.log(key, cellValue)
                      //   }
                      // })
                      // console.log(cell)
                      const spawnPoints = cell.SpawnPoint
                      spawnPoints.forEach(spawnPoint => {
                          // console.log(`spawn point at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${spawnPoint.Latitude}+${spawnPoint.Longitude}&ll=${spawnPoint.Latitude}+${spawnPoint.Longitude}">${spawnPoint.Latitude},${spawnPoint.Longitude}</a>`)
                          pointsOfInterstMarkers.push({
                            latitude: spawnPoint.Latitude,
                            longitude: spawnPoint.Longitude,
                            color: 'green',
                            label: 'S'
                          })
                      })
                      const decimatedSpawnPoints = cell.DecimatedSpawnPoint
                      decimatedSpawnPoints.forEach(spawnPoint => {
                          // console.log(`decimated spawn point at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${spawnPoint.Latitude}+${spawnPoint.Longitude}&ll=${spawnPoint.Latitude}+${spawnPoint.Longitude}">${spawnPoint.Latitude},${spawnPoint.Longitude}</a>`)
                          pointsOfInterstMarkers.push({
                            latitude: spawnPoint.Latitude,
                            longitude: spawnPoint.Longitude,
                            color: 'brown',
                            label: 'D'
                          })
                      })
                      const gyms = cell.Fort.filter(fort => fort.FortType === null)
                      gyms.forEach(gym => {
                          // console.log(`gym at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${gym.Latitude}+${gym.Longitude}&ll=${gym.Latitude}+${gym.Longitude}">${gym.Latitude},${gym.Longitude}</a>`)
                          pointsOfInterstMarkers.push({
                            latitude: gym.Latitude,
                            longitude: gym.Longitude,
                            color: 'black',
                            label: 'G'
                          })
                      })

                      const pokeStops = cell.Fort.filter(fort => fort.FortType === 1)
                      pokeStops.forEach(pokestop => {
                          console.log(pokestop)
                          pointsOfInterstMarkers.push({
                            latitude: pokestop.Latitude,
                            longitude: pokestop.Longitude,
                            color: 'white',
                            label: 'P'
                          })
                      })

                      const wildPokemons = cell.WildPokemon
                      wildPokemons.forEach(wildPokemon => {
                          const pokemon = Pokeio.pokemonlist[parseInt(wildPokemon.pokemon.PokemonId) - 1]
                          console.log(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokemon.num}.shtml">${pokemon.name}</a> at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${wildPokemon.Latitude}+${wildPokemon.Longitude}&ll=${wildPokemon.Latitude}+${wildPokemon.Longitude}">${wildPokemon.Latitude},${wildPokemon.Longitude}</a>. You have ${wildPokemon.TimeTillHiddenMs}ms.`)
                          //
                          // pointsOfInterstMarkers.push({
                          //   latitude: wildPokemon.Latitude,
                          //   longitude: wildPokemon.Longitude,
                          //   color: 'blue',
                          //   label: 'W'
                          // })
                        })
                      const nearbyPokemons = cell.NearbyPokemon
                      nearbyPokemons.forEach(nearbyPokemon => {
                          const pokemon = Pokeio.pokemonlist[parseInt(nearbyPokemon.PokedexNumber) - 1]
                          // const expiresTime = new Date(parseInt(nearbyPokemon.ExpirationTimeMs.toString()))
                          console.log(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokemon.num}.shtml">${pokemon.name}</a> ${nearbyPokemon.DistanceMeters}m away.`)
                          //
                          // pointsOfInterstMarkers.push({
                          //   latitude: nearbyPokemon.Latitude,
                          //   longitude: nearbyPokemon.Longitude,
                          //   color: 'blue',
                          //   label: 'N'
                          // })
                        })
                      const mapPokemons = cell.MapPokemon
                      mapPokemons.forEach(mapPokemon => {
                          const pokemon = Pokeio.pokemonlist[parseInt(mapPokemon.PokedexTypeId) - 1]
                          const expiresTime = new Date(parseInt(mapPokemon.ExpirationTimeMs.toString()))
                          console.log(`There is a <a href="http://www.serebii.net/pokedex-xy/${pokemon.num}.shtml">${pokemon.name}</a> at <a href="http://maps.google.com/maps?&z=${GOOGLE_MAPS_ZOOM}&q=${mapPokemon.Latitude}+${mapPokemon.Longitude}&ll=${mapPokemon.Latitude}+${mapPokemon.Longitude}">${mapPokemon.Latitude},${mapPokemon.Longitude}</a>. You have until ${expiresTime}.`)
                          const markerIcon = `http://icons.iconarchive.com/icons/hektakun/pokemon/48/${pokemon.num}-${pokemon.name}-icon.png`

                          pointsOfInterstMarkers.push({
                            latitude: mapPokemon.Latitude,
                            longitude: mapPokemon.Longitude,
                            color: 'blue',
                            label: 'M',
                            icon: markerIcon
                          })
                          return

                          // NOT READY YET
                          const catchablePokemon = mapPokemon
                          Pokeio.EncounterPokemon(catchablePokemon, (error, encounterPokemonResponse) => {
                              if (error) throw error
                              console.log(encounterPokemonResponse)
                              const normalizedHitPosition = 1
                              const normalizedReticleSize = 1
                              const spinModifier = 1
                              const pokeball = 1
                              Pokeio.CatchPokemon(mapPokemon, normalizedHitPosition, normalizedReticleSize, spinModifier, pokeball, (error, catchPokemonResponse) => {
                                  if (error) throw error
                                  console.log(catchPokemonResponse)
                              })
                          })
                      })
                  });

                  const markersQueryStrings = '&markers=' + pointsOfInterstMarkers.map((poi, index) => {
                    const icon = poi.icon ? `icon:${poi.icon}|` : ''
                    const label = poi.label ? `label:${poi.label}|` : ''
                    const color = poi.color ? `color:${poi.color}|` : ''
                    const coords = `${poi.latitude},${poi.longitude}`
                    return `${icon}${label}${color}${coords}`
                  }).join('&markers=')

                  const pointsOfInterestMapUrl = `http://maps.google.com/maps/api/staticmap?center=${centerLocation.coords.latitude}+${centerLocation.coords.longitude}&zoom=15&size=1024x1024&maptype=terrain${markersQueryStrings}`
                  // console.log(`Points of interest: <a href="${pointsOfInterestMapUrl}"><img src="${pointsOfInterestMapUrl}" /></a>`)

                  heartbeatCallback(null, {pokemonSightings: [], pointsOfInterestMapUrl})
              })

              // const COORD_INCREMENTER = 0.001
              // const nextLocation = {
              //   type: 'coords',
              //   coords: {
              //     latitude: currentCoords.latitude + COORD_INCREMENTER,
              //     longitude: currentCoords.longitude + COORD_INCREMENTER
              //   }
              // }

              // Pokeio.SetLocation(nextLocation, (error, coordinates) => {
              // if(error) throw error
              // setTimeout(search, 10000)
              // })
          }
          search()
          setInterval(search, 10000)

      });
  });
}

module.exports.init = init
