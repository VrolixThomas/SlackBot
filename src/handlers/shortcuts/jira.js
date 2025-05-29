const { extractRequestFromMessage } = require('../../services/request/parser');
const { createJiraTicketFromRequest } = require('../../services/jira/ticket');
const { buildJiraTicketBlocks } = require('../../utils/blocks');

async function jiraShortcutHandler({ shortcut, ack, client }) {
    try {
        await ack();

        console.log('Shortcut triggered:', JSON.stringify(shortcut, null, 2));

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

        console.log('The assignee is:', requestDetails.assignee);

        // Create Jira ticket
        const result = await createJiraTicketFromRequest(
            requestDetails.messageText,
            requestDetails.requestType,
            requestDetails.reporter,
            requestDetails.assignee,
            client,
            shortcut.channel.id,
            message.ts,
            shortcut.team.id
        );

        if (result.success) {
            // Post success message as a thread reply
            await client.chat.postMessage({
                channel: shortcut.channel.id,
                thread_ts: message.ts,
                text: `🎫 Jira ticket created from request!`,
                blocks: buildJiraTicketBlocks(
                    result.ticketUrl,
                    result.ticket.key,
                    requestDetails.requestType,
                    requestDetails.reporter,
                    shortcut.user.id
                )
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
}

module.exports = jiraShortcutHandler;