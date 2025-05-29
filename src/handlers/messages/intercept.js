const { WebClient } = require('@slack/web-api');
const { config } = require('../../config');
const { formatters } = require('../../utils/formatters');
const { buildInterceptBlocks } = require('../../utils/blocks');

// Create user client for message deletion
const userClient = new WebClient(config.slack.userToken);

/**
 * Handle message interception in target channels to prompt users to use /request command
 */
async function handleMessageIntercept({ message, client }) {
  try {
    // Skip bot messages, system messages, and threaded messages
    const systemSubtypes = [
      'bot_message',
      'channel_join',
      'channel_leave',
      'channel_topic',
      'channel_purpose',
      'channel_name',
      'channel_archive',
      'channel_unarchive',
      'group_join',
      'group_leave',
      'group_topic',
      'group_purpose',
      'group_name',
      'group_archive',
      'group_unarchive',
      'file_share',
      'file_comment',
      'file_mention',
      'pinned_item',
      'unpinned_item',
      'message_changed',
      'message_deleted',
      'reminder_add',
      'tombstone'
    ];

    if (systemSubtypes.includes(message.subtype) || message.thread_ts) {
      return;
    }

    if (!message.text || message.text.trim() === '') {
      return;
    }

    // Get channel info to check the name
    const channelInfo = await client.conversations.info({
      channel: message.channel
    });

    const channelName = channelInfo.channel.name.toLowerCase();

    // Only intercept messages in channels with specific names
    if (!config.app.targetChannelNames.includes(channelName)) {
      return; // Don't intercept messages in other channels
    }

    // Post ephemeral message with form to convert regular message to request
    await client.chat.postEphemeral({
      channel: message.channel,
      user: message.user,
      text: "❗ Please use `/request` to submit a request.",
      blocks: buildInterceptBlocks(message.ts, message.text)
    });

    // Use user token to delete the original message
    try {
      await userClient.chat.delete({
        channel: message.channel,
        ts: message.ts
      });
    } catch (deleteError) {
      console.warn('Could not delete message:', deleteError.message);
    }

  } catch (error) {
    console.error('Message intercept handler error:', error);
  }
}

module.exports = handleMessageIntercept;