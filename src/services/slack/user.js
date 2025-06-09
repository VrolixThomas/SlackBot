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

module.exports = {
    getUserDisplayName
};