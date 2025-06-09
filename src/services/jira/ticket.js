const JiraClient = require('./client');
const { config } = require('../../config');
const { buildSlackThreadUrl } = require('../../utils/formatters');

async function createJiraTicketFromRequest(summary, description, reporter, assignee, board, client, channel, messageTs, teamId) {
    try {
        const jiraClient = new JiraClient();        
        
        // Build Slack thread URL
        const slackThreadUrl = buildSlackThreadUrl(teamId, channel, messageTs);
        description += `\n\n**Slack Thread:** ${slackThreadUrl}`;

        // Build ticket data
        const ticketData = {
            fields: {
                project: {
                    key: board
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
                                    text: description
                                }
                            ]
                        }
                    ]
                },
                assignee: {
                    accountId: (await jiraClient.GetUserAccountId(assignee)).data
                },
                issuetype: {
                    name: "Task"
                }
            }
        };

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