// handlers/commands/standup.js

const JiraClient = require('../../services/jira/client');

// Function to format status with brackets and styling
const formatStatus = (status) => {
    return `*[${status.toUpperCase()}]*`;
};

// Function to parse time string and convert to Unix timestamp
const parseScheduleTime = (timeString) => {
    if (!timeString) return null;
    
    // Match formats like 0900, 09:00, 9:00, 18:30, etc.
    const timeMatch = timeString.match(/^(\d{1,2}):?(\d{2})$/);
    if (!timeMatch) return null;
    
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    
    // Validate time
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    
    // Create a Date object for today at the specified time
    const now = new Date();
    let scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    
    // If the time has already passed today, schedule for next day
    if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    // Skip weekends - if it falls on Saturday (6) or Sunday (0), move to Monday
    while (scheduledTime.getDay() === 0 || scheduledTime.getDay() === 6) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    // Return Unix timestamp
    return Math.floor(scheduledTime.getTime() / 1000);
};

const standupCommandHandler = async ({ command, ack, client, body }) => {
    await ack();

    const userId = body.user_id;
    const userName = body.user_name;
    const commandText = command.text || '';
    
    // Parse the schedule time from command text
    const scheduleTime = parseScheduleTime(commandText.trim());
    
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

    // Create modal title based on whether it's scheduled or not
    const modalTitle = scheduleTime ? "Schedule Daily Standup" : "Daily Standup";
    const scheduledTimeString = scheduleTime ? new Date(scheduleTime * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    }) : null;

    const modal = {
        type: "modal",
        callback_id: "standup_modal",
        private_metadata: JSON.stringify({
            channel_id: command.channel_id,
            user_name: userName,
            jira_accountId: jirauser_accoundId,
            schedule_time: scheduleTime
        }),
        title: {
            type: "plain_text",
            text: modalTitle
        },
        submit: {
            type: "plain_text",
            text: scheduleTime ? "Schedule" : "Submit"
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
                    text: `*${modalTitle} for ${userName}*\n_${new Date().toDateString()}_${scheduleTime ? `\n:clock1: *Scheduled for: ${scheduledTimeString}*` : ''}`
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
            }
        ]
    };

    // Validate schedule time and show error if invalid
    if (commandText.trim() && !scheduleTime) {
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: userId,
            text: `Invalid time format: "${commandText.trim()}". Please use format like 0900, 09:00, or 1830.`
        });
        return;
    }

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