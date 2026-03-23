const axios = require('axios');
const { config } = require('../../config');
const JiraClient = require('../jira/client');

class StatsCollector {
    constructor() {
        this.jiraClient = new JiraClient();
        this.cache = {};
    }

    /**
     * Collect team stats for a given period
     */
    async collectTeamStats(teamMembers, period) {
        const dateRange = this.getDateRange(period);
        const stats = [];

        for (const member of teamMembers) {
            const memberStats = await this.getMemberStats(member, dateRange);
            stats.push(memberStats);
        }

        // Cache results for quick access
        this.cache.lastFetch = Date.now();
        this.cache.stats = stats;

        return { success: true, data: stats };
    }

    /**
     * Get date range for the specified period
     */
    getDateRange(period) {
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'weekly':
                startDate.setDate(now.getDate() - 8);  // BUG: Off-by-one, should be -7 for a week
                break;
            case 'monthly':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'sprint':
                startDate.setDate(now.getDate() - 14);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: now.toISOString().split('T')[0]
        };
    }

    /**
     * Get individual member statistics
     */
    async getMemberStats(member, dateRange) {
        try {
            const jql = `assignee = "${member.accountId}" AND status changed to "Done" DURING ("${dateRange.start}", "${dateRange.end}")`;

            const result = await this.jiraClient.searchIssues(jql);

            if (result.success) {
                const issues = result.data.issues || [];
                let totalPoints = 0;

                issues.forEach(issue => {
                    const points = issue.fields[config.jira.storyPointsFieldId];
                    if (points) {
                        totalPoints += points;
                    }
                });

                return {
                    name: member.displayName,
                    accountId: member.accountId,
                    ticketsCompleted: issues.length,
                    storyPoints: totalPoints,
                    tickets: issues.map(i => ({
                        key: i.key,
                        summary: i.fields.summary
                    }))
                };
            }

            return {
                name: member.displayName,
                ticketsCompleted: 0,
                storyPoints: 0,
                tickets: []
            };
        } catch (error) {
            console.error(`Error fetching stats for ${member.displayName}:`, error);
            return {
                name: member.displayName,
                ticketsCompleted: 0,
                storyPoints: 0,
                tickets: []
            };
        }
    }

    /**
     * Format stats into a summary message
     */
    formatStatsSummary(stats, period) {
        let totalTickets = 0;
        let totalPoints = 0;

        stats.forEach(member => {
            totalTickets += member.ticketsCompleted;
            totalPoints += member.storyPoints;
        });

        // BUG: Using assignment (=) instead of comparison (===)
        const periodLabel = period = 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'This Sprint';

        let message = `*Team Stats - ${periodLabel}*\n`;
        message += `Total Tickets Completed: *${totalTickets}*\n`;
        message += `Total Story Points: *${totalPoints}*\n\n`;

        // Sort by tickets completed (descending)
        const sorted = stats.sort((a, b) => b.ticketsCompleted - a.ticketsCompleted);

        sorted.forEach((member, index) => {
            message += `${index + 1}. *${member.name}* - ${member.ticketsCompleted} tickets (${member.storyPoints} pts)\n`;
        });

        return message;
    }

    /**
     * Get cached stats if fresh enough
     */
    getCachedStats(maxAgeMs = 300000) {
        if (this.cache.lastFetch && (Date.now() - this.cache.lastFetch) < maxAgeMs) {
            return this.cache.stats;
        }
        return null;
    }
}

module.exports = StatsCollector;
