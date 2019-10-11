var express = require('express');
var cors = require('cors');
var request = require('request');

var app = express();
const http = require('http');


const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');

const NodeCache = require( "node-cache" );
const cache = new NodeCache( { stdTTL: 300, checkperiod: 30 } );

// An access token (from your Slack app or custom integration - usually xoxb)
const slack_token = process.env.SLACK_TOKEN;
  // Sending a message requires a channel ID, a DM ID, an MPDM ID, or a group ID
  // The following value is used as an example
const whiteChannelId = process.env.WHITE_CHANNEL_ID;
const redChannelId = process.env.RED_CHANNEL_ID;

// The client is initialized and then started to get an active connection to the platform
const rtm = new RTMClient(slack_token);
const web = new WebClient(slack_token);
rtm.start()
  .catch(console.error);

// Calling `rtm.on(eventName, eventHandler)` allows you to handle events (see: https://api.slack.com/events)
// When the connection is active, the 'ready' event will be triggered
rtm.on('ready', async () => {
  // The RTM client can send simple string messages
  const whiteRes = await rtm.sendMessage(getWelcomeMessage("White"), whiteChannelId);
  const redRes = await rtm.sendMessage(getWelcomeMessage("Red"), redChannelId);

  // `res` contains information about the sent message
  console.log('Message sent: ', whiteRes.ts);
  console.log('Message sent: ', redRes.ts);
});

// After the connection is open, your app will start receiving other events.
rtm.on('message', (event) => {
  // The argument is the event as shown in the reference docs.
  // For example, https://api.slack.com/events/user_typing
  (async () => {
    var color;
    console.log(event);
    if ( event.channel == whiteChannelId ) {
      color = 'White';
    } else if ( event.channel == redChannelId ) {
      color = 'Red';
    } else {
      return;
    }
    
    if (event.subtype == 'channel_join') {
      rtm.sendMessage(getWelcomeMessage(color, event.user), event.channel);
      return;
    }
  // See: https://api.slack.com/methods/chat.postMessage
    var username = cache.get(event.user);
    if (!username) {
      username = (await web.users.info({token: slack_token, user: event.user})).user.real_name;
      cache.set(event.user, username);
    }
    console.log(username);
    var direction = event.text.toLowerCase().trim();
    if (["left", "right", "up", "down"].indexOf(direction) >= 0) {
      console.log(event.text.toLowerCase());
      request.post(
        `http://directive-producer:8080/camel/rest/produce/${color.toLowerCase()}`,
        { json: { username: username, direction: event.text.toLowerCase() } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
        }
      );
    }
  })();
});

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use(cors());
module.exports = app;

http.createServer(app).listen(1337, '127.0.0.1');

function getWelcomeMessage(color, user) {
  var message = `Welcome to *Team ${color} Hat*! Type "up", "down", "left", and "right" to help your Shadowman reach the goal first!`
  if (user) {
    message = `Hey, <@${user}>! ${message}`;
  }
  return message;
}