var util = require('util')

var request = require('request')
var Wemo = require('wemo-client')

var devices = []

module.exports = function (callback) {
  var objects = []
  request.get('http://' + process.env.NETBEAST + '/api/resources?app=belkin-wemo',
  function (err, resp, body) {
    if (err) callback(err, null)
    else if (util.isArray(body)) {
      body.forEach(function (device) {
        if (objects.indexOf(device.hook) < 0) objects.push(device.hook)
      })
    }
  })
  var wemo = new Wemo()
  wemo.discover(function (deviceInfo) {
    if (deviceInfo.deviceType === Wemo.DEVICE_TYPE.Bridge) {
      devices.push(deviceInfo)
      var indx = objects.indexOf('/wemoBridge/' + deviceInfo.macAddress)
      if (indx >= 0) {
        objects.splice(indx, 1)
      } else {
        // Bridge solo GET
        request.post({url: 'http://' + process.env.NETBEAST + '/api/resources',
        json: {
          app: 'belkin-wemo',
          topic: 'bridge',
          hook: '/wemoBridge/' + deviceInfo.macAddress
        }},
        function (err, resp, body) {
          if (err) callback(err, null)
        })
      }
      var client = wemo.client(deviceInfo)

      client.getEndDevices(function (err, bulbs) {
        if (err) callback(err, null)
        bulbs.forEach(function (lights) {
          devices.push(lights)
          var indx = objects.indexOf('/wemoLights/' + lights.deviceId)
          if (indx >= 0) {
            objects.splice(indx, 1)
          } else {
            request.post({url: 'http://' + process.env.NETBEAST + '/api/resources',
            json: {
              app: 'belkin-wemo',
              topic: 'lights',
              hook: '/wemoLights/' + lights.deviceId
            }},
            function (err, resp, body) {
              if (err) callback(err, null)
            })
          }
        })
      })
    } else if ((deviceInfo.deviceType === Wemo.DEVICE_TYPE.Insight) || (deviceInfo.deviceType === Wemo.DEVICE_TYPE.Switch)) {
      devices.push(deviceInfo)
      indx = objects.indexOf('/wemoSwitch/' + deviceInfo.macAddress)
      if (indx >= 0) {
        objects.splice(indx, 1)
      } else {
        request.post({url: 'http://' + process.env.NETBEAST + '/api/resources',
        json: {
          app: 'belkin-wemo',
          topic: 'switch',
          hook: '/wemoSwitch/' + deviceInfo.macAddress
        }},
        function (err, resp, body) {
          if (err) callback(err, null)
        })
      }
    } else console.log('Device not Supported yet!')
  })
  setTimeout(function () {
    if (objects.length > 0) {
      objects.forEach(function (hooks) {
        request.del('http://' + process.env.NETBEAST + '/api/resources?hook=' + hooks,
        function (err, resp, body) {
          if (err) callback(err, null)
        })
      })
    }
    callback(null, devices)
    wemo = null
    devices = []
  }, 20000)
}
