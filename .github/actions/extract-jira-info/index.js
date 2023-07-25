const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('cross-fetch');

const LEVEL_RELATED = "Related";
const LEVEL_PARENT = "Parent";
const LEVEL_SUBTASK = "Subtask";

function formatIssueInfo(issue,jiraHost) {
    const issueLink = `<a href="https://${jiraHost}/browse/${issue.key}">${issue.key}</a>`;

    switch (issue.levelType){
        case(LEVEL_PARENT):
            return `(${issue.status}) ${issueLink}: ${issue.summary}`;
        case(LEVEL_SUBTASK):
            return `(${issue.status}) ${issueLink}: ${issue.summary}`;
        case(LEVEL_RELATED):
    }       return `[${issue.relation}] (${issue.status}) ${issueLink}: ${issue.summary} `;

}

function formatIssueList(issues, jiraHost){
    let issueList = '';
    for (let issue of issues) {
        issueList += `* ${formatIssueInfo(issue, jiraHost)}\n`;

        if(issue.subtasks.length > 0){
            for(let subtask of issue.subtasks){
                issueList += `  ▪️${formatIssueInfo(subtask, jiraHost)}\n`;
            }
        }

        if(issue.dependencies.length > 0){
            for(let dependency of issue.dependencies){
                issueList += `  ▫️${formatIssueInfo(dependency, jiraHost)}\n`;
            }
        }
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
            const subtasks = issue.fields.subtasks || [];

            const dependencies = linkedIssues.map(linkedIssue => {
                const linkedIssueKey = linkedIssue.outwardIssue?.key || linkedIssue.inwardIssue?.key || "No linked issue key available";
                const linkedIssueSummary = linkedIssue.outwardIssue?.fields?.summary || linkedIssue.inwardIssue?.fields?.summary || "No linked issue summary available";
                const linkedIssueStatus = linkedIssue.outwardIssue?.fields?.status?.name || linkedIssue.inwardIssue?.fields?.status?.name || "No linked issue status available";
                const likedIssueRelation = linkedIssue.type?.inward || "No linked issue relation available";
                return {
                    key: linkedIssueKey,
                    summary: linkedIssueSummary,
                    status: linkedIssueStatus,
                    relation: likedIssueRelation,
                    levelType: LEVEL_RELATED
                };
            });

            const subtasksIssues = subtasks.map(subtask => {
                const subtaskKey = subtask.key;
                const subtaskSummary = subtask.fields.summary || "No summary available";
                const subtaskStatus = subtask.fields.status?.name || "No status available";
                return {
                    key: subtaskKey,
                    summary: subtaskSummary,
                    status: subtaskStatus,
                    levelType: LEVEL_SUBTASK
                };
            });

            result.push({
                key: issueKey,
                summary: issueSummary,
                status: issueStatus,
                author: issueAuthor,
                description: issueDescription,
                subtasks: subtasksIssues,
                dependencies: dependencies,
                levelType: LEVEL_PARENT
            });
        }

        core.setOutput('jira-issues', formatIssueList(result,jiraHost));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
