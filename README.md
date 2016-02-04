Belkin-wemo allows to control all wemo bulbs and wemo plugs through Netbeast API


Wemo bulbs

Parameter allowed:

{
- power: true || false
- brightness: 0..100
- hue: 0..360
- saturation: 0..100
- color: {r: 0, b: 0, g: 0} || CC00AA // Will be translated to hue and saturation

}

However, they are white lights and only power and brightness parameters are used.

Wemo Plug & Bridge

switch & bridge

{
- power: true || false

}
