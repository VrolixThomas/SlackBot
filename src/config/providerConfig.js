// Configuration for the /provider command
// This file contains the hardcoded project key and list of users for the Epic creation

const providerConfig = {
    // The Jira project key where Epics and Tasks will be created
    projectKey: 'PI',

    // List of users that can be assigned to the Epic and tasks
    // Sorted alphabetically by first name
    users: [
        { displayName: 'Alken Rrokaj', accountId: '712020:9d5370ed-2775-493e-9275-5fe2ce80977f' },
        { displayName: 'Kateryna Danylenko', accountId: '712020:9cb2d6e4-b980-4d4d-872b-732695a4961a' },
        { displayName: 'Tatiana Amosova', accountId: '624a99bd7a3f9e006ab4ac34' },
        { displayName: 'Thomas Vrolix', accountId: '712020:5eccf692-d98e-4403-b9f9-76b9e189d4eb' },
        { displayName: 'Viktor Gakis', accountId: '712020:9e96ac81-8d75-4dd8-a7c2-79ca923f5288' }
    ]
};

module.exports = { providerConfig };
