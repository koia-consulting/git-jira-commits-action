const core = require('@actions/core');
const JiraClient = require('jira-connector');

async function run() {
    try {
        const jiraHost = core.getInput('jira-host', { required: true });
        const jiraToken = core.getInput('jira-token', { required: true });
        const jiraEmail = core.getInput('jira-email', { required: true });
        const jiraKeys = core.getInput('jira-keys', { required: true }).split(',');

        const jira = new JiraClient({
            host: jiraHost,
            basic_auth: {
                email: jiraEmail,
                api_token: jiraToken,
            },
        });

        const issuesInfo = [];

        for (const key of jiraKeys) {
            const { fields } = await jira.issue.getIssue({ issueKey: key.trim() });

            issuesInfo.push({
                key: key.trim(),
                summary: fields.summary,
                status: fields.status.name,
                author: fields.creator.displayName,
                description: fields.description,
                dependencies: fields.issuelinks,
            });
        }

        core.setOutput('issues-info', JSON.stringify(issuesInfo));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
