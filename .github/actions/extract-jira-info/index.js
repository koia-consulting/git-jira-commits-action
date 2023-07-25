const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('cross-fetch');

async function run() {
    try {
        const jiraToken = core.getInput('jira-token', { required: true });
        const jiraHost = core.getInput('jira-host', { required: true });
        const isCloud = core.getInput('cloud');
        const jiraKeys = core.getInput('jira-keys').split(',');

        if (!jiraKeys.length) {
            core.setFailed('No JIRA keys provided');
            return;
        }

        const protocol = isCloud === 'true' ? 'https' : 'http';
        const result = [];

        for (let jiraKey of jiraKeys) {
            const response = await fetch(`${protocol}://${jiraHost}/rest/api/2/issue/${jiraKey}`, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`email@example.com:${jiraToken}`).toString('base64')}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                core.setFailed(`Failed to fetch issue ${jiraKey}`);
                return;
            }

            const issue = await response.json();
            const issueKey = issue.key;
            const issueSummary = issue.fields.summary || "No summary available";
            const issueStatus = issue.fields.status?.name || "No status available";
            const issueAuthor = issue.fields.creator?.displayName || "No author available";
            const issueDescription = issue.fields.description?.content[0]?.content[0]?.text || "No description available";
            const linkedIssues = issue.fields.issuelinks || [];

            const dependencies = linkedIssues.map(linkedIssue => {
                const linkedIssueKey = linkedIssue.outwardIssue?.key || linkedIssue.inwardIssue?.key || "No linked issue key available";
                const linkedIssueSummary = linkedIssue.outwardIssue?.fields?.summary || linkedIssue.inwardIssue?.fields?.summary || "No linked issue summary available";
                const linkedIssueStatus = linkedIssue.outwardIssue?.fields?.status?.name || linkedIssue.inwardIssue?.fields?.status?.name || "No linked issue status available";
                return {
                    key: linkedIssueKey,
                    summary: linkedIssueSummary,
                    status: linkedIssueStatus
                };
            });

            result.push({
                key: issueKey,
                summary: issueSummary,
                status: issueStatus,
                author: issueAuthor,
                description: issueDescription,
                dependencies: dependencies
            });
        }

        core.setOutput('jira-issues', JSON.stringify(result));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
