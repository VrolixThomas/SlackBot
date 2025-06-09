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
                    headers: this.headers
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
                    headers: this.headers
                }
            );

            const match = response.data.find(user => user.displayName === displayName);
            return { success: true, data: match.accountId };
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