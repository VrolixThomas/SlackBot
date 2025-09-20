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
    const scheduleTime = metadata.schedule_time; // Unix timestamp or null

    const bitbucketPRs = await bitbucketClient.getOpenPRsForUser(jira_accountId);
    
    // Extract form values
    const values = view.state.values;
    
    const yesterdayText = values.yesterday_text?.yesterday_text_input?.value || '';
    const yesterdayJira = values.yesterday_jira?.yesterday_jira_select?.selected_options || [];
    
    const todayText = values.today_text?.today_text_input?.value || '';
    const todayJira = values.today_jira?.today_jira_select?.selected_options || [];
    
    const blockers = values.blockers?.blockers_input?.value || '';
    const urgent = values.urgent?.urgent_input?.value || '';

    // Determine the date to show - either scheduled date or current date
    const displayDate = scheduleTime ? new Date(scheduleTime * 1000).toDateString() : new Date().toDateString();

    // Build the standup message
    const standupBlocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Daily Standup - ${userName}*\n_${displayDate}_`
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

    const messagePayload = {
        channel: channelId,
        blocks: standupBlocks,
        text: `Daily Standup - ${userName} - ${displayDate}`
    };

    try {
        let result;
        
        if (scheduleTime) {
            // Schedule the message for the specified time
            result = await client.chat.scheduleMessage({
                ...messagePayload,
                post_at: scheduleTime
            });
            
            // Send confirmation to user
            const scheduledTimeString = new Date(scheduleTime * 1000).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            await client.chat.postEphemeral({
                channel: channelId,
                user: userId,
                text: `:clock1: Your standup has been scheduled for *${scheduledTimeString}*`
            });
            
            console.log(`Standup scheduled for ${scheduledTimeString}`);
        } else {
            // Post the message immediately
            result = await client.chat.postMessage(messagePayload);
            
            // Add the checkmark reaction automatically for immediate posts
            await client.reactions.add({
                channel: channelId,
                timestamp: result.ts,
                name: 'white_check_mark'
            });
            
            console.log('Standup posted successfully');
        }

    } catch (error) {
        console.error('Error posting/scheduling standup:', error);
        
        // Send error message to user
        await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: `Sorry, there was an error ${scheduleTime ? 'scheduling' : 'posting'} your standup. ${error.message}`
        });
    }
};

module.exports = { handleStandupModalSubmission };