require('dotenv').config();

const config = {
    slack: {
        botToken: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        appToken: process.env.SLACK_APP_TOKEN,
        userToken: process.env.SLACK_USER_TOKEN,
    },
    jira: {
        baseUrl: process.env.JIRA_BASE_URL,
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
        projectKey: process.env.JIRA_PROJECT_KEY,
    },
    app: {
        port: process.env.PORT || 3000,
        targetChannelNames: process.env.TARGET_CHANNEL_NAMES ? 
            process.env.TARGET_CHANNEL_NAMES.split(',').map(name => name.trim().toLowerCase()) : [],
    },
    bitbucket: {
        workspace: process.env.BITBUCKET_WORKSPACE,  
        username: process.env.BITBUCKET_USERNAME,  
        appPassword: process.env.BITBUCKET_APP_PASSWORD
    }
};

// Validation function
function validateConfig() {
    const required = [
        'SLACK_BOT_TOKEN',
        'SLACK_SIGNING_SECRET', 
        'SLACK_APP_TOKEN',
        'SLACK_USER_TOKEN',
        'JIRA_BASE_URL',
        'JIRA_EMAIL',
        'JIRA_API_TOKEN',
        'JIRA_PROJECT_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

module.exports = { config, validateConfig };