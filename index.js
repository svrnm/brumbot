const puppeteer = require('puppeteer');
const process = require('process');
const url = require('url');
const fs = require('fs');
const Chance = require('chance');
const chance = require('chance').Chance();


// Default configuration
var config = {
  // URLS to visit within one session
  urls: [],
  // Turn on debugging
  debug: false,
  // Set 'count' to a positive integer to limit the number of sessions
  count: -1,
  // the adrum configuration
  adrum: {
    adrumExtUrlHttp: 'http://cdn.appdynamics.com',
    adrumExtUrlHttps: 'https://cdn.appdynamics.com',
    beaconUrlHttp: 'http://col.eum-appdynamics.com',
    beaconUrlHttps: 'https://col.eum-appdynamics.com',
    xd: {enable : false}
  },
  // the delay between each session
  delay: 1,
  // the number of beacons we will wait for
  beaconCount: 2,
  // the timeout before we will no longer wait for beacons
  adrumTimeout: 15,
  randomLocation: false,
  withHelper: true,
  puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  networkConditions: false,
  cookieFile: false,
  cookies: false
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
    var newConfig = JSON.parse(file);
    if(newConfig.adrum) {
      newConfig.adrum = Object.assign(config.adrum, newConfig.adrum);
    }
    if(newConfig.puppeteer) {
      newConfig.puppeteer = Object.assign(config.puppeteer, newConfig.puppeteer)
    }
    config = Object.assign(config, newConfig);
  } catch (e) {
    config.urls = file.trim().split("\n");
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
 config.cookies = JSON.parse(fs.readFileSync(config.cookieFile, 'utf8'));
}

// Run Puppeteer in an async context
(async () => {
  // Execute "count" sessions or run endlessly if count is -1
  for (var j = 0; config.count === -1 || j < config.count; j++) {
    console.log('Session ' + j + ' ==========')

    if(config.randomLocation) {
      var localIP = chance.ip();
      debug('Requests come from: ' + localIP);
      config.adrum.geo = {
        localIP: localIP
      }
    }

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
    }

    // The browser is restarted for every session, so cookies & caches are empty
    const browser = await puppeteer.launch(config.puppeteer);

    const page = await browser.newPage();

    if(config.cookies) {
      await page.setCookie(...config.cookies);
    }

    if(config.networkConditions) {
      debug("Setting network conditions...", config.networkConditions)
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
        await page.addScriptTag({content: `window['adrum-config'] = ${JSON.stringify(config.adrum)}`});
        await page.addScriptTag({url: 'https://cdn.appdynamics.com/adrum/adrum-latest.js'});
        if(config.extra) {
          var helperScript = "";
          if(config.withHelper) {
            helperScript = `window.adrumHelper = ${JSON.stringify(helper)};`
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
      const myUrl = new url.URL(config.urls[i]);
      var bc = 0;
      console.log('Visiting', myUrl.href);
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

              process.stdout.write("" + (bc+1))
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
    }

    await page.close();
    console.log();
    await browser.close();

    await new Promise(resolve => setTimeout(resolve, config.delay * 1000));
  }

})();
