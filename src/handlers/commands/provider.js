// handlers/commands/provider.js

const { providerTicketTemplates, migrationTicketTemplates } = require('../../config/ticketTemplates');
const { providerConfig } = require('../../config/providerConfig');

const providerCommandHandler = async ({ command, ack, client, body }) => {
    await ack();

    const userId = body.user_id;

    // Use hardcoded config instead of API calls
    const users = providerConfig.users;
    const projectKey = providerConfig.projectKey;

    const modal = {
        type: "modal",
        callback_id: "provider_modal",
        private_metadata: JSON.stringify({
            channel_id: command.channel_id,
            user_id: userId,
            project_key: projectKey
        }),
        title: {
            type: "plain_text",
            text: "Create Epic & Tasks"
        },
        submit: {
            type: "plain_text",
            text: "Create"
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
                    text: `*Create Provider Epic*\n_Project: ${projectKey}_`
                }
            },
            {
                type: "divider"
            },
            {
                type: "input",
                block_id: "provider_code",
                element: {
                    type: "plain_text_input",
                    action_id: "provider_code_input",
                    placeholder: {
                        type: "plain_text",
                        text: "e.g., ACME, XYZ"
                    }
                },
                label: {
                    type: "plain_text",
                    text: "Provider Code"
                },
                hint: {
                    type: "plain_text",
                    text: "Epic will be created as '{ProviderCode} Integration'"
                }
            },
            {
                type: "input",
                block_id: "migration_toggle",
                element: {
                    type: "checkboxes",
                    action_id: "migration_toggle_input",
                    options: [
                        {
                            text: {
                                type: "plain_text",
                                text: "This is a migration from old project"
                            },
                            value: "is_migration"
                        }
                    ]
                },
                label: {
                    type: "plain_text",
                    text: "Migration"
                },
                optional: true
            },
            {
                type: "input",
                block_id: "assignee_select",
                element: {
                    type: "static_select",
                    action_id: "assignee_select_input",
                    placeholder: {
                        type: "plain_text",
                        text: "Select assignee"
                    },
                    options: users.map(user => ({
                        text: {
                            type: "plain_text",
                            text: user.displayName
                        },
                        value: user.accountId
                    }))
                },
                label: {
                    type: "plain_text",
                    text: "Assignee (for all tickets)"
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Base Tasks (always created):*\n${providerTicketTemplates.map((t, i) => `${i + 1}. ${t.summary}`).join('\n')}\n\n*Additional Migration Tasks (if migration checked):*\n${migrationTicketTemplates.map((t, i) => `${i + 1}. ${t.summary}`).join('\n')}\n\n_Note: {PROVIDER_CODE} will be replaced with your provider code_`
                }
            }
        ]
    };

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: modal
        });
    } catch (error) {
        console.error('Error opening provider modal:', error);
        console.error('Modal structure:', JSON.stringify(modal, null, 2));

        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: userId,
            text: `Sorry, there was an error opening the provider modal. ${error.message}`
        });
    }
};

module.exports = providerCommandHandler;
