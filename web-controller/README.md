# Web Controller

This project holds the web controller for the litter collection robot. It uses the [Eclipse Paho MQTT library](http://www.eclipse.org/paho/files/jsdoc/Paho.MQTT.Client.html).

The javascript is written in Typescript, to clarify what interface each function has. To compile the typescript, first, make sure NodeJS and NPM are installed on your machine. Then, run
```
$ npm run build
```
to produce a build of the application. When you are developing, you most likely don't want to keep rebuilding manually. For that, run:
```
$ npm run watch
```
Now, compilation will happen automatically when a source file is changed.