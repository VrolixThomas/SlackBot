const axios = require('axios');
const { config } = require('../../config');

class BitbucketClient {
    constructor() {
        this.baseUrl = 'https://api.bitbucket.org/2.0';
        this.workspace = config.bitbucket.workspace;
        this.auth = {
            username: config.bitbucket.username,
            password: config.bitbucket.appPassword
        };
        this.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }

    async getAllUsers() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/workspaces/${this.workspace}/members`,
                {
                    auth: this.auth,
                    headers: this.headers,
                    params: {
                        pagelen: 100
                    }
                }
            );

            const members = response.data.values || [];
            const userData = members.map(member => ({
                accountId: member.user.account_id,
                username: member.user.username,
                displayName: member.user.display_name,
                nickname: member.user.nickname,
                type: member.user.type,
                links: member.user.links
            }));

            return { success: true, data: userData };
        } catch (error) {
            console.error('Bitbucket API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Get user's account ID by username
     * @param {string} username - Bitbucket username
     * @returns {Object} - Result with user data
     */
    async getUserAccountId(username) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/users/${username}`,
                {
                    auth: this.auth,
                    headers: this.headers
                }
            );

            return { 
                success: true, 
                data: {
                    accountId: response.data.account_id,
                    displayName: response.data.display_name,
                    username: response.data.username
                }
            };
        } catch (error) {
            console.error('Bitbucket API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Get all repositories in the workspace
     * @returns {Object} - Result with repositories data
     */
    async getRepositories() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/repositories/${this.workspace}`,
                {
                    auth: this.auth,
                    headers: this.headers,
                    params: {
                        role: 'member',
                        pagelen: 100
                    }
                }
            );

            const repositories = response.data.values || [];
            const repoData = repositories.map(repo => ({
                name: repo.name,
                fullName: repo.full_name,
                url: repo.links.html.href,
                description: repo.description,
                language: repo.language,
                isPrivate: repo.is_private,
                createdOn: repo.created_on,
                updatedOn: repo.updated_on
            }));

            return { success: true, data: repoData };
        } catch (error) {
            console.error('Bitbucket API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Get open pull requests for a specific user across all repositories
     * @param {string} username - Bitbucket username
     * @returns {Object} - Result with PR data
     */
    async getOpenPRsForUser(accountId) {
        try { 
            // Get all repositories
            const reposResult = await this.getRepositories();
            if (!reposResult.success) {
                return { success: false, error: 'Could not fetch repositories', data: [] };
            }

            const allPRs = [];

            // Fetch PRs from each repository
            for (const repo of reposResult.data) {
                if (repo.name != 'Portal' && repo.name != 'Provider Service')
                    continue
                try {
                    const query = `author.account_id="${accountId.data}" AND state="OPEN"`;
                    const prResponse = await axios.get(
                        `${this.baseUrl}/repositories/${repo.fullName}/pullrequests`,
                        {
                            auth: this.auth,
                            headers: this.headers,
                            params: {
                                q: query,
                                state: 'OPEN',
                                pagelen: 50
                            }
                        }
                    );

                    const prs = prResponse.data.values || [];

                    const formattedPRs = prs.map(pr => ({
                        id: pr.id,
                        title: pr.title,
                        url: pr.links.html.href,
                        repository: repo.name,
                        status: pr.state,
                        author: pr.author.display_name,
                        createdOn: pr.created_on,
                        updatedOn: pr.updated_on,
                        destinationBranch: pr.destination.branch.name,
                        sourceBranch: pr.source.branch.name,
                    }));
                

                    allPRs.push(...formattedPRs);
                } catch (repoError) {
                    console.error(`Error fetching PRs for repository ${repo.name}:`, repoError.response?.data || repoError.message);
                    // Continue with other repositories
                }
            }

            return {
                success: true,
                data: allPRs
            };

        } catch (error) {
            console.error('Bitbucket API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                data: []
            };
        }
    }

    /**
     * Get open pull requests for a specific repository
     * @param {string} repoName - Repository name
     * @param {string} username - Optional: filter by author username
     * @returns {Object} - Result with PR data
     */
    async getOpenPRsForRepository(repoName, username = null) {
        try {
            let query = 'state="OPEN"';
            
            if (username) {
                const userResult = await this.getUserAccountId(username);
                if (userResult.success) {
                    query += ` AND author.account_id="${userResult.data.accountId}"`;
                }
            }

            const response = await axios.get(
                `${this.baseUrl}/repositories/${this.workspace}/${repoName}/pullrequests`,
                {
                    auth: this.auth,
                    headers: this.headers,
                    params: {
                        q: query,
                        state: 'OPEN',
                        pagelen: 50
                    }
                }
            );

            const prs = response.data.values || [];
            const formattedPRs = prs.map(pr => ({
                id: pr.id,
                title: pr.title,
                url: pr.links.html.href,
                repository: repoName,
                status: pr.state,
                author: pr.author.display_name,
                createdOn: pr.created_on,
                updatedOn: pr.updated_on,
                destinationBranch: pr.destination.branch.name,
                sourceBranch: pr.source.branch.name,
                reviewers: pr.reviewers.map(r => r.display_name),
                participants: pr.participants.map(p => ({
                    name: p.user.display_name,
                    approved: p.approved,
                    role: p.role
                }))
            }));

            return {
                success: true,
                data: formattedPRs
            };

        } catch (error) {
            console.error('Bitbucket API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                data: []
            };
        }
    }

    /**
     * Test the connection to Bitbucket API
     * @returns {Object} - Result with connection status
     */
    async testConnection() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/user`,
                {
                    auth: this.auth,
                    headers: this.headers
                }
            );

            return { 
                success: true, 
                data: {
                    displayName: response.data.display_name,
                    username: response.data.username,
                    accountId: response.data.account_id
                }
            };
        } catch (error) {
            console.error('Bitbucket API error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Build PR URL
     * @param {string} repoName - Repository name
     * @param {number} prId - Pull request ID
     * @returns {string} - PR URL
     */
    buildPRUrl(repoName, prId) {
        return `https://bitbucket.org/${this.workspace}/${repoName}/pull-requests/${prId}`;
    }
}

module.exports = BitbucketClient;