var express = require('express');
var cors = require('cors');
var request = require('request');

var app = express();
const http = require('http');


const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');

// An access token (from your Slack app or custom integration - usually xoxb)
const slack_token = process.env.SLACK_TOKEN;

// The client is initialized and then started to get an active connection to the platform
const rtm = new RTMClient(slack_token);
const web = new WebClient(slack_token);
rtm.start()
  .catch(console.error);

// Calling `rtm.on(eventName, eventHandler)` allows you to handle events (see: https://api.slack.com/events)
// When the connection is active, the 'ready' event will be triggered
rtm.on('ready', async () => {

  // Sending a message requires a channel ID, a DM ID, an MPDM ID, or a group ID
  // The following value is used as an example
  const channelId = process.env.CHANNEL_ID;

  // The RTM client can send simple string messages
  const res = await rtm.sendMessage('Node Server Up', channelId);

  // `res` contains information about the sent message
  console.log('Message sent: ', res.ts);
});

// After the connection is open, your app will start receiving other events.
rtm.on('message', (event) => {
  // The argument is the event as shown in the reference docs.
  // For example, https://api.slack.com/events/user_typing
  console.log(event);
  (async () => {
  // See: https://api.slack.com/methods/chat.postMessage
    const res = await web.users.info({token: slack_token, user: event.user});
    console.log(res.user.name)
    if ((event.text.toLowerCase() == 'left' ) || (event.text.toLowerCase() == 'right' ) || (event.text.toLowerCase() == 'up' ) || (event.text.toLowerCase() == 'down' )) {
      console.log(event.text);
      request.post(
        `https://directive-producer-demojam-zombie.apps.akrohg-openshift.redhatgov.io/camel/rest/produce/${process.env.COLOR}`,
        { json: { username: res.user.name, direction: event.text  } },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
        }
      );
    };
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