// handlers/modals/provider.js

const JiraClient = require('../../services/jira/client');
const { providerTicketTemplates, migrationTicketTemplates } = require('../../config/ticketTemplates');

const handleProviderModalSubmission = async ({ ack, body, client, view }) => {
    await ack();

    const userId = body.user.id;
    const userName = body.user.name;

    // Get metadata
    const metadata = JSON.parse(view.private_metadata);
    const channelId = metadata.channel_id;
    const projectKey = metadata.project_key;

    // Extract form values
    const values = view.state.values;
    const providerCode = values.provider_code?.provider_code_input?.value || '';
    const assigneeAccountId = values.assignee_select?.assignee_select_input?.selected_option?.value || '';
    const assigneeDisplayName = values.assignee_select?.assignee_select_input?.selected_option?.text?.text || 'Unknown';

    // Check if migration toggle is checked
    const isMigration = values.migration_toggle?.migration_toggle_input?.selected_options?.length > 0;

    // Build epic name from provider code
    const epicName = `${providerCode} Integration`;

    // Build ticket list: always include base tickets, add migration tickets if checked
    const ticketTemplates = [...providerTicketTemplates];
    if (isMigration) {
        ticketTemplates.push(...migrationTicketTemplates);
    }

    // Function to replace provider code placeholder in text
    const replaceProviderCode = (text) => {
        return text.replace(/{PROVIDER_CODE}/g, providerCode);
    };

    const jiraClient = new JiraClient();

    try {
        // Send initial message to user
        await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: `:hourglass_flowing_sand: Creating Epic "${epicName}" with ${ticketTemplates.length} tasks (${providerTicketTemplates.length} base${isMigration ? ` + ${migrationTicketTemplates.length} migration` : ''})...`
        });

        // Create the Epic
        const epicResult = await jiraClient.createEpic(projectKey, epicName, assigneeAccountId);

        if (!epicResult.success) {
            await client.chat.postEphemeral({
                channel: channelId,
                user: userId,
                text: `Failed to create Epic: ${JSON.stringify(epicResult.error)}`
            });
            return;
        }

        const epicKey = epicResult.data.key;
        const epicUrl = epicResult.data.url;

        // Create all tasks
        const createdTasks = [];
        const failedTasks = [];

        for (const template of ticketTemplates) {
            // Replace {PROVIDER_CODE} in summary and description
            const taskSummary = replaceProviderCode(template.summary);
            const taskDescription = replaceProviderCode(template.description);

            // Use custom epic key if specified in template, otherwise use the main epic
            const targetEpicKey = template.epicKey || epicKey;

            const taskResult = await jiraClient.createTaskInEpic(
                projectKey,
                taskSummary,
                taskDescription,
                targetEpicKey,
                assigneeAccountId,
                template.storyPoints
            );

            if (taskResult.success) {
                createdTasks.push({
                    key: taskResult.data.key,
                    url: taskResult.data.url,
                    summary: taskSummary
                });
            } else {
                failedTasks.push({
                    summary: taskSummary,
                    error: taskResult.error
                });
            }
        }

        // Build success message blocks
        const messageBlocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `:white_check_mark: *Provider Epic Created Successfully*`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Epic:* <${epicUrl}|${epicKey}>: ${epicName}\n*Provider Code:* ${providerCode}\n*Type:* ${isMigration ? 'Migration' : 'New Provider'}\n*Project:* ${projectKey}\n*Assignee:* ${assigneeDisplayName}\n*Tasks Created:* ${createdTasks.length}/${ticketTemplates.length} (${providerTicketTemplates.length} base${isMigration ? ` + ${migrationTicketTemplates.length} migration` : ''})`
                }
            },
            {
                type: "divider"
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Created Tasks:*"
                }
            }
        ];

        // Add created tasks to message
        if (createdTasks.length > 0) {
            const tasksList = createdTasks.map((task, index) =>
                `${index + 1}. <${task.url}|${task.key}>: ${task.summary}`
            ).join('\n');

            messageBlocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: tasksList
                }
            });
        }

        // Add failed tasks if any
        if (failedTasks.length > 0) {
            messageBlocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `:warning: *Failed Tasks (${failedTasks.length}):*\n${failedTasks.map(t => `• ${t.summary}: ${JSON.stringify(t.error)}`).join('\n')}`
                }
            });
        }

        // Post success message to channel
        await client.chat.postMessage({
            channel: channelId,
            blocks: messageBlocks,
            text: `Epic ${epicKey} created with ${createdTasks.length} tasks by ${userName}`
        });

    } catch (error) {
        console.error('Error creating provider epic and tasks:', error);

        await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: `Sorry, there was an error creating the Epic and tasks. ${error.message}`
        });
    }
};

module.exports = { handleProviderModalSubmission };
