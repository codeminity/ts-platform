import axios from 'axios'

import { create } from './factories/create'

const instance = Object.assign(axios, {
  create
})

export default instance

export * from 'axios'
export { create }
