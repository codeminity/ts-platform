import axios from 'axios'

import { create } from './factories/create'

export default Object.assign(axios, {
  create
})

export * from 'axios'
export { create }
