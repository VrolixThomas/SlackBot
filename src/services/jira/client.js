const axios = require('axios');
const { config } = require('../../config');

class JiraClient {
    constructor() {
        this.baseUrl = config.jira.baseUrl;
        this.auth = {
            username: config.jira.email,
            password: config.jira.apiToken
        };
        this.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    async createIssue(ticketData) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/rest/api/3/issue`,
                ticketData,
                {
                    auth: this.auth,
                    headers: this.headers
                }
            );
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async GetProjects() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/api/3/project/search`,
                {
                    auth: this.auth,
                    headers: this.headers
                }
            );
            const projects = response.data.values || [];
            const projectKeys = projects.map(project => project.key);
            return { success: true, data: projectKeys };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async GetUsers() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/api/3/users/search`,
                {
                    auth: this.auth,
                    headers: this.headers,
                    params: {
                        maxResults: 1000
                    }
                }
            );
            
            const userDisplayNames = response.data.filter(x => x.accountType == "atlassian").map(x => x.displayName)

            return { success: true, data: userDisplayNames };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async GetUserAccountId(displayName) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/api/3/users/search`,
                {
                    auth: this.auth,
                    headers: this.headers,
                    params: {
                        maxResults: 1000
                    }
                }
            );

            const match = response.data.find(user => user.displayName.toLowerCase().includes(displayName.toLowerCase()));

            return { success: true, data: match.accountId };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async getUserAccountIdByEmail(email) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/api/3/users/search`,
                {
                    params: {
                        query: email,
                        maxResults: 1
                    },
                    auth: this.auth,
                    headers: this.headers
                }
            );

            if (response.data.length === 0) {
                return { success: false, error: 'User not found' };
            }

            const user = response.data[0];
            return { 
                success: true, 
                data: {
                    accountId: user.accountId,
                    displayName: user.displayName,
                    email: user.emailAddress
                }
            };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async getCurrentSprint(boardId) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/agile/1.0/board/${boardId}/sprint`,
                {
                    params: {
                        state: 'active',
                        maxResults: 1
                    },
                    auth: this.auth,
                    headers: this.headers
                }
            );

            if (response.data.values.length === 0) {
                return { success: false, error: 'No active sprint found' };
            }

            return { success: true, data: response.data.values[0] };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async getBoards() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/agile/1.0/board`,
                {
                    auth: this.auth,
                    headers: this.headers
                }
            );

            return { success: true, data: response.data.values };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async getCurrentSprintTicketsForUser(accountId) {
        try {
            // Get all boards to find active sprints
            //const boardsResult = await this.getBoards();
            //if (!boardsResult.success) {
            //    return { success: false, error: 'Could not fetch boards' };
            //}

            const allTickets = [];

            // Check each board for active sprints
            //for (const board of boardsResult.data) {
                const sprintResult = await this.getCurrentSprint(42);

                //const sprintResult = await this.getCurrentSprint(board.id);
                if (sprintResult.success) {
                    const sprint = sprintResult.data;
                    
                    // Get issues in this sprint assigned to the user
                    const jql = `sprint = ${sprint.id} AND assignee = "${accountId.data}" ORDER BY updated DESC`;
                    
                    const issuesResult = await this.searchIssues(jql);
                    if (issuesResult.success) {
                        const tickets = issuesResult.data.issues.map(issue => ({
                            key: issue.key,
                            summary: issue.fields.summary,
                            status: issue.fields.status.name,
                            priority: issue.fields.priority?.name || 'None',
                            assignee: issue.fields.assignee?.displayName || 'Unassigned',
                            sprint: sprint.name,
                            url: `${this.baseUrl}/browse/${issue.key}`
                        }));
                        allTickets.push(...tickets);
                    }
                }
            //}

            return { success: true, data: allTickets };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async searchIssues(jql, maxResults = 50) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/api/3/search`,
                {
                    params: {
                        jql: jql,
                        maxResults: maxResults,
                        fields: 'summary,status,priority,assignee,sprint'
                    },
                    auth: this.auth,
                    headers: this.headers
                }
            );

            return { success: true, data: response.data };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    async searchUserTickets(userEmail, searchText) {
        try {
            const userResult = await this.getUserAccountIdByEmail(userEmail);
            if (!userResult.success) {
                return { success: false, error: 'User not found in Jira' };
            }

            const accountId = userResult.data.accountId;
            let jql = `assignee = "${accountId}"`;
            
            if (searchText) {
                jql += ` AND summary ~ "${searchText}"`;
            }
            
            jql += ' ORDER BY updated DESC';

            const issuesResult = await this.searchIssues(jql);
            if (!issuesResult.success) {
                return issuesResult;
            }

            const tickets = issuesResult.data.issues.map(issue => ({
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                priority: issue.fields.priority?.name || 'None',
                assignee: issue.fields.assignee?.displayName || 'Unassigned',
                url: `${this.baseUrl}/browse/${issue.key}`
            }));

            return { success: true, data: tickets };
        } catch (error) {
            console.error('Jira API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.errors || error.message
            };
        }
    }

    buildTicketUrl(issueKey) {
        return `${this.baseUrl}/browse/${issueKey}`;
    }
}

module.exports = JiraClient;