#!/usr/bin/env node
/**
 * Generate Moodle tokens for all users
 * Run this script with admin token to create tokens for teachers and students
 */

const MOODLE_URL = process.env.MOODLE_URL || 'http://localhost:8085';
const ADMIN_TOKEN = '6e46f93f5f12b5bf476e7f2b8e7d6ba3';

async function callMoodle(wsfunction, params = {}) {
    const url = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
    url.searchParams.set('wstoken', ADMIN_TOKEN);
    url.searchParams.set('wsfunction', wsfunction);
    url.searchParams.set('moodlewsrestformat', 'json');

    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            value.forEach((v, i) => url.searchParams.set(`${key}[${i}]`, v));
        } else {
            url.searchParams.set(key, value);
        }
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.exception) {
        throw new Error(`Moodle Error: ${data.message}`);
    }

    return data;
}

async function getUserByUsername(username) {
    const users = await callMoodle('core_user_get_users', {
        'criteria[0][key]': 'username',
        'criteria[0][value]': username
    });
    return users.users?.[0];
}

async function getAllUsers() {
    // Get all users (admin can do this)
    const siteInfo = await callMoodle('core_webservice_get_site_info');
    console.log('Connected to:', siteInfo.sitename);
    console.log('Admin user ID:', siteInfo.userid);

    // Get all users in the system
    const users = await callMoodle('core_user_get_users', {
        'criteria[0][key]': 'deleted',
        'criteria[0][value]': '0'
    });

    return users.users || [];
}

async function getServiceId() {
    // We need to find the external service ID
    // For now, we'll use the default "Moodle mobile web service" which has ID 1
    // or create tokens via the web interface
    return 1; // Default mobile service
}

async function createTokenForUser(userId, serviceid = 1) {
    // Note: core_webservice_create_token might not be available
    // We'll try to use it, otherwise tokens need to be created manually
    try {
        const result = await callMoodle('core_webservice_create_token', {
            userid: userId,
            serviceid: serviceid
        });
        return result;
    } catch (error) {
        console.log(`  Note: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('Moodle Token Generator');
    console.log('='.repeat(60));
    console.log(`Moodle URL: ${MOODLE_URL}`);
    console.log('');

    try {
        // Get all users
        const users = await getAllUsers();
        console.log(`\nFound ${users.length} users:\n`);

        const tokensJson = {
            moodleUrl: MOODLE_URL,
            roles: {},
            defaultRole: 'admin'
        };

        for (const user of users) {
            const roleType = user.username === 'admin' ? 'admin' :
                user.username.includes('teacher') || ['kumar', 'singh', 'patel', 'sharma'].includes(user.username) ? 'teacher' :
                    'student';

            console.log(`- ${user.username} (ID: ${user.id}) - ${user.fullname} [${roleType}]`);

            // Add to tokens structure
            const roleKey = user.username === 'admin' ? 'admin' : user.username;
            tokensJson.roles[roleKey] = {
                token: user.username === 'admin' ? ADMIN_TOKEN : `TOKEN_FOR_${user.username.toUpperCase()}`,
                userId: user.id,
                name: user.fullname,
                description: roleType.charAt(0).toUpperCase() + roleType.slice(1)
            };
        }

        console.log('\n' + '='.repeat(60));
        console.log('tokens.json template:');
        console.log('='.repeat(60));
        console.log(JSON.stringify(tokensJson, null, 4));

        console.log('\n' + '='.repeat(60));
        console.log('NEXT STEPS:');
        console.log('='.repeat(60));
        console.log('1. Go to Moodle Admin: Site admin → Server → Web services → Manage tokens');
        console.log('2. Create a token for each user listed above');
        console.log('3. Update mcp_servers/moodle_mcp/tokens.json with the actual tokens');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
