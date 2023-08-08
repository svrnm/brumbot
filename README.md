# AppDynamics Browser Real User Monitoring Bot

> **Warning**
> This code is no longer maintained and only available as history. It may no longer work.

## Description

Use this tool to inject the [AppDynamics JavaScript agent (ADRUM)](https://www.appdynamics.com/product/end-user-monitoring/browser-real-user-monitoring) into an arbitrary page and run continuous load using [Puppeteer](https://pptr.dev/).

## Usage

You can use this tool either with Node.JS or with docker.

### Node.JS

You will need `git` and `Node.JS` preinstalled. Afterward, run the following commands:

```shell
git clone https://github.com/svrnm/brumbot.git
cd brumbot
npm install
node index.js example.json5 extra.js
```

Read below how to configure *brumbot* using the JSON file (`example.json5`) and the optional JS file (`extra.js`)

### Docker

```shell
docker run -t --rm -v "`pwd`":/mnt svrnm/brumbot example.json5 extra.js
```

Read below how to configure *brumbot* using the JSON file (`example.json5`) and the optional JS file (`extra.js`)

## Configuration

The behavior of *brumbot* is controlled through a JSON based configuration file. The most basic JSON file contains a list of URLs that brumbot will call, e.g.:

```json
{
  "urls": ["https://www.appdynamics.com/"]
}
```

This configuration will work, if the pages visited are instrumented with ADRUM already. To inject ADRUM into an page, add your `appKey`:

```json
{
  "urls": ["https://github.com/svrnm/brumbot"],
  "adrum": {
    "appKey": "<YOUR_APP_KEY>"
  }
}
```

Within `"adrum"` you can add any configuration required to setup the JavaScript agent, except functions, like those used to add custom user data. To cover this use case *brumbot* takes a JavaScript file like [extra.js](extra.js) as third parameter.

There are some more options to control the behavior of *brumbot*, look into [example.json5](example.json5) to see all of them.
