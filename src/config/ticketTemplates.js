// Configuration file for predefined Jira ticket templates
// Edit this file to customize the tickets that will be created for each Epic
// Use {PROVIDER_CODE} as a placeholder that will be replaced with the actual provider code

// Base templates - ALWAYS created for every provider
const providerTicketTemplates = [
    {
        summary: '[Portal][{PROVIDER_CODE}] Get Game Url',
        description: 'Update portal with the new ProviderCode and have it fetch the gameurl from PVS. In case of migration, add the Feature Flag',
        issueType: 'Task',
        storyPoints: 1
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] Get Game Url',
        description: 'Implement IGetGameUrlRequestManager',
        issueType: 'Task',
        storyPoints: 3
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] Authentication + Setup',
        description: 'Create all required tables, (Tx, RequestResponse, Token), services, etc. And setup the controller with the authentication endpoint/services',
        issueType: 'Task',
        storyPoints: 5
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] Wallet Endpoints',
        description: 'Create Balance, Debit, Credit, Cancel, etc. requests',
        issueType: 'Task',
        storyPoints: 5
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] Testing Branch',
        description: 'Use this branch when testing started from the Feature Branch and make PRs back to the Feature Branch.',
        issueType: 'Task',
        storyPoints: 3
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] Feature Branch',
        description: 'Final branch that should be merged into dev.',
        issueType: 'Task',
        storyPoints: 1
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] FreeSpins',
        description: 'Implement IFreeSpinsaRequestManager and IFreeSpinsConfigurationRequestManager.',
        issueType: 'Task',
        storyPoints: 3
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] Get Games List',
        description: 'Implement IGetAvailableGamesRequestManager.',
        issueType: 'Task',
        storyPoints: 2
    },
    {
        summary: '[PVS][{PROVIDER_CODE}] JackpotFeed',
        description: 'Implement IJackpotFeedRequestManager.',
        issueType: 'Task',
        storyPoints: 2
    }
];

// Migration templates - ADDITIONAL tickets created only when "Migration" is checked
const migrationTicketTemplates = [
    {
        summary: '[Portal] Cleanup {PROVIDER_CODE} Data',
        description: 'Remove all legacy code from the old provider from Portal.',
        issueType: 'Task',
        storyPoints: 1,
        epicKey: 'PI-2296'
    },
    {
        summary: '[Portal] Cleanup {PROVIDER_CODE} Tables',
        description: 'Drop Tx, RequestResponse and Token Table from portal.',
        issueType: 'Task',
        storyPoints: 1,
        epicKey: 'PI-2296'
    }
];

// ============================================
// EXAMPLE: Linking tasks to a different Epic
// ============================================
// You can optionally specify an 'epicKey' field to link a task to a different Epic
// instead of the main provider Epic being created.
//
// Example - linking specific tasks to Epic PI-2296:
//
// const exampleTemplatesWithCustomEpic = [
//     {
//         summary: '[Portal][{PROVIDER_CODE}] Get Game Url',
//         description: 'Update portal with the new ProviderCode...',
//         issueType: 'Task',
//         storyPoints: 3,
//         epicKey: 'PI-2296'  // This task will be linked to PI-2296 instead of the main Epic
//     },
//     {
//         summary: '[PVS][{PROVIDER_CODE}] Authentication + Setup',
//         description: 'Create all required tables...',
//         issueType: 'Task',
//         storyPoints: 8
//         // No epicKey specified - will use the main Epic being created
//     }
// ];

module.exports = {
    providerTicketTemplates,
    migrationTicketTemplates
};
