<?php
/**
 * Setup script for MCP web service in Moodle
 */
define('CLI_SCRIPT', true);
require_once('/var/www/html/config.php');
require_once($CFG->libdir . '/adminlib.php');
require_once($CFG->dirroot . '/webservice/lib.php');

echo "Setting up MCP web service...\n";

// 1. Enable web services
set_config('enablewebservices', 1);
echo "✓ Web services enabled\n";

// 2. Enable MCP protocol
$protocols = get_config('core', 'webserviceprotocols');
if (strpos($protocols, 'mcp') === false) {
    $protocols = empty($protocols) ? 'mcp' : $protocols . ',mcp';
    set_config('webserviceprotocols', $protocols);
}
echo "✓ MCP protocol enabled (protocols: $protocols)\n";

// 3. Create external service for MCP
global $DB;

$servicename = 'OnlyApps MCP Service';
$service = $DB->get_record('external_services', ['name' => $servicename]);

if (!$service) {
    $service = new stdClass();
    $service->name = $servicename;
    $service->shortname = 'onlyapps_mcp';
    $service->enabled = 1;
    $service->restrictedusers = 0;
    $service->component = null;
    $service->timecreated = time();
    $service->downloadfiles = 1;
    $service->uploadfiles = 1;
    $service->id = $DB->insert_record('external_services', $service);
    echo "✓ Created external service: $servicename\n";
} else {
    $service->enabled = 1;
    $DB->update_record('external_services', $service);
    echo "✓ External service already exists, enabled it\n";
}

// 4. Add functions to the service
$functions = [
    'core_course_get_courses',
    'core_course_get_contents', 
    'mod_assign_get_assignments',
    'core_enrol_get_users_courses',
    'core_user_get_users_by_field',
    'core_webservice_get_site_info'
];

foreach ($functions as $funcname) {
    $func = $DB->get_record('external_functions', ['name' => $funcname]);
    if ($func) {
        $exists = $DB->record_exists('external_services_functions', [
            'externalserviceid' => $service->id,
            'functionname' => $funcname
        ]);
        if (!$exists) {
            $sf = new stdClass();
            $sf->externalserviceid = $service->id;
            $sf->functionname = $funcname;
            $DB->insert_record('external_services_functions', $sf);
            echo "  + Added function: $funcname\n";
        }
    }
}
echo "✓ Functions added to service\n";

// 5. Create token for admin user
$admin = $DB->get_record('user', ['username' => 'admin']);
if ($admin) {
    // Check if token already exists
    $existingtoken = $DB->get_record('external_tokens', [
        'userid' => $admin->id,
        'externalserviceid' => $service->id
    ]);
    
    if (!$existingtoken) {
        $token = new stdClass();
        $token->token = 'onlyapps_mcp_token_' . md5(uniqid(rand(), true));
        $token->tokentype = EXTERNAL_TOKEN_PERMANENT;
        $token->userid = $admin->id;
        $token->externalserviceid = $service->id;
        $token->contextid = context_system::instance()->id;
        $token->creatorid = $admin->id;
        $token->timecreated = time();
        $token->validuntil = 0;
        $token->iprestriction = null;
        $token->sid = null;
        $token->lastaccess = null;
        $DB->insert_record('external_tokens', $token);
        echo "✓ Created token: {$token->token}\n";
    } else {
        echo "✓ Token already exists: {$existingtoken->token}\n";
    }
}

// 6. Purge caches
purge_all_caches();
echo "✓ Caches purged\n";

echo "\n=== MCP Setup Complete ===\n";
echo "Use the token shown above in your MCP configuration.\n";
