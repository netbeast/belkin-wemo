var express = require('express')
var router = express.Router()
var loadResources = require('./resources')
var Wemo = require('wemo-client')
var wemo = new Wemo()
var mqtt = require('mqtt')
var netbeast = require('netbeast')

//  Acepted Values for Each Device
var switchvalues = {power: 'binaryState'}
var bulbvalues = {power: '10006', brightness: '10008'}
var bridgevalues = {power: 'binaryState'}

var mqttClient = mqtt.connect('ws://' + process.env.NETBEAST)

loadResources(function (err, devices) {
  if (err) {
    console.trace(new Error(err))
    netbeast().error(err, 'Something wrong!')
  }
  // ### GET ###
  router.get('/wemoBridge/:id', function (req, res, next) {
    var device = devices.filter(function (elem) {
      if (elem.macAddress === req.params.id && elem.deviceType === Wemo.DEVICE_TYPE.Bridge) return true
    })

    if (device.length > 0) {
      if (!Object.keys(req.query).length) {
        var newDevice = {
          host: device[0]['host'],
          port: device[0]['port'],
          deviceType: device[0]['deviceType'],
          friendlyName: device[0]['friendlyName'],
          modelName: device[0]['modelName'],
          modelNumber: device[0]['modelNumber']
        }
        return res.json(newDevice)
      }
      var response = {}
      Object.keys(req.query).forEach(function (key) {
        if (bridgevalues[key]) response[key] = device[0][bridgevalues[key]]
      })
      if (Object.keys(response).length) return res.json(response)
      return res.status(400).send('Values not available on wemo-bridge')
    } else {
      return res.status(404).send('Device not found')
    }
  })

  router.get('/wemoLights/:id', function (req, res, next) {
    var device = devices.filter(function (elem) {
      if (elem.deviceId === req.params.id && elem.currentState &&
        elem.capabilities) return true
    })

    if (device.length > 0) {
      if (!Object.keys(req.query).length) return res.json(device)
      var response = {}
      Object.keys(req.query).forEach(function (key) {
        if (bulbvalues[key]) response[key] = device[0][bulbvalues[key]]
      })
      if (Object.keys(response).length) return res.json(response)
      return res.status(400).send('Values not available on this wemo-bulb')
    } else {
      return res.status(404).send('Device not found')
    }
  })

  router.get('/wemoSwitch/:id', function (req, res, next) {
    var device = devices.filter(function (elem) {
      if (elem.macAddress === req.params.id && (elem.deviceType === Wemo.DEVICE_TYPE.Switch ||
        elem.deviceType === Wemo.DEVICE_TYPE.Insight)) return true
    })

    if (device.length > 0) {
      if (!Object.keys(req.query).length) {
        var newDevice = {
          host: device[0]['host'],
          port: device[0]['port'],
          deviceType: device[0]['deviceType'],
          friendlyName: device[0]['friendlyName'],
          modelName: device[0]['modelName'],
          modelNumber: device[0]['modelNumber']
        }
        return res.json(newDevice)
      }

      var response = {}
      Object.keys(req.query).forEach(function (key) {
        if (switchvalues[key]) response[key] = device[0][switchvalues[key]]
      })
      if (Object.keys(response).length) return res.json(response)
      return res.status(400).send('Values not available on wemo-switch')
    } else {
      res.status(404).send('Device not found')
    }
  })

  router.get('/discover', function (req, res, next) {
    loadResources(function (err, devices) {
      if (err) res.status(500).send(err)
      else res.json(devices)
    })
  })

  // ### POST ###
  router.post('/wemoBridge/:id', function (req, res, next) {
    var device = devices.filter(function (elem) {
      if (elem.macAddress === req.params.id && elem.deviceType === Wemo.DEVICE_TYPE.Bridge) return true
    })
    if (device.length > 0) {
      var error = false
      var client = wemo.client(device[0])
      var response = {}
      Object.keys(req.body).forEach(function (key) {
        if (bridgevalues[key]) {
          response[key] = req.body[key]
          client.setBinaryState(req.body[key], function (err, data) {
            if (err) error = true
          })
        }
      })
      if (error) return res.status(400).send('A problem setting one value occurred')
      else {
        mqttClient.publish('netbeast/bridge', JSON.stringify(response))
        res.send(response)
      }
    } else res.status(404).send('Device not found')
  })

  router.post('/wemoLights/:id', function (req, res, next) {
    var device = devices.filter(function (elem) {
      if (elem.deviceId === req.params.id && elem.currentState &&
        elem.capabilities) return true
    })
    var bridge = devices.filter(function (elem) {
      if (elem.deviceType === Wemo.DEVICE_TYPE.Bridge) return true
    })
    if (device.length > 0 && bridge.length > 0) {
      var client = wemo.client(bridge[0])
      var response = {}
      Object.keys(req.body).forEach(function (key) {
        // Comprobar si este valor se le puede asignar a esta bombilla
        if (bulbvalues[key]) {
          response[key] = req.body[key]
          if (req.body[key] === true) req.body[key] = 1
          else if (req.body[key] === false) req.body[key] = 0
          client.setDeviceStatus(req.params.id, bulbvalues[key], req.body[key])
        }
      })
      client.publish('netbeast/lights', JSON.stringify(response))
      res.send(response)
    } else res.status(404).send('Device not found')
  })

  router.post('/wemoSwitch/:id', function (req, res, next) {
    var device = devices.filter(function (elem) {
      if (elem.macAddress === req.params.id && (elem.deviceType === Wemo.DEVICE_TYPE.Switch ||
        elem.deviceType === Wemo.DEVICE_TYPE.Insight)) return true
    })
    if (device.length > 0) {
      var error = false
      var client = wemo.client(device[0])
      var response = {}
      Object.keys(req.body).forEach(function (key) {
        if (switchvalues[key]) {
          response[key] = req.body[key]
          client.setBinaryState(req.body[key] ? 1 : 0, function (err, data) {
            if (err) error = true
          })
        }
      })
      if (error) return res.status(404).send('A problem setting one value occurred')
      else {
        mqttClient.publish('netbeast/switch', JSON.stringify(response))
        return res.send(response)
      }
    } else res.status(404).send('Device not found')
  })
})

module.exports = router
