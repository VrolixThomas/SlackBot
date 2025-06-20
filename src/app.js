const { App } = require('@slack/bolt');
const { config, validateConfig } = require('./config');

// Import handlers
const requestCommandHandler = require('./handlers/commands/request.js');
const statusActionHandler = require('./handlers/actions/status.js');
const priorityActionHandler = require('./handlers/actions/priority.js');
const assigneeActionHandler = require('./handlers/actions/assignee.js');
const submitActionHandler = require('./handlers/actions/submit.js');
const messageInterceptHandler = require('./handlers/messages/intercept.js');
const { transferShortcutHandler, handleTransferModal } = require('./handlers/shortcuts/transfer');
const { jiraShortcutHandler, handleJiraTicketModalSubmission } = require('./handlers/shortcuts/jira');


// Validate configuration
try {
    validateConfig();
} catch (error) {
    console.error('Configuration error:', error.message);
    process.exit(1);
}

// Initialize Slack app
const app = new App({
    token: config.slack.botToken,
    signingSecret: config.slack.signingSecret,
    socketMode: true,
    appToken: config.slack.appToken
});

// Register handlers
app.command('/request', requestCommandHandler);
app.shortcut('create_jira_ticket', jiraShortcutHandler);
app.shortcut('transfer', transferShortcutHandler);
app.action('status_select', statusActionHandler);
app.action('priority_select', priorityActionHandler);
app.action('assignee_select', assigneeActionHandler);
app.action('submit_request_button', submitActionHandler);
app.message(messageInterceptHandler);
app.view('transfer_request_modal', handleTransferModal);
app.view('jira_ticket_modal', handleJiraTicketModalSubmission);

// Start the app
(async () => {
    try {
        await app.start(config.app.port);
        app.logger.info('⚡️ Bolt app is running!');
    } catch (error) {
        app.logger.error(error);
        process.exit(1);
    }
})();