import fetch from 'isomorphic-unfetch'
import cuid from 'cuid'

function checkStatus (res) {
  if (res.ok) {
    return res
  } else {
    let err = new Error(res.statusText)
    err.response = res
    return Promise.reject(err)
  }
}

export default function fairAnalytics ({ url } = {}) {
  if (!url) {
    throw new Error(
      'You must provide the "url" of your Fair Analytics instance'
    )
  }
  let anonymousSessionId = 'NA'
  const localStorageKey = '__fa__'

  try {
    const faConf = window.localStorage.getItem(localStorageKey)
    if (faConf && faConf.anonymousSessionId) {
      anonymousSessionId = faConf.anonymousSessionId
    } else {
      try {
        const faConf = {
          anonymousSessionId: cuid()
        }
        window.localStorage.setItem(localStorageKey, faConf)
        anonymousSessionId = faConf.anonymousSessionId
      } catch (e) {
        console.warn(
          'Error while setting anonymousSessionId "NA" will be used',
          e
        )
      }
    }
  } catch (e) {
    console.warn('Error while setting anonymousSessionId, "NA" will be used', e)
  }

  const send = (opts = {}, guaranteeRequest = false) => {
    if (!opts.event) {
      return Promise.reject(new Error('You must provide the "event" parameter'))
    }
    opts.anonymousSessionId = anonymousSessionId
    const body = JSON.stringify(opts)
    const contentType = 'application/json'
    if (guaranteeRequest) {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: contentType })
        if (navigator.sendBeacon(url, blob)) {
          return Promise.resolve({})
        } else {
          return Promise.reject(new Error('Failed to queue event'))
        }
      }
      // fallback to synchronous XMLHttpRequest
      const client = new XMLHttpRequest()
      client.open('POST', url, false)
      client.setRequestHeader('Content-Type', contentType)
      client.send(body)
    }
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType
      },
      body
    }).then(checkStatus)
  }

  return { send }
}
