const core = require('@actions/core');
const github = require('@actions/github');
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
                base64: Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')
            }
        });

        const issues = [];

        for (const key of jiraKeys) {
            const issue = await jira.issue.getIssue({ issueKey: key, fields: ['summary', 'status', 'creator', 'issuelinks'] });
            issues.push(issue);
        }

        const formattedIssues = formatIssues(issues);
        core.setOutput('issues-info', formattedIssues);

    } catch (error) {
        console.log(error);
        core.setFailed(error.message);
    }
}

function formatIssueInfo(issue) {
    const issueLink = `<a href="https://${process.env.JIRA_HOST}/browse/${issue.key}">${issue.key}</a>`;
    return `${issueLink}: ${issue.fields.summary} (Author: ${issue.fields.creator.displayName}, Status: ${issue.fields.status.name})`;
}

function formatIssues(issues) {
    let result = '';

    issues.forEach(issue => {
        result += `- ${formatIssueInfo(issue)}\n`;

        issue.fields.issuelinks.forEach(link => {
            if (link.outwardIssue) {
                result += `  - ${formatIssueInfo(link.outwardIssue)}\n`;
            } else if (link.inwardIssue) {
                result += `  - ${formatIssueInfo(link.inwardIssue)}\n`;
            }
        });
    });

    return result;
}

run();
