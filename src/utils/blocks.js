const { PRIORITIES, STATUSES, REQUEST_TYPES, getPriorityOptions, getRequestTypeOptions, getStatusOptions } = require('../constants/enums');
const { capitalize } = require('./formatters');


function buildRequestBlocks(type, user, messageText, priority) {
    return [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: `🚨 ${type} Request`,
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
                        text: `Priority: ${capitalize(priority)}`
                    },
                    action_id: "priority_select",
                    initial_option: {
                        text: { type: "plain_text", text: capitalize(priority) },
                        value: priority
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
    ];
}

function buildInterceptBlocks(messageTs, messageText) {
    return [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "❗ It looks like you're trying to send a request without using the `/request` command.\nYour message has been removed.\nYou can use the form below instead:"
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
                    value: JSON.stringify({ messageTs, messageText })
                }
            ]
        }
    ];
}

function buildJiraTicketBlocks(ticketUrl, ticketKey, requestType, reporter, creator) {
    return [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `🎫 *Jira Ticket Created*\n\n*Ticket:* <${ticketUrl}|${ticketKey}>\n*Type:* ${requestType}\n*Reporter:* <@${reporter}>\n*Created by:* <@${creator}>`
            }
        }
    ];
}

module.exports = {
    getPriorityOptions,
    getStatusOptions,
    getRequestTypeOptions,
    buildRequestBlocks,
    buildInterceptBlocks,
    buildJiraTicketBlocks
};