# ear-violator-9000

Sound clips controlled by Twitch chat.

https://ezclap.tv/ear-violator-9000/#moscowwbish

Replace `moscowwbish` in the link above with any channel name to make it listen for commands in that channel's chat.

### Local development

Run the `build.js` script and serve the `build` directory. Restart on any changes.

```
$ node build.js && python -m http.server 8080 --directory build
```