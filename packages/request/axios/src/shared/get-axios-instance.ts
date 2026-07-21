import axios from 'axios'

export function getAxiosInstance(...args: Parameters<typeof axios>): ReturnType<typeof axios> {
  return axios(...args)
}
