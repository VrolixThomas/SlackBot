require('dotenv').config();
const { App } = require('@slack/bolt');

const TARGET_CHANNEL_NAMES = process.env.TARGET_CHANNEL_NAMES ? 
    process.env.TARGET_CHANNEL_NAMES.split(',').map(name => name.trim().toLowerCase()) : 
    []; 

// Enums for priorities and statuses
const PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

const STATUSES = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed'
};

const REQUEST_TYPES = {
    QUESTION: 'Question',
    FEATURE: 'Feature',
    BUG: 'Bug'
};

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Helper functions to normalize and expand shortcuts
function expandPriority(input) {
    const normalized = input.toLowerCase();
    
    // Check for exact match first
    if (Object.values(PRIORITIES).includes(normalized)) {
        return normalized;
    }
    
    // Check for single letter shortcuts
    switch (normalized) {
        case 'l': return PRIORITIES.LOW;
        case 'm': return PRIORITIES.MEDIUM;
        case 'h': return PRIORITIES.HIGH;
        case 'c': return PRIORITIES.CRITICAL;
        default: return null;
    }
}

function expandType(input) {
    const normalized = input.toLowerCase();
    
    // Check for exact match first (case-insensitive)
    const exactMatch = Object.values(REQUEST_TYPES).find(t => t.toLowerCase() === normalized);
    if (exactMatch) {
        return exactMatch;
    }
    
    // Check for single letter shortcuts
    switch (normalized) {
        case 'q': return REQUEST_TYPES.QUESTION;
        case 'f': return REQUEST_TYPES.FEATURE;
        case 'b': return REQUEST_TYPES.BUG;
        default: return null;
    }
}

// Helper functions to get enum values as arrays
function getPriorityOptions() {
    return Object.values(PRIORITIES).map(priority => ({
        text: { type: "plain_text", text: capitalize(priority) },
        value: priority
    }));
}

function getStatusOptions() {
    return Object.values(STATUSES).map(status => ({
        text: { type: "plain_text", text: status.split('_').map(capitalize).join(' ') },
        value: status
    }));
}

function getRequestTypeOptions() {
    return Object.values(REQUEST_TYPES).map(type => ({
        text: { type: "plain_text", text: type },
        value: type
    }));
}

// Core request handling logic
async function handleRequest({ client, channel, user, priority, type, messageText }) {
    const normalizedPriority = priority.toLowerCase();
    const normalizedType = type;
    
    await client.chat.postMessage({
        channel,
        text: `🚨 Request: ${normalizedType} | Priority: ${capitalize(normalizedPriority)} | Reporter: <@${user}>`,
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `🚨 ${normalizedType} Request`,
                    emoji: true
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Reported by <@${user}>`
                    }
                ]
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Message:*\n> ${messageText}`
                }
            },
            {
                type: "divider"
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "static_select",
                        placeholder: {
                            type: "plain_text",
                            text: `Status: Open`
                        },
                        action_id: "status_select",
                        initial_option: {
                            text: { type: "plain_text", text: "Open" },
                            value: STATUSES.OPEN
                        },
                        options: getStatusOptions()
                    },
                    {
                        type: "static_select",
                        placeholder: {
                            type: "plain_text",
                            text: `Priority: ${capitalize(normalizedPriority)}`
                        },
                        action_id: "priority_select",
                        initial_option: {
                            text: { type: "plain_text", text: capitalize(normalizedPriority) },
                            value: normalizedPriority
                        },
                        options: getPriorityOptions()
                    },
                    {
                        type: "users_select",
                        placeholder: {
                            type: "plain_text",
                            text: "Assign to..."
                        },
                        action_id: "assignee_select"
                    }
                ]
            }
        ]
    });
}

// Slash command handler
app.command('/request', async ({ command, ack, client }) => {
    try {
        await ack();

        const args = command.text.split(' ');
        if (args.length < 3) {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: `❌ Invalid format. Use \`/request priority_level request_type message\`.\n\nPriority: ${Object.values(PRIORITIES).join(', ')} (or l, m, h, c)\nType: ${Object.values(REQUEST_TYPES).join(', ')} (or q, f, b)`
            });
            return;
        }

        const [priority, type, ...message] = args;
        const messageText = message.join(' ');

        // Expand shortcuts and normalize inputs
        const expandedPriority = expandPriority(priority);
        const expandedType = expandType(type);

        if (!expandedPriority || !expandedType) {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: `❌ Invalid priority or type.\nPriority: ${Object.values(PRIORITIES).join(', ')} (or l, m, h, c)\nType: ${Object.values(REQUEST_TYPES).join(', ')} (or q, f, b)`
            });
            return;
        }

        await handleRequest({
            client,
            channel: command.channel_id,
            user: command.user_id,
            priority: expandedPriority,
            type: expandedType,
            messageText
        });
    } catch (error) {
        console.error(error);
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: "❌ Something went wrong while processing your request."
        });
    }
});

