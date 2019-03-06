# AppDynamics Browser Real User Monitoring Bot

## Description

Use this tool to inject the AppDynamics Javascript agent into an arbitrary page.

## Usage

You can use this tool either with Node.JS or with docker.

### Node.JS
```shell
git clone https://github.com/svrnm/brumbot.git
cd brumbot
npm install
# Edit example.json with your favourite editor
node index.js example.json
```

### Docker
```shell
# Edit example.json with your favourite editor
docker run -t --rm -v "`pwd`":/mnt svrnm/brumbot example.json
```
