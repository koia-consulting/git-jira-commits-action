const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('cross-fetch');

async function run() {
    try {
        const jiraToken = core.getInput('jira-token', { required: true });
        const jiraHost = core.getInput('jira-host', { required: true });
        const jiraEmail = core.getInput('jira-email', { required: true });
        const jiraKeys = core.getInput('jira-keys').split(',');

        if (!jiraKeys.length) {
            core.setFailed('No JIRA keys provided');
            return;
        }

        core.notice(`Fetching JIRA issues: ${jiraKeys.join(', ')}\n`);

        const protocol = 'https';
        const result = [];

        for (let jiraKey of jiraKeys) {
            let url = `${protocol}://${jiraHost}/rest/api/2/issue/${jiraKey}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
                    'Accept': 'application/json'
                }
            });

            core.notice(url);
            core.notice(response.status);
            core.notice(response.statusText);
            core.notice(response.ok);
            core.notice(response.headers.raw());
            core.notice(response.body_text);
            core.notice(response.body);
            let json = await response.json();
            core.notice(json);
            )

            if (!response.ok) {
                core.setFailed(`Failed to fetch issue ${jiraKey}\n`);
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