// Catch regular messages not in a thread
app.message(async ({ message, client }) => {
    try {
        if (message.subtype === 'bot_message' || message.thread_ts) return;

        // Get channel info to check the name
        const channelInfo = await client.conversations.info({
            channel: message.channel
        });
        
        const channelName = channelInfo.channel.name.toLowerCase();
        
        // Only intercept messages in channels with specific names
        if (!TARGET_CHANNEL_NAMES.includes(channelName)) {
            return; // Don't intercept messages in other channels
        }

        await client.chat.postEphemeral({
            channel: message.channel,
            user: message.user,
            text: "❗ Please use `/request` to submit a request.",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "❗ It looks like you're trying to send a request without using the `/request` command.\nYou can use the form below instead:"
                    }
                },
                {
                    type: "input",
                    block_id: "priority_input",
                    element: {
                        type: "static_select",
                        action_id: "priority_select",
                        placeholder: {
                            type: "plain_text",
                            text: "Select a priority"
                        },
                        options: getPriorityOptions()
                    },
                    label: {
                        type: "plain_text",
                        text: "Priority"
                    }
                },
                {
                    type: "input",
                    block_id: "type_input",
                    element: {
                        type: "static_select",
                        action_id: "type_select",
                        placeholder: {
                            type: "plain_text",
                            text: "Select request type"
                        },
                        options: getRequestTypeOptions()
                    },
                    label: {
                        type: "plain_text",
                        text: "Request Type"
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Submit as Request"
                            },
                            action_id: "submit_request_button",
                            value: JSON.stringify({ messageTs: message.ts, messageText: message.text })
                        }
                    ]
                }
            ]
        });
    } catch (error) {
        console.error(error);
    }
});

app.action('status_select', async ({ ack, body, client }) => {
    await ack();

    try {
        const selectedStatus = body.actions[0].selected_option.value;
        
        // Only notify when status is set to resolved
        if (selectedStatus === STATUSES.RESOLVED) {
            const messageTs = body.message.ts;
            const channelId = body.channel.id;
            
            // Extract the reporter user ID from the original message
            // Look for the "Reported by <@USER_ID>" in the context block
            const contextBlock = body.message.blocks.find(block => block.type === 'context');
            if (contextBlock && contextBlock.elements && contextBlock.elements[0]) {
                const contextText = contextBlock.elements[0].text;
                const userMatch = contextText.match(/<@(\w+)>/);
                
                if (userMatch) {
                    const reporterUserId = userMatch[1];
                    
                    await client.chat.postMessage({
                        channel: channelId,
                        thread_ts: messageTs,
                        text: `✅ <@${reporterUserId}>, your request has been resolved!`
                    });
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
});

// Button to submit request from form
app.action('submit_request_button', async ({ ack, body, client }) => {
    await ack();

    try {
        const { messageTs, messageText } = JSON.parse(body.actions[0].value);
        const stateValues = body.state?.values || {};

        const priority = stateValues['priority_input']?.['priority_select']?.selected_option?.value;
        const type = stateValues['type_input']?.['type_select']?.selected_option?.value;

        if (!priority || !type) {
            await client.chat.postEphemeral({
                channel: body.channel.id,
                user: body.user.id,
                text: "❌ Please select both a priority and request type before submitting."
            });
            return;
        }

        await handleRequest({
            client,
            channel: body.channel.id,
            user: body.user.id,
            priority,
            type,
            messageText
        });
    } catch (error) {
        console.error(error);
    }
});

app.action('priority_select', async ({ ack, body, client }) => {
    await ack();

    try {
        const selectedPriority = body.actions[0].selected_option.value;
        
        // Only notify when priority is set to critical
        if (selectedPriority === PRIORITIES.CRITICAL) {
            const messageTs = body.message.ts;
            const channelId = body.channel.id;
            
            await client.chat.postMessage({
                channel: channelId,
                thread_ts: messageTs,
                text: `🚨 This request has been escalated to CRITICAL priority!`
            });
        }
    } catch (error) {
        console.error(error);
    }
});

// Handle assignee selection
app.action('assignee_select', async ({ ack, body, client }) => {
    await ack();

    try {
        const selectedUser = body.actions[0].selected_user;
        const messageTs = body.message.ts;
        const channelId = body.channel.id;

        await client.chat.postMessage({
            channel: channelId,
            thread_ts: messageTs,
            text: `<@${selectedUser}>, you've been assigned to this request!`
        });
    } catch (error) {
        console.error(error);
    }
});


// Start app
(async () => {
    try {
        await app.start(process.env.PORT || 3000);
        app.logger.info('⚡️ Bolt app is running!');
    } catch (error) {
        app.logger.error(error);
        process.exit(1);
    }
})();