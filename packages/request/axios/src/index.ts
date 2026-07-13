import axios from 'axios'

import { create } from './factories/create'
import { getAxiosInstance } from './utils/get-axios-instance'

export default Object.assign(getAxiosInstance, axios, { create })

export * from 'axios'
export { create }
