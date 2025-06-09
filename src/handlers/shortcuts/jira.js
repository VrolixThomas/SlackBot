const { extractRequestFromMessage } = require('../../services/request/parser');
const { createJiraTicketFromRequest } = require('../../services/jira/ticket');
const { buildJiraTicketBlocks } = require('../../utils/blocks');
const { createSummary, buildSlackThreadUrl, formatJiraDescription } = require('../../utils/formatters');
const { getThreadMessages } = require('../../services/slack/thread');

const JiraClient = require('../../services/jira/client');


async function jiraShortcutHandler({ shortcut, ack, client }) {
    try {
        await ack();
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
        
        const jiraClient = new JiraClient();

        // Fetch Jira data for dropdowns with error handling
        let boards = (await jiraClient.GetProjects()).data;
        let users = (await jiraClient.GetUsers()).data;
        let sprints = [];

        // Ensure we have at least some default options
        if (boards.length === 0) {
            boards = [{ id: 'default', name: 'Default Board' }];
        }
        if (users.length === 0) {
            users = [{ accountId: 'unassigned', displayName: 'Unassigned' }];
        }
        if (sprints.length === 0) {
            sprints = [{ id: 'backlog', name: 'Backlog' }];
        }

        const threadMessages = await getThreadMessages(client, shortcut.channel.id, shortcut.message.ts);

        // Open modal with ticket configuration options
        await client.views.open({
            trigger_id: shortcut.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'jira_ticket_modal',
                title: {
                    type: 'plain_text',
                    text: 'Create Jira Ticket'
                },
                submit: {
                    type: 'plain_text',
                    text: 'Create Ticket'
                },
                close: {
                    type: 'plain_text',
                    text: 'Cancel'
                },
                private_metadata: JSON.stringify({
                    channelId: shortcut.channel.id,
                    messageTs: message.ts,
                    teamId: shortcut.team.id,
                    requestDetails: requestDetails
                }),
                blocks: [
                    {
                        type: 'input',
                        block_id: 'summary_input',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'summary',
                            initial_value: requestDetails.messageText.split('\n')[0].substring(0, 100) || '',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter ticket summary'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Summary'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'description_input',
                        element: {
                            type: 'plain_text_input',
                            action_id: 'description',
                            multiline: true,
                            initial_value: formatJiraDescription(requestDetails.messageText, threadMessages)|| '',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Enter ticket description'
                            }
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Description'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'board_select',
                        element: {
                            type: 'static_select',
                            action_id: 'board',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a board'
                            },
                            options: boards.map(board => ({
                                text: {
                                    type: 'plain_text',
                                    text: board
                                },
                                value: board
                            }))
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Board'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'assignee_select',
                        element: {
                            type: 'static_select',
                            action_id: 'assignee',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select a assignee'
                            },
                            options: users.map(assignee => ({
                                text: {
                                    type: 'plain_text',
                                    text: assignee
                                },
                                value: assignee
                            }))
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Assignee'
                        }
                    },
                    
                    {
                        type: 'input',
                        block_id: 'priority_select',
                        element: {
                            type: 'static_select',
                            action_id: 'priority',
                            placeholder: {
                                type: 'plain_text',
                                text: 'Select priority'
                            },
                            initial_option: {
                                text: {
                                    type: 'plain_text',
                                    text: 'Medium'
                                },
                                value: 'Medium'
                            },
                            options: [
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Highest'
                                    },
                                    value: 'Highest'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'High'
                                    },
                                    value: 'High'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Medium'
                                    },
                                    value: 'Medium'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Low'
                                    },
                                    value: 'Low'
                                },
                                {
                                    text: {
                                        type: 'plain_text',
                                        text: 'Lowest'
                                    },
                                    value: 'Lowest'
                                }
                            ]
                        },
                        label: {
                            type: 'plain_text',
                            text: 'Priority'
                        }
                    }
                ]
            }
        });

    } catch (error) {
        console.error('Message shortcut error:', error);
        await client.chat.postEphemeral({
            channel: shortcut.channel.id,
            user: shortcut.user.id,
            text: "❌ Something went wrong while opening the ticket configuration."
        });
    }
}

// Handler for modal submission
async function handleJiraTicketModalSubmission({ ack, body, view, client }) {
    try {
        await ack();

        const privateMetadata = JSON.parse(view.private_metadata);
        const { channelId, messageTs, teamId, requestDetails } = privateMetadata;

        // Extract form values
        const values = view.state.values;
        const summary = values.summary_input.summary.value;
        const description = values.description_input.description.value;
        const boardId = values.board_select.board.selected_option.value;
        const assigneeId = values.assignee_select.assignee.selected_option.value;
        //const sprintId = values.sprint_select.sprint.selected_option?.value;
        //const priority = values.priority_select.priority.selected_option.value;

        // Create Jira ticket with the configured options
        const result = await createJiraTicketFromRequest(
            summary,
            description,
            requestDetails.reporter,
            assigneeId,
            boardId,
            client,
            channelId,
            messageTs,
            teamId
        );

        if (result.success) {
            // Post success message as a thread reply
            await client.chat.postMessage({
                channel: channelId,
                thread_ts: messageTs,
                text: `🎫 Jira ticket created from request!`,
                blocks: buildJiraTicketBlocks(
                    result.ticketUrl,
                    result.ticket.key,
                    requestDetails.requestType,
                    requestDetails.reporter,
                    body.user.id
                )
            });
        } else {
            await client.chat.postEphemeral({
                channel: channelId,
                user: body.user.id,
                text: `❌ Failed to create Jira ticket: ${JSON.stringify(result.error)}`
            });
        }

    } catch (error) {
        console.error('Modal submission error:', error);
        await client.chat.postEphemeral({
            channel: privateMetadata?.channelId || body.user.id,
            user: body.user.id,
            text: "❌ Something went wrong while creating the Jira ticket."
        });
    }
}

module.exports = {
    jiraShortcutHandler,
    handleJiraTicketModalSubmission
};