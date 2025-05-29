const { buildRequestBlocks } = require('../../utils/blocks');
const { handleRequest } = require('../../services/request/handler');
const { PRIORITIES, REQUEST_TYPES, getRequestTypeOptions, getPriorityOptions } = require('../../constants/enums');

async function transferShortcutHandler({ shortcut, ack, client, logger }) {
    await ack();

    try {
        // Get the message that the shortcut was triggered on
        const messageTs = shortcut.message.ts;
        const channelId = shortcut.channel.id;
        const userId = shortcut.user.id;

        // Open a modal for user to select channel, priority, and type
        await client.views.open({
            trigger_id: shortcut.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'transfer_request_modal',
                title: {
                    type: 'plain_text',
                    text: 'Transfer Request'
                },
                submit: {
                    type: 'plain_text',
                    text: 'Transfer'
                },
                close: {
                    type: 'plain_text',
                    text: 'Cancel'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'Select the destination channel and request details:'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'channel_select',
                        element: {
                            type: 'conversations_select',
                            action_id: 'channel',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select channel...'
                            },
                            filter: {
                                include: ['public', 'private'],
                                exclude_bot_users: true
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Destination Channel'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'request_type',
                        element: {
                            type: 'static_select',
                            action_id: 'type',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select request type...'
                            },
                            options: getRequestTypeOptions()
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Request Type'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'priority_select',
                        element: {
                            type: 'static_select',
                            action_id: 'priority',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select priority...'
                            },
                            options: getPriorityOptions()
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Priority'
                        }
                    }
                ],
                private_metadata: JSON.stringify({
                    sourceChannelId: channelId,
                    messageTs: messageTs,
                    userId: userId
                })
            }
        });

    } catch (error) {
        logger.error('Error handling transfer shortcut:', error);
        
        // Send ephemeral error message to user
        await client.chat.postEphemeral({
            channel: shortcut.channel.id,
            user: shortcut.user.id,
            text: 'Sorry, there was an error processing your transfer request. Please try again.'
        });
    }
}

// Handle the modal submission
async function handleTransferModal({ ack, body, client, view, logger }) {
    await ack();

    try {
        const metadata = JSON.parse(view.private_metadata);
        const { sourceChannelId, messageTs, userId } = metadata;

        // Get form values
        const targetChannelId = view.state.values.channel_select.channel.selected_conversation;
        const requestType = view.state.values.request_type.type.selected_option.value;
        const priority = view.state.values.priority_select.priority.selected_option.value;

        // Get the original message and thread
        const messages = await getThreadMessages(client, sourceChannelId, messageTs);
        
        // Combine all messages into a single formatted text
        const combinedMessageText = await formatThreadMessages(client, messages);
        
        // Create link to original message
        const originalMessageLink = `https://slack.com/archives/${sourceChannelId}/p${messageTs.replace('.', '')}`;
        const messageWithLink = `${combinedMessageText}\n\n---\n\n🔗 **[View Original Message](${originalMessageLink})**`;

        // Use the existing handleRequest function to post the formatted request
        const result = await handleRequest({
            client,
            channel: targetChannelId,
            user: userId,
            priority,
            type: requestType,
            messageText: messageWithLink
        });

        // Post a reply in the original thread notifying about the transfer
        await client.chat.postMessage({
            channel: sourceChannelId,
            thread_ts: messageTs,
            text: `🔄 This request has been transferred to <#${targetChannelId}> and will only be followed up there.\n\n` +
                  `Please continue any discussion about this request in the new channel.`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🔄 *Request Transferred*\n\nThis request has been transferred to <#${targetChannelId}> and will only be followed up there.\n\nPlease continue any discussion about this request in the new channel.`
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Transferred by <@${userId}> • ${new Date().toLocaleString()}`
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        logger.error('Error handling transfer modal submission:', error);
        
        // Send error message to user
        await client.chat.postEphemeral({
            channel: body.user.id,
            user: body.user.id,
            text: 'Sorry, there was an error transferring your request. Please try again.'
        });
    }
}

// Helper function to get all messages in a thread
async function getThreadMessages(client, channelId, messageTs) {
    try {
        const result = await client.conversations.replies({
            channel: channelId,
            ts: messageTs
        });
        
        return result.messages || [];
    } catch (error) {
        console.error('Error fetching thread messages:', error);
        // Return just the original message if we can't get the thread
        const originalMessage = await client.conversations.history({
            channel: channelId,
            latest: messageTs,
            limit: 1,
            inclusive: true
        });
        
        return originalMessage.messages || [];
    }
}

// Helper function to format thread messages
async function formatThreadMessages(client, messages) {
    if (messages.length === 1) {
        // Single message - just show the content
        return `> ${messages[0].text}`;
    }

    // Multiple messages - show original + replies
    const formattedMessages = await Promise.all(
        messages.map(async (message, index) => {
            if (index === 0) {
                // Original message - just the content
                return `> ${message.text}`;
            } else {
                // Replies - show who replied and content
                let userInfo;
                try {
                    userInfo = await client.users.info({ user: message.user });
                } catch (error) {
                    userInfo = { user: { real_name: 'Unknown User', name: message.user } };
                }

                const userName = userInfo.user.real_name || userInfo.user.name || 'Unknown User';
                const replyContent = `> \n> **${userName} replied:**\n> ${message.text}`;
                return replyContent;
            }
        })
    );

    return formattedMessages.join('\n');
}


module.exports = {
    transferShortcutHandler,
    handleTransferModal
};