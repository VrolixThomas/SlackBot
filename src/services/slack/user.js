async function getUserDisplayName(client, userId) {
    try {
        const result = await client.users.info({
            user: userId
        });
        
        if (result.ok && result.user) {
            return result.user.profile?.display_name || 
                   result.user.profile?.real_name || 
                   result.user.name || 
                   `Unknown User (${userId})`;
        }
        return `Unknown User (${userId})`;
    } catch (error) {
        console.error(`Error fetching user info for ${userId}:`, error);
        return `Unknown User (${userId})`;
    }
}

async function getUserEmail(client, userId) {
    try {
        const result = await client.users.info({ user: userId });
        if (result.ok && result.user && result.user.profile && result.user.profile.email) {
            return result.user.profile.email;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching user email for ${userId}:`, error);
        return null;
    }
}

module.exports = {
    getUserDisplayName,
    getUserEmail
};