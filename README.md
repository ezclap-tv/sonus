# sonus

Sound clips controlled by Twitch chat.

https://ezclap.tv/sonus

### Personal deployment

Note: You only need a personal deployment if you want to add/remove sounds. If all you want is just to use it with the existing sounds, create a browser source with a link to `https://ezclap.tv/sonus/#<YOUR_CHANNEL>`, e.g. if your channel name is `hunter123`, use `https://ezclap.tv/sonus/#hunter123`.

All you need is a GitHub account.

1. Fork the repository but _do not change the name!_
1. Go to `Settings` -> `Pages`
1. Change the `Source` field from `None` to `gh-pages`, and click `Save`
1. Enable `Enforce HTTPS`
1. You should see a link that looks like `https://<YOUR_USERNAME>.github.io/sonus/` in the message at the top. If your GitHub username is `hunter123`, your link will be `https://hunter123.github.io/sonus/`.
1. After a few minutes, reload the page, and the message with the link should be green

At this point, the deployment is complete, and you can follow the link to test it.

In order to use this in OBS:

1. Append `#<YOUR_CHANNEL>` to the link. If your twitch username is `hunter123`, your link will be `https://hunter123.github.io/sonus/#hunter123`.
1. Create a browser source in OBS, with the link as the URL.
1. You're done!

Open the same link in a browser to explore the available commands, and try sending some in your chat. Note that the bot cannot reply to your commands. An explicit goal of this tool is to not require any authentication tokens in order to work. It may become an optional feature in the future.

To modify sounds, clone the repository, make any changes you want, then commit and push your changes. The deployment will update with any added/removed sounds in a minute or two.

### Local development

Requires [Node.js](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/)

Install dependencies with

```
$ yarn
```

Run the development server with

```
$ yarn dev
```

Or build for deployment with

```
$ yarn build
```
