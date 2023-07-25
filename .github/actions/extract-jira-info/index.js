const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('cross-fetch');

function formatIssueInfo(issue,jiraHost) {
    const issueLink = `<a href="https://${jiraHost}/browse/${issue.key}">${issue.key}</a>`;
    return `${issueLink}: ${issue.summary} (Author: ${issue.author}, Status: ${issue.status})`;
}

function formatIssueList(issues,jiraHost){
    let issueList = '';
    for (let issue of issues) {
        issueList += `* ${formatIssueInfo(issue,jiraHost)}\n`;
    }
    return issueList;
}

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


            if (!response.ok) {
                core.setFailed(`Failed to fetch issue ${jiraKey}\n`);
                return;
            }

            const issue = await response.json();
            core.notice(issue);

            const issueKey = issue.key;
            const issueSummary = issue.fields.summary || "No summary available";
            const issueStatus = issue.fields.status?.name || "No status available";
            const issueAuthor = issue.fields.creator?.displayName || "No author available";
            const issueDescription = issue.fields?.issuetype?.description || "No description available";
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

        core.setOutput('jira-issues', formatIssueList(result,jiraHost));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
