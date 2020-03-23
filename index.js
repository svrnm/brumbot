const puppeteer = require('puppeteer');
const process = require('process');
const url = require('url');
const fs = require('fs');
const Chance = require('chance');
const chance = require('chance').Chance();
const JSON5 = require('json5')


// Default configuration
var config = {
  // URLS to visit within one session
  urls: [],
  // Turn on debugging
  debug: false,
  // Set 'count' to a positive integer to limit the number of sessions
  count: -1,
  // the adrum configuration
  adrum: false,
  // the delay between each session
  delay: 1,
  // the number of beacons we will wait for
  beaconCount: 2,
  // the timeout before we will no longer wait for beacons
  adrumTimeout: 15,
  adrumUrl: 'https://cdn.appdynamics.com/adrum/adrum-latest.js',
  randomLocation: false,
  withHelper: true,
  baseUrl: undefined,
  puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  networkConditions: false,
  cookieFile: false,
  cookies: false,
  bypassCSP: true
};

// Debug helper
function debug(msg) {
  if(config.debug) {
    console.log(msg)
  }
}

// Read the configuration file if available
if (process.argv.length > 2) {
  const file = fs.readFileSync(process.argv[2], 'utf8');
  try {
    var newConfig = JSON5.parse(file);
    if(newConfig.adrum) {
      newConfig.adrum = Object.assign({
        adrumExtUrlHttp: 'http://cdn.appdynamics.com',
        adrumExtUrlHttps: 'https://cdn.appdynamics.com',
        beaconUrlHttp: 'http://col.eum-appdynamics.com',
        beaconUrlHttps: 'https://col.eum-appdynamics.com',
        xd: {enable : false}
      }, newConfig.adrum);
    }
    if(newConfig.puppeteer) {
      newConfig.puppeteer = Object.assign(config.puppeteer, newConfig.puppeteer)
    }
    config = Object.assign(config, newConfig);
  } catch (e) {
    config.urls = file.trim().split('\n');
  }
} else {
  console.log('Please provide a configuration file');
  process.exit()
}

if (process.argv.length > 3) {
  config.extra = fs.readFileSync(process.argv[3], 'utf8');
}

console.log('Running headless...')

debug(config);

if(config.cookieFile) {
 config.cookies = JSON5.parse(fs.readFileSync(config.cookieFile, 'utf8'));
}

var getIP = () => chance.ip()
if(config.randomLocation === 'ipv6') {
  getIP = () => chance.ipv6()
} else if(typeof config.randomLocation === 'string' && config.randomLocation.includes('ipv4') && config.randomLocation.includes('ipv6')) {
  getIP = () => chance.bool() ? chance.ip() : chance.ipv6()
}

function visiting(url, ip) {
  const from = config.randomLocation !== false ? `from ${ip}` : ''
  console.log('Visiting', url, from);
}

function logSession(index, helper) {
  const person = config.withHelper ? `(${helper.person.first} ${helper.person.last} <${helper.person.email}>)` : ''
  console.log('Session:', index, person)
}

// Run Puppeteer in an async context
(async () => {
  // Execute 'count' sessions or run endlessly if count is -1
  for (var j = 0; config.count === -1 || j < config.count; j++) {
    if(config.withHelper) {
      var first = chance.first();
      var last = chance.last();
      var domain = chance.domain();
      var username = first.toLowerCase() + '.' + last.toLowerCase();
      var helper = {
        bool: chance.bool(),
        ints: {
          random: chance.integer(),
          below10: chance.integer({min: 0, max: 10}),
          below100: chance.integer({min: 10, max: 100}),
          below1000: chance.integer({min: 100, max: 1000})
        },
        floats: {
          random: chance.floating(),
          below1: chance.floating({min:0, max: 1}),
          below10: chance.floating({min: 0, max: 10, fixed: 2}),
          below100: chance.floating({min: 10, max: 100, fixed: 2}),
          below1000: chance.floating({min: 100, max: 1000, fixed: 2})
        },
        dates: {
            random: chance.date().getTime(),
            thisYear: chance.date({year: (new Date()).getFullYear()}).getTime(),
            thisMonth: chance.date({year: (new Date()).getFullYear(), month: (new Date()).getMonth()}).getTime(),
            today: chance.date({year: (new Date()).getFullYear(), month: (new Date()).getMonth(), day: (new Date()).getDate()}).getTime()
        },
        person: {
          birthday: chance.birthday({type: 'adult'}),
          first: first,
          last: last,
          username: username,
          email: username + '@' + domain,
          profession: chance.profession(),
          phone: chance.phone(),
        },
        creditCard: {
            number: chance.cc(),
            expiration: chance.exp()
        },
        animal: chance.animal(),
        color: chance.color(),
        company: {
          name: chance.company(),
        }
      }
      debug(helper)
    }

    logSession(j, helper)

    var localIP = getIP()
    if(config.randomLocation !== false) {
      debug('Requests come from: ' + localIP);
      config.adrum.geo = {
        localIP: localIP
      }
    }

    // The browser is restarted for every session, so cookies & caches are empty
    const browser = await puppeteer.launch(config.puppeteer);

    const page = await browser.newPage();
    await page.setBypassCSP(config.bypassCSP)

    if(config.cookies) {
      await page.setCookie(...config.cookies);
    }

    if(config.networkConditions) {
      debug('Setting network conditions...', config.networkConditions)
      const cdp = await page.target().createCDPSession()
      await cdp.send('Network.emulateNetworkConditions', config.networkConditions)
    }

    // Debug output for all requests
    page.on('requestfinished', function(request) {
      if (config.debug) {
        console.log('END', request.url())
      } else {
        process.stdout.write(request.resourceType()[0])
      }
    })

    // Here the magic happens: Inject the adrum script into the page
    if(config.adrum) {
      page.on('framenavigated', async frame => {
        await page.addScriptTag({content: `window['adrum-config'] = ${JSON5.stringify(config.adrum)}`});
        await page.addScriptTag({url: config.adrumUrl});
        if(config.extra) {
          var helperScript = '';
          if(config.withHelper) {
            helperScript = `window.adrumHelper = ${JSON5.stringify(helper)};`
          }
          await page.addScriptTag({content: helperScript + config.extra});
        }
      });
    }

    // Some more debug information
    if (config.debug) {
      page.on('console', msg => console.log(msg.text()));
      page.on('request', function(request) {
        console.log('START', request.url())
      })
    }

    // Loop over the list of URLs
    for (var i = 0; i < config.urls.length; i++) {
      const myUrl = new url.URL(config.urls[i], config.baseUrl);
      var bc = 0;
      visiting(myUrl.href, localIP)
      try {
        await page.goto(myUrl);
        if(config.debug) {
          console.log(await page.content())
        }
        await new Promise(resolve => {
          debug('Waiting for beacons...')
          var to = setTimeout(() => {
            process.stdout.write('t')
            resolve()
          }, config.adrumTimeout * 1000)
          page.on('requestfinished', request => {
            if(request.url().endsWith('/adrum') && request.resourceType() === 'xhr') {

              debug(request.postData())

              process.stdout.write('' + (bc+1))
              bc++
              if(bc >= config.beaconCount) {
                clearTimeout(to);
                resolve()
              }
            }
          })
        })
      } catch (e) {
        console.log(e)
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      process.stdout.write('\n')
    }

    await page.close();
    console.log();
    await browser.close();

    await new Promise(resolve => setTimeout(resolve, config.delay * 1000));
  }

})();
