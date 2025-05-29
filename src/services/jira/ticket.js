const JiraClient = require('./client');
const { config } = require('../../config');
const { getUserDisplayName, getUserEmail } = require('../slack/user');
const { getThreadMessages, getAssigneeFromThread } = require('../slack/thread');
const { createSummary, buildSlackThreadUrl, formatJiraDescription } = require('../../utils/formatters');

async function createJiraTicketFromRequest(messageText, requestType, reporter, assigneeFromBlocks, client, channel, messageTs, teamId) {
    try {
        const jiraClient = new JiraClient();
        
        // Get the actual assignee from the thread
        const assignee = await getAssigneeFromThread(client, channel, messageTs);
        
        // Create summary from message text
        const summary = createSummary(requestType, messageText);
        
        // Get reporter display name
        const reporterName = await getUserDisplayName(client, reporter);
        
        // Get assignee display name if assignee exists
        let assigneeName = '';
        if (assignee) {
            assigneeName = await getUserDisplayName(client, assignee);
        }
        
        // Get thread messages
        const threadMessages = await getThreadMessages(client, channel, messageTs);
        
        // Build Slack thread URL
        const slackThreadUrl = buildSlackThreadUrl(teamId, channel, messageTs);
        
        // Build description
        const fullDescription = formatJiraDescription(
            messageText, 
            reporterName, 
            assigneeName, 
            threadMessages, 
            slackThreadUrl
        );
        
        // Build ticket data
        const ticketData = {
            fields: {
                project: {
                    key: config.jira.projectKey
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
                                    text: fullDescription
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
        
        // Add assignee to Jira ticket if one was found in the thread
        if (assignee) {
            try {
                const userEmail = await getUserEmail(client, assignee);
                if (userEmail) {
                    ticketData.fields.assignee = {
                        emailAddress: userEmail
                    };
                }
            } catch (error) {
                console.log('Could not set assignee in Jira:', error.message);
            }
        }

        const result = await jiraClient.createIssue(ticketData);
        
        if (result.success) {
            return {
                success: true,
                ticket: result.data,
                ticketUrl: jiraClient.buildTicketUrl(result.data.key),
                assignee: assignee
            };
        } else {
            return result;
        }
    } catch (error) {
        console.error('Jira ticket creation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    createJiraTicketFromRequest
};