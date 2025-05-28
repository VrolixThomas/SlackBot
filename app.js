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

// Add this after your existing dependencies
// Add this after your existing dependencies
const axios = require('axios');

// Helper function to extract request details from message
function extractRequestFromMessage(message) {
    if (!message.blocks) return null;
    
    // Check if this is a request message (has header with "Request")
    const headerBlock = message.blocks.find(block => 
        block.type === 'header' && 
        block.text?.text?.includes('Request')
    );
    
    if (!headerBlock) return null;
    
    // Extract message text from section block
    const sectionBlock = message.blocks.find(block => 
        block.type === 'section' && 
        block.text?.text?.includes('*Message:*')
    );
    
    let messageText = '';
    if (sectionBlock) {
        messageText = sectionBlock.text.text
            .replace('*Message:*\n> ', '')
            .replace(/\n>/g, '\n')
            .replace(/&gt;/g, '') // Remove HTML entities
            .trim();
    }
    
    // Extract request type from header
    let requestType = 'Task';
    const headerText = headerBlock.text.text;
    if (headerText.includes('Question')) requestType = 'Question';
    else if (headerText.includes('Feature')) requestType = 'Feature';
    else if (headerText.includes('Bug')) requestType = 'Bug';
    
    // Extract reporter from context block
    let reporter = '';
    const contextBlock = message.blocks.find(block => block.type === 'context');
    if (contextBlock && contextBlock.elements && contextBlock.elements[0]) {
        const contextText = contextBlock.elements[0].text;
        const userMatch = contextText.match(/<@(\w+)>/);
        if (userMatch) {
            reporter = userMatch[1];
        }
    }
    
    return {
        messageText,
        requestType,
        reporter,
        isValidRequest: true
    };
}

