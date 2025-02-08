# Claude to Markdown

A WebExtension to easily export [Claude](https://claude.ai/) conversation transcripts to Markdown and, optionally, save them as a [GitHub Gist](https://gist.github.com/).

For example, here's the conversation used to create this extension: <https://gist.github.com/legoktm/63f134c6d27308d69135cd987a7d026c>.

## How it works

When you load a conversation, the extension observes the JSON returned by the server and converts it to Markdown.

It adds a "c.ai md" icon to your toolbar; clicking on it will reveal your most recently loaded transcript.

It cannot (yet) follow a live conversation, so before exporting, you will need to reload your Claude browser tab.

If you set a GitHub token in the extension preferences, you can automatically save the generated
Markdown as a Gist.

## Privacy

Claude to Markdown does not transmit your data to myself nor any third-party service. The only exception is if you explicitly configure and use the GitHub integration, in which case the extension will communicate directly with GitHub.

The last Claude conversation you loaded is stored locally on your browser solely so it can be displayed back to you.

## License and credit

Claude to Markdown is released under the Apache 2.0 license, see COPYING for more details.

The [original concept and code](https://observablehq.com/@simonw/convert-claude-json-to-markdown) was developed by Simon Willison and Kunal Mehta packaged it into a WebExtension (using Claude, of course).

The extension is not affiliated with nor endorsed by Anthropic.
