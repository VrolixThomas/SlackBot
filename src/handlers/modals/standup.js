// handlers/modals/standup.js

const BitbucketClient = require('../../services/bitbucket/client');
const JiraClient = require('../../services/jira/client');

// Function to format status with brackets and styling
const formatStatus = (status) => {
    return `*[${status.toUpperCase()}]*`;
};

const handleStandupModalSubmission = async ({ ack, body, client, view }) => {
    await ack();
    const bitbucketClient = new BitbucketClient()
    const userId = body.user.id;
    const userName = body.user.name;
    
    // Get channel info from private_metadata
    const metadata = JSON.parse(view.private_metadata);
    const channelId = metadata.channel_id;
    const jira_accountId = metadata.jira_accountId;

    const bitbucketPRs = await bitbucketClient.getOpenPRsForUser(jira_accountId);
    
    // Extract form values
    const values = view.state.values;
    
    const yesterdayText = values.yesterday_text?.yesterday_text_input?.value || '';
    const yesterdayJira = values.yesterday_jira?.yesterday_jira_select?.selected_options || [];
    
    const todayText = values.today_text?.today_text_input?.value || '';
    const todayJira = values.today_jira?.today_jira_select?.selected_options || [];
    
    const blockers = values.blockers?.blockers_input?.value || '';
    const urgent = values.urgent?.urgent_input?.value || '';

    // Build the standup message
    const standupBlocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Daily Standup - ${userName}*\n_${new Date().toDateString()}_`
            }
        },
        {
            type: "divider"
        }
    ];

    // Yesterday section
    standupBlocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: ":white_check_mark: *Yesterday:*"
        }
    });

    if (yesterdayText) {
        standupBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: yesterdayText
            }
        });
    }

    if (yesterdayJira.length > 0) {
        const jiraClient = new JiraClient();
        const jiraList = yesterdayJira.map(ticket => {
            // Parse the value which now includes status: key|summary|status
            const parts = ticket.value.split('|');
            const key = parts[0];
            const summary = parts[1];
            const status = parts[2] || 'Unknown'; // Fallback if status not present
            
            const statusFormatted = formatStatus(status);
            const ticketUrl = jiraClient.buildTicketUrl(key);
            return `• ${statusFormatted} <${ticketUrl}|${key}>: ${summary}`;
        }).join('\n');
        
        standupBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Jira Tickets:*\n${jiraList}`
            }
        });
    }

    // Today section
    standupBlocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: ":dart: *Today:*"
        }
    });

    if (todayText) {
        standupBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: todayText
            }
        });
    }

    if (todayJira.length > 0) {
        const jiraClient = new JiraClient();
        const jiraList = todayJira.map(ticket => {
            // Parse the value which now includes status: key|summary|status
            const parts = ticket.value.split('|');
            const key = parts[0];
            const summary = parts[1];
            const status = parts[2] || 'Unknown'; // Fallback if status not present
            
            const statusFormatted = formatStatus(status);
            const ticketUrl = jiraClient.buildTicketUrl(key);
            return `• ${statusFormatted} <${ticketUrl}|${key}>: ${summary}`;
        }).join('\n');
        
        standupBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Jira Tickets:*\n${jiraList}`
            }
        });
    }

    // Blockers section
    if (blockers) {
        standupBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `:construction: *Blockers:*\n${blockers}`
            }
        });
    }

    // Urgent section
    if (urgent) {
        standupBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `:bangbang: *Urgent:*\n${urgent}`
            }
        });
    }

    // Open PRs section
    if (bitbucketPRs.data.length > 0) {
        const prList = bitbucketPRs.data.map(pr => 
            `• <${pr.url}|${pr.title}> - ${pr.repository} (${pr.status})`
        ).join('\n');
        
        standupBlocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Open Pull Requests:*\n${prList}`
            }
        });
    }

    // Add reaction section
    standupBlocks.push({
        type: "divider"
    });

    standupBlocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: "_React with :white_check_mark: when you've read this standup_"
        }
    });

    try {
        // Post the standup message
        const result = await client.chat.postMessage({
            channel: channelId,
            blocks: standupBlocks,
            text: `Daily Standup - ${userName} - ${new Date().toDateString()}`
        });

        // Add the checkmark reaction automatically
        await client.reactions.add({
            channel: channelId,
            timestamp: result.ts,
            name: 'white_check_mark'
        });

        console.log('Standup posted successfully');
    } catch (error) {
        console.error('Error posting standup:', error);
    }
};

module.exports = { handleStandupModalSubmission };