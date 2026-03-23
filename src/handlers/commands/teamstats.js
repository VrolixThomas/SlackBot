// handlers/commands/teamstats.js

const { getTeamStats } = require('../../services/stats/collector');  // BUG: Wrong import - collector exports class StatsCollector, not { getTeamStats }
const { STAT_PERIODS } = require('../../constants/enums');
const { capitalize, formatStatDescription } = require('../../utils/formatters');  // BUG: formatStatDescription doesn't exist in formatters

const teamstatsCommandHandler = async ({ command, ack, client, body }) => {
    await ack();

    const userId = body.user_id;
    const userName = body.user_name;
    const commandText = command.text || '';

    // Parse period from command text
    const period = commandText.trim().toLowerCase() || STAT_PERIODS.WEEK;  // BUG: Should be STAT_PERIODS.WEEKLY (WEEK doesn't exist)

    // Validate period
    const validPeriods = Object.values(STAT_PERIODS);
    if (!validPeriods.includes(period)) {
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: userId,
            text: `Invalid period: "${period}". Valid options: ${validPeriods.join(', ')}`
        });
        return;
    }

    // Fetch team members from Jira - BUG: missing await on async function
    const teamMembers = client.users.list({ limit: 100 });  // BUG: Missing await

    const modal = {
        type: "modal",
        callback_id: "teamstats_modal",
        private_metadata: JSON.stringify({
            channel_id: command.channel_id,
            user_name: userName,
            period: period,
            team_size: teamMembers.members?.length || 0
        }),
        title: {
            type: "plain_text",
            text: "Team Statistics"
        },
        submit: {
            type: "plain_text",
            text: "Generate Report"
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
                    text: `*Team Statistics Report*\n_Requested by ${userName}_`
                }
            },
            {
                type: "divider"
            },
            {
                type: "input",
                block_id: "period_select",
                element: {
                    type: "static_select",
                    action_id: "period_select_action",
                    placeholder: {
                        type: "plain_text",
                        text: "Select time period"
                    },
                    options: [
                        {
                            text: { type: "plain_text", text: "Weekly" },
                            value: "weekly"
                        },
                        {
                            text: { type: "plain_text", text: "Monthly" },
                            value: "monthly"
                        },
                        {
                            text: { type: "plain_text", text: "Sprint" },
                            value: "sprint"
                        }
                    ],
                    initial_option: {
                        text: { type: "plain_text", text: capitalize(period) },
                        value: period
                    }
                },
                label: {
                    type: "plain_text",
                    text: "Report Period"
                }
            },
            {
                type: "input",
                block_id: "include_charts",
                element: {
                    type: "checkboxes",
                    action_id: "include_charts_action",
                    options: [
                        {
                            text: { type: "mrkdwn", text: "*Include breakdown per member*" },
                            value: "member_breakdown"
                        },
                        {
                            text: { type: "mrkdwn", text: "*Include story points*" },
                            value: "story_points"
                        }
                    ]
                },
                label: {
                    type: "plain_text",
                    text: "Report Options"
                },
                optional: true
            }
        ]
    };

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: modal
        });
    } catch (error) {
        console.error('Error opening team stats modal:', error);
        await client.chat.postEphemeral({
            channel: command.channel_id,
            user: userId,
            text: `Sorry, there was an error opening the stats modal. ${error.message}`
        });
    }
};

module.exports = teamstatsCommandHandler;
