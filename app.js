require('dotenv').config();
const { App } = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

// Handle the /request command
app.command('/request', async ({ command, ack, say }) => {
    try {
        // Acknowledge the command
        await ack();

        // Parse the command arguments
        const args = command.text.split(' ');
        if (args.length < 3) {
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "❌ Invalid request format!\nUse: `/request priority_level request_type message`\n\nPriority levels: low, medium, high\nRequest types: Question, Feature, Bug"
                        }
                    }
                ]
            });
            return;
        }

        const [priority, type, ...message] = args;
        const messageText = message.join(' ');

        // Validate priority and type
        const validPriorities = ['low', 'medium', 'high'];
        const validTypes = ['Question', 'Feature', 'Bug'];

        if (!validPriorities.includes(priority.toLowerCase())) {
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `❌ Invalid priority level: ${priority}\nValid options: ${validPriorities.join(', ')}`
                        }
                    }
                ]
            });
            return;
        }

        if (!validTypes.includes(type)) {
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `❌ Invalid request type: ${type}\nValid options: ${validTypes.join(', ')}`
                        }
                    }
                ]
            });
            return;
        }

        // Create the request message with interactive elements
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*New Request from <@${command.user_id}>*\n\n${messageText}`
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": `Priority: ${priority}`
                            },
                            "action_id": "priority_button",
                            "value": priority
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": `Type: ${type}`
                            },
                            "action_id": "type_button",
                            "value": type
                        }
                    ]
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "users_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Select an assignee"
                            },
                            "action_id": "assignee_select"
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error(error);
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "❌ Something went wrong while processing your request."
                    }
                }
            ]
        });
    }
});

// Handle priority button clicks
app.action('priority_button', async ({ ack, body, client }) => {
    await ack();
    
    const newPriority = body.actions[0].value;
    const messageTs = body.message.ts;
    const channelId = body.channel.id;

    try {
        await client.chat.update({
            channel: channelId,
            ts: messageTs,
            blocks: body.message.blocks.map(block => {
                if (block.type === 'actions' && block.elements[0].action_id === 'priority_button') {
                    block.elements[0].text.text = `Priority: ${newPriority}`;
                }
                return block;
            })
        });
    } catch (error) {
        console.error(error);
    }
});

// Handle type button clicks
app.action('type_button', async ({ ack, body, client }) => {
    await ack();
    
    const newType = body.actions[0].value;
    const messageTs = body.message.ts;
    const channelId = body.channel.id;

    try {
        await client.chat.update({
            channel: channelId,
            ts: messageTs,
            blocks: body.message.blocks.map(block => {
                if (block.type === 'actions' && block.elements[1].action_id === 'type_button') {
                    block.elements[1].text.text = `Type: ${newType}`;
                }
                return block;
            })
        });
    } catch (error) {
        console.error(error);
    }
});

// Handle assignee selection
app.action('assignee_select', async ({ ack, body, client }) => {
    await ack();
    
    const selectedUser = body.actions[0].selected_user;
    const messageTs = body.message.ts;
    const channelId = body.channel.id;

    try {
        // Add a new section with the assignee mention
        const newBlocks = [
            ...body.message.blocks,
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Assigned to: <@${selectedUser}>`
                }
            }
        ];

        await client.chat.update({
            channel: channelId,
            ts: messageTs,
            blocks: newBlocks
        });

        // Post a thread reply to notify the assignee
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: messageTs,
            text: `<@${selectedUser}>, you've been assigned to this request!`
        });
    } catch (error) {
        console.error(error);
    }
});

(async () => {
    try {
        // Start your app
        await app.start(process.env.PORT || 3000);
        app.logger.info('⚡️ Bolt app is running!');
    } catch (error) {
        app.logger.error(error);
        process.exit(1);
    }
})();