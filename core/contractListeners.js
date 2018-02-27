import { EventEmitter } from 'events'

import { subscribeContractAllEvents } from '../utils/contract'
import { getTokenContract } from '../utils/token'
import web3 from '../framework/web3'

const ContractEvents = new EventEmitter()

export async function deployContractEventListeners() {
  let connect = await web3.onWs
  let contract = await getTokenContract(connect)
  subscribeContractAllEvents(contract, (error, result) => {
    if (error) {
      console.error(`Contract event listeners get error: ${error}`)
    } else if (result) {
      let { event } = result
      ContractEvents.emit(event, result)
    }
  })
}

export default ContractEvents
