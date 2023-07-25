const core = require('@actions/core');
const JiraClient = require('jira-connector');

// Formatter function for Jira issue
function formatIssue(issue, indent = 0) {
    const indentation = " ".repeat(indent);
    return `${indentation}Issue ${issue.key}: ${issue.summary} (Author: ${issue.author}, Status: ${issue.status})`;
}

async function run() {
    try {
        const jiraHost = core.getInput('jira-host', { required: false });
        const jiraToken = core.getInput('jira-token', { required: false });
        const jiraEmail = core.getInput('jira-email', { required: false });
        const jiraKeys = core.getInput('jira-keys', { required: true }).split(',');

        if (!jiraHost) {
            core.setFailed("Missing required secret: jira-host");
            return;
        }

        if (!jiraToken) {
            core.setFailed("Missing required secret: jira-token");
            return;
        }

        if (!jiraEmail) {
            core.setFailed("Missing required secret: jira-email");
            return;
        }

        const jira = new JiraClient({
            host: jiraHost,
            basic_auth: {
                email: jiraEmail,
                api_token: jiraToken,
            },
        });

        let issuesInfo = "";

        for (const key of jiraKeys) {
            const { fields } = await jira.issue.getIssue({ issueKey: key.trim() });

            const issue = {
                key: key.trim(),
                summary: fields.summary,
                status: fields.status.name,
                author: fields.creator.displayName,
                description: fields.description,
                dependencies: []
            };

            // Fetch details for linked issues
            for (const link of fields.issuelinks) {
                const linkedIssueKey = link.outwardIssue ? link.outwardIssue.key : link.inwardIssue.key;
                const linkedIssue = await jira.issue.getIssue({ issueKey: linkedIssueKey });

                issue.dependencies.push({
                    key: linkedIssue.key,
                    summary: linkedIssue.fields.summary,
                    status: linkedIssue.fields.status.name,
                    author: linkedIssue.fields.creator.displayName,
                });
            }

            // Format issue info
            issuesInfo += formatIssue(issue) + "\n";
            for (const dep of issue.dependencies) {
                issuesInfo += formatIssue(dep, 4) + "\n"; // indent dependent issues by 4 spaces
            }
        }

        core.setOutput('issues-info', issuesInfo);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