// Function to create Jira ticket from request message
async function createJiraTicketFromRequest(messageText, requestType, reporter) {
    try {
        // Clean the message text - remove newlines and extra whitespace
        const cleanMessageText = messageText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Create summary from first part of message (max 80 chars, no newlines)
        const summary = `${requestType}: ${cleanMessageText.substring(0, 80)}${cleanMessageText.length > 80 ? '...' : ''}`;
        
        // For description, preserve the original formatting but clean it up
        const cleanDescription = messageText.trim();
        
        const ticketData = {
            fields: {
                project: {
                    key: process.env.JIRA_PROJECT_KEY
                },
                summary: summary,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: cleanDescription
                                }
                            ]
                        }
                    ]
                },
                issuetype: {
                    name: "Task"
                }
            }
        };

        const response = await axios.post(
            `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
            ticketData,
            {
                auth: {
                    username: process.env.JIRA_EMAIL,
                    password: process.env.JIRA_API_TOKEN
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            ticket: response.data,
            ticketUrl: `${process.env.JIRA_BASE_URL}/browse/${response.data.key}`
        };
    } catch (error) {
        console.error('Jira ticket creation failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.errors || error.message
        };
    }
}

// Simple function to create a test Jira ticket
async function createSimpleJiraTicket(summary) {
    try {
        const ticketData = {
            fields: {
                project: {
                    key: process.env.JIRA_PROJECT_KEY
                },
                summary: summary,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: "This is a test"
                                }
                            ]
                        }
                    ]
                },
                issuetype: {
                    name: "Task"  // Using Task as default issue type
                }
            }
        };

        const response = await axios.post(
            `${process.env.JIRA_BASE_URL}/rest/api/3/issue`,
            ticketData,
            {
                auth: {
                    username: process.env.JIRA_EMAIL,
                    password: process.env.JIRA_API_TOKEN
                },
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            ticket: response.data,
            ticketUrl: `${process.env.JIRA_BASE_URL}/browse/${response.data.key}`
        };
    } catch (error) {
        console.error('Jira ticket creation failed:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.errors || error.message
        };
    }
}

// Simple test shortcut - just creates a basic ticket
app.shortcut('test_jira_shortcut', async ({ shortcut, ack, client }) => {
    try {
        await ack();

        console.log('Test shortcut triggered'); // Debug log

        // Create a simple test ticket
        const result = await createSimpleJiraTicket("Test ticket from message shortcut");

        if (result.success) {
            await client.chat.postEphemeral({
                channel: shortcut.channel.id,
                user: shortcut.user.id,
                text: `✅ Test ticket created: ${result.ticket.key} - ${result.ticketUrl}`
            });
        } else {
            await client.chat.postEphemeral({
                channel: shortcut.channel.id,
                user: shortcut.user.id,
                text: `❌ Failed to create test ticket: ${JSON.stringify(result.error)}`
            });
        }

    } catch (error) {
        console.error('Test shortcut error:', error);
        await client.chat.postEphemeral({
            channel: shortcut.channel.id,
            user: shortcut.user.id,
            text: "❌ Test shortcut failed"
        });
    }
});

// Message shortcut handler for creating Jira tickets
app.shortcut('create_jira_ticket', async ({ shortcut, ack, client }) => {
    try {
        await ack();

        console.log('Shortcut triggered:', JSON.stringify(shortcut, null, 2)); // Debug log

        // Get the message that the shortcut was triggered on
        const message = shortcut.message;
        
        if (!message) {
            await client.chat.postEphemeral({
                channel: shortcut.channel.id,
                user: shortcut.user.id,
                text: "❌ Could not access the message. Please try again."
            });
            return;
        }

        // Extract request details from the message
        const requestDetails = extractRequestFromMessage(message);
        
        if (!requestDetails || !requestDetails.isValidRequest) {
            await client.chat.postEphemeral({
                channel: shortcut.channel.id,
                user: shortcut.user.id,
                text: "❌ This message is not a valid request created with `/request`. Please use this shortcut only on request messages."
            });
            return;
        }

        if (!requestDetails.messageText) {
            await client.chat.postEphemeral({
                channel: shortcut.channel.id,
                user: shortcut.user.id,
                text: "❌ Could not extract message content from this request."
            });
            return;
        }

        // Create Jira ticket
        const result = await createJiraTicketFromRequest(
            requestDetails.messageText,
            requestDetails.requestType,
            requestDetails.reporter
        );

        if (result.success) {
            // Post success message as a thread reply
            await client.chat.postMessage({
                channel: shortcut.channel.id,
                thread_ts: message.ts,
                text: `🎫 Jira ticket created from request!`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `🎫 *Jira Ticket Created*\n\n*Ticket:* <${result.ticketUrl}|${result.ticket.key}>\n*Type:* ${requestDetails.requestType}\n*Reporter:* <@${requestDetails.reporter}>\n*Created by:* <@${shortcut.user.id}>`
                        }
                    }
                ]
            });

            // Also send ephemeral confirmation to the user who triggered it
            await client.chat.postEphemeral({
                channel: shortcut.channel.id,
                user: shortcut.user.id,
                text: `✅ Successfully created Jira ticket: ${result.ticket.key}`
            });

        } else {
            await client.chat.postEphemeral({
                channel: shortcut.channel.id,
                user: shortcut.user.id,
                text: `❌ Failed to create Jira ticket: ${JSON.stringify(result.error)}`
            });
        }

    } catch (error) {
        console.error('Message shortcut error:', error);
        await client.chat.postEphemeral({
            channel: shortcut.channel.id,
            user: shortcut.user.id,
            text: "❌ Something went wrong while creating the Jira ticket."
        });
    }
});

// Add this command handler after your existing /request command
app.command('/createticket', async ({ command, ack, client }) => {
    try {
        await ack();

        const summary = command.text.trim() || "Test ticket from Slack";

        // Create the Jira ticket
        const result = await createSimpleJiraTicket(summary);

        if (result.success) {
            await client.chat.postMessage({
                channel: command.channel_id,
                text: `✅ Jira ticket created successfully!`,
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `🎫 *Jira Ticket Created*\n\n*Ticket:* <${result.ticketUrl}|${result.ticket.key}>\n*Summary:* ${summary}\n*Description:* This is a test\n*Created by:* <@${command.user_id}>`
                        }
                    }
                ]
            });
        } else {
            await client.chat.postEphemeral({
                channel: command.channel_id,
                user: command.user_id,
                text: `❌ Failed to create Jira ticket: ${JSON.stringify(result.error)}`
            });
        }

    } catch (error) {
        console.error('Create ticket command error:', error);
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: command.user_id,
            text: "❌ Something went wrong while creating the Jira ticket."
        });
    }
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