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
    if (guaranteeRequest) {
      if (navigator.sendBeacon) {
        // urlencoded b/c sendBeacon json not always supported in browsers:
        // http://crbug.com/490015
        const encoded = Object.keys(opts)
          .map(key => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(opts[key])
          })
          .join('&')
        const blob = new Blob([encoded], {
          type: 'application/x-www-form-urlencoded'
        })
        if (navigator.sendBeacon(url, blob)) {
          return Promise.resolve({})
        } else {
          return Promise.reject(new Error('Failed to queue event'))
        }
      }
      // fallback to synchronous XMLHttpRequest
      const client = new XMLHttpRequest()
      client.open('POST', url, false)
      client.setRequestHeader('Content-Type', 'application/json')
      client.send(JSON.stringify(opts))
    }
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(opts)
    }).then(checkStatus)
  }

  return { send }
}
