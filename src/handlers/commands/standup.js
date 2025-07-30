// handlers/commands/standup.js

const { getMockBitbucketPRs } = require('../../utils/mockData');
const JiraClient = require('../../services/jira/client');
const BitbucketClient = require('../../services/bitbucket/client');


// Function to format status with brackets and styling
const formatStatus = (status) => {
    return `*[${status.toUpperCase()}]*`;
};

const standupCommandHandler = async ({ command, ack, client, body }) => {
    await ack();

    const userId = body.user_id;
    const userName = body.user_name;
    
    // Get user's email from Slack (assuming it matches Jira email)
    let last_name;
    try {
        const userInfo = await client.users.info({ user: userId });
        last_name = userInfo.user.profile.last_name;
    } catch (error) {
        console.error('Error fetching user email:', error);
        last_name = null;
    }
   

    // Get real Jira data and mock Bitbucket data
    const jiraClient = new JiraClient();
    let jiraTickets = { success: false, data: [] };
    var jirauser_accoundId = await jiraClient.GetUserAccountId(last_name)

    if (jirauser_accoundId) {
        try {
            jiraTickets = await jiraClient.getCurrentSprintTicketsForUser(jirauser_accoundId);
        } catch (error) {
            console.error('Error fetching Jira tickets:', error);
        }
    }
    
    //const bitbucketPRs = await bitbucketClient.getOpenPRsForUser(jirauser_accoundId);
    // Build Jira ticket options for select menus with status indicators
    const jiraOptions = jiraTickets.success && jiraTickets.data && jiraTickets.data.length > 0 ? 
        jiraTickets.data.map(ticket => {
            const statusFormatted = formatStatus(ticket.status);
            const displayText = `${statusFormatted} ${ticket.key}: ${ticket.summary}`;
            const truncatedText = displayText.slice(0, 75); // Slack has a 75 char limit
            
            return {
                text: {
                    type: "plain_text",
                    text: truncatedText
                },
                value: `${ticket.key}|${ticket.summary}|${ticket.status}`.slice(0, 75) // Include status in value
            };
        }) : 
        [{
            text: {
                type: "plain_text",
                text: "No tickets found"
            },
            value: "no_tickets"
        }];

    // Build PR display blocks
    // const prBlocks = bitbucketPRs.data.map(pr => ({
    //     type: "section",
    //     text: {
    //         type: "mrkdwn",
    //         text: `• <${pr.url}|${pr.title}> - ${pr.repository} (${pr.status})`
    //     }
    // }));

    const modal = {
        type: "modal",
        callback_id: "standup_modal",
        private_metadata: JSON.stringify({
            channel_id: command.channel_id,
            user_name: userName,
            jira_accountId: jirauser_accoundId
        }),
        title: {
            type: "plain_text",
            text: "Daily Standup"
        },
        submit: {
            type: "plain_text",
            text: "Submit"
        },
        close: {
            type: "plain_text",
            text: "Cancel"
        },
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Daily Standup for ${userName}*\n_${new Date().toDateString()}_`
                }
            },
            {
                type: "divider"
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Yesterday*"
                }
            },
            {
                type: "input",
                block_id: "yesterday_text",
                element: {
                    type: "plain_text_input",
                    action_id: "yesterday_text_input",
                    placeholder: {
                        type: "plain_text",
                        text: "What did you work on yesterday?"
                    },
                    multiline: true
                },
                label: {
                    type: "plain_text",
                    text: "Yesterday's work"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "Select Jira tickets from current sprint:"
                }
            },
            {
                type: "input",
                block_id: "yesterday_jira",
                element: {
                    type: "multi_static_select",
                    action_id: "yesterday_jira_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Select Jira tickets"
                    },
                    options: jiraOptions
                },
                label: {
                    type: "plain_text",
                    text: "Yesterday's Jira tickets"
                },
                optional: true
            },
            {
                type: "divider"
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Today*"
                }
            },
            {
                type: "input",
                block_id: "today_text",
                element: {
                    type: "plain_text_input",
                    action_id: "today_text_input",
                    placeholder: {
                        type: "plain_text",
                        text: "What will you work on today?"
                    },
                    multiline: true
                },
                label: {
                    type: "plain_text",
                    text: "Today's work"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "Select Jira tickets from current sprint:"
                }
            },
            {
                type: "input",
                block_id: "today_jira",
                element: {
                    type: "multi_static_select",
                    action_id: "today_jira_select",
                    placeholder: {
                        type: "plain_text",
                        text: "Select Jira tickets"
                    },
                    options: jiraOptions
                },
                label: {
                    type: "plain_text",
                    text: "Today's Jira tickets"
                },
                optional: true
            },
            {
                type: "divider"
            },
            {
                type: "input",
                block_id: "blockers",
                element: {
                    type: "plain_text_input",
                    action_id: "blockers_input",
                    placeholder: {
                        type: "plain_text",
                        text: "Any blockers or impediments?"
                    },
                    multiline: true
                },
                label: {
                    type: "plain_text",
                    text: "Blockers"
                },
                optional: true
            },
            {
                type: "input",
                block_id: "urgent",
                element: {
                    type: "plain_text_input",
                    action_id: "urgent_input",
                    placeholder: {
                        type: "plain_text",
                        text: "Anything urgent that needs attention?"
                    },
                    multiline: true
                },
                label: {
                    type: "plain_text",
                    text: "Urgent items"
                },
                optional: true
            },
            {
                type: "divider"
            },
            // {
            //     type: "section",
            //     text: {
            //         type: "mrkdwn",
            //         text: "*Open Pull Requests*"
            //     }
            // },
            // ...(prBlocks.length > 0 ? prBlocks : [{
            //     type: "section",
            //     text: {
            //         type: "mrkdwn",
            //         text: "_No open pull requests_"
            //     }
            // }])
        ]
    };

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: modal
        });
    } catch (error) {
        console.error('Error opening standup modal:', error);
        console.error('Modal structure:', JSON.stringify(modal, null, 2));
        
        // Send error message to user
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: userId,
            text: `Sorry, there was an error opening the standup modal. ${error.message}`
        });
    }
};

module.exports = standupCommandHandler;